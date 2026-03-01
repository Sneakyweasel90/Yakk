const {
  app,
  BrowserWindow,
  ipcMain,
  Notification,
  dialog,
  shell,
} = require("electron");
const path = require("path");
const https = require("https");
const fs = require("fs");
const os = require("os");

const GITHUB_USER = "Sneakyweasel90";
const GITHUB_REPO = "Yakk";

let win;
let progressWin;

const logPath = path.join(os.homedir(), "yakk-log.txt");
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(logPath, line);
  console.log(msg);
}

function isNewerVersion(latest, current) {
  const latestParts = latest.replace(/^v/, "").split(".").map(Number);
  const currentParts = current.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const l = latestParts[i] || 0;
    const c = currentParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

function getLatestRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.github.com",
      path: `/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/latest`,
      headers: { "User-Agent": "Yakk-App" },
    };
    https
      .get(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error("Failed to parse release data: " + e.message));
          }
        });
      })
      .on("error", reject);
  });
}

function createProgressWindow() {
  progressWin = new BrowserWindow({
    width: 420,
    height: 180,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    backgroundColor: "#020a06",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: #020a06;
          color: #00ff88;
          font-family: 'Share Tech Mono', 'Courier New', monospace;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          gap: 16px;
          padding: 24px;
          border: 1px solid rgba(0,255,136,0.2);
          user-select: none;
        }
        .title {
          font-size: 13px;
          letter-spacing: 0.2em;
          opacity: 0.7;
        }
        .version {
          font-size: 11px;
          opacity: 0.5;
          letter-spacing: 0.1em;
        }
        .bar-track {
          width: 100%;
          height: 6px;
          background: rgba(0,255,136,0.1);
          border-radius: 3px;
          border: 1px solid rgba(0,255,136,0.2);
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg, #00ff88, #00cc66);
          border-radius: 3px;
          transition: width 0.3s ease;
          box-shadow: 0 0 8px rgba(0,255,136,0.5);
        }
        .status {
          font-size: 11px;
          opacity: 0.6;
          letter-spacing: 0.08em;
        }
      </style>
    </head>
    <body>
      <div class="title">DOWNLOADING UPDATE</div>
      <div class="version" id="ver">YAKK</div>
      <div class="bar-track"><div class="bar-fill" id="bar"></div></div>
      <div class="status" id="status">STARTING...</div>
      <script>
        const { ipcRenderer } = require('electron');
        ipcRenderer.on('download-progress', (_, data) => {
          document.getElementById('bar').style.width = data.percent + '%';
          document.getElementById('status').textContent = 
            data.percent < 100
              ? Math.round(data.percent) + '% — ' + (data.mbps || '') 
              : 'INSTALLING...';
        });
        ipcRenderer.on('download-version', (_, version) => {
          document.getElementById('ver').textContent = version;
        });
      </script>
    </body>
    </html>
  `;

  progressWin.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(html),
  );

  progressWin.on("closed", () => {
    progressWin = null;
  });
}

function downloadFile(url, destPath, version) {
  return new Promise((resolve, reject) => {
    const attempt = (downloadUrl) => {
      log("Attempting download from: " + downloadUrl);
      https
        .get(downloadUrl, { headers: { "User-Agent": "Yakk-App" } }, (res) => {
          log("Response status: " + res.statusCode);
          if (res.statusCode === 302 || res.statusCode === 301) {
            return attempt(res.headers.location);
          }
          if (res.statusCode !== 200) {
            return reject(
              new Error(`HTTP ${res.statusCode} from download URL`),
            );
          }

          const totalSize = parseInt(res.headers["content-length"] || "0", 10);
          let downloaded = 0;
          let lastTime = Date.now();
          let lastBytes = 0;

          // Show progress window now that we have a confirmed download
          createProgressWindow();
          if (progressWin) {
            progressWin.webContents.once("did-finish-load", () => {
              progressWin?.webContents.send("download-version", version);
            });
          }

          const file = fs.createWriteStream(destPath);

          res.on("data", (chunk) => {
            downloaded += chunk.length;
            file.write(chunk);

            if (progressWin && totalSize > 0) {
              const now = Date.now();
              const elapsed = (now - lastTime) / 1000;
              let mbps = "";
              if (elapsed >= 0.5) {
                const speed = (
                  (downloaded - lastBytes) /
                  elapsed /
                  1024 /
                  1024
                ).toFixed(1);
                mbps = speed + " MB/s";
                lastTime = now;
                lastBytes = downloaded;
              }
              const percent = (downloaded / totalSize) * 100;
              progressWin.webContents.send("download-progress", {
                percent: Math.min(percent, 99), // hold at 99 until file closes
                mbps,
              });
            }
          });

          res.on("end", () => {
            file.end(() => {
              if (progressWin) {
                progressWin.webContents.send("download-progress", {
                  percent: 100,
                  mbps: "",
                });
              }
              log("Download complete: " + destPath);
              resolve();
            });
          });

          res.on("error", (e) => {
            log("Response error: " + e.message);
            reject(e);
          });
          file.on("error", (e) => {
            log("File write error: " + e.message);
            reject(e);
          });
        })
        .on("error", (e) => {
          log("HTTPS error: " + e.message);
          reject(e);
        });
    };
    attempt(url);
  });
}

async function checkForUpdates() {
  log("checkForUpdates started");
  if (process.env.NODE_ENV === "development") {
    log("Dev mode, skipping update check");
    return true;
  }

  try {
    log("Fetching latest release...");
    const release = await getLatestRelease();
    const latestVersion = release.tag_name;
    const currentVersion = `v${app.getVersion()}`;
    log(`Current: ${currentVersion}, Latest: ${latestVersion}`);

    if (isNewerVersion(latestVersion, currentVersion)) {
      log("Update available!");
      const asset = release.assets?.find((a) => a.name.endsWith(".exe"));
      log("Asset found: " + JSON.stringify(asset?.name));
      const downloadUrl = asset?.browser_download_url;
      log("Download URL: " + downloadUrl);

      const { response } = await dialog.showMessageBox({
        type: "info",
        title: "Update Available",
        message: "A new version of Yakk is available!",
        detail: `Current version: ${currentVersion}\nNew version: ${latestVersion}\n\nYou must update to continue. Download now?`,
        buttons: ["Download & Install", "Close"],
        defaultId: 0,
        cancelId: 1,
      });

      log("User response: " + response);

      if (response === 0 && downloadUrl) {
        try {
          const destPath = path.join(
            os.homedir(),
            "Downloads",
            `YakkSetup.exe`,
          );
          log("Saving to: " + destPath);
          await downloadFile(downloadUrl, destPath, latestVersion);
          log("Download finished, launching installer");

          // Close progress window before launching installer
          if (progressWin) {
            progressWin.close();
            progressWin = null;
          }

          log("Opening with shell.openPath: " + destPath);
          shell.openPath(destPath).then((result) => {
            log("shell.openPath result: '" + result + "'");
            setTimeout(() => {
              try {
                fs.unlinkSync(destPath);
                log("Installer deleted: " + destPath);
              } catch (e) {
                log("Could not delete installer: " + e.message);
              }
            }, 5000);
          });
          await new Promise((r) => setTimeout(r, 3000));
          log("Quitting");
          app.quit();
          return false;
        } catch (err) {
          log("Download/install error: " + err.message);
          if (progressWin) {
            progressWin.close();
            progressWin = null;
          }
          await dialog
            .showMessageBox({
              type: "error",
              title: "Download Failed",
              message: "Could not download update.",
              detail: `Error: ${err.message}\n\nPlease visit GitHub to download manually.`,
              buttons: ["Open GitHub", "Close"],
              defaultId: 0,
            })
            .then(({ response: r }) => {
              if (r === 0)
                shell.openExternal(
                  `https://github.com/${GITHUB_USER}/${GITHUB_REPO}/releases/latest`,
                );
            });
          app.quit();
          return false;
        }
      }

      log("User chose Close, quitting");
      app.quit();
      return false;
    }

    log("No update needed, launching app");
  } catch (err) {
    log("checkForUpdates error: " + err.message);
  }
  return true;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    backgroundColor: "#020a06",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  if (process.env.NODE_ENV === "development") {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "dist/index.html"));
  }

  win.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      if (permission === "media") callback(true);
      else callback(false);
    },
  );
}

ipcMain.on("minimize", () => win?.minimize());
ipcMain.on("maximize", () =>
  win?.isMaximized() ? win.unmaximize() : win.maximize(),
);
ipcMain.on("close", () => win?.close());
ipcMain.on("notify", (event, { title, body }) => {
  if (win && !win.isFocused() && Notification.isSupported()) {
    new Notification({ title, body, silent: false }).show();
  }
});

process.on("uncaughtException", (err) => {
  log("UNCAUGHT EXCEPTION: " + err.message + "\n" + err.stack);
  dialog.showErrorBox("Unexpected Error", err.message);
});

app.whenReady().then(async () => {
  log("App ready");
  const canContinue = await checkForUpdates();
  if (canContinue) createWindow();
});

app.on("window-all-closed", () => app.quit());
