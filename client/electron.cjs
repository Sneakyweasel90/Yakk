const { app, BrowserWindow, ipcMain, Notification, dialog, shell } = require("electron");
const path = require("path");
const https = require("https");
const fs = require("fs");
const os = require("os");

const GITHUB_USER = "Sneakyweasel90";
const GITHUB_REPO = "Yakk";

let win;

// Compare version strings e.g. "1.2.0" > "1.1.0"
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

// Fetch latest release from GitHub API
function getLatestRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.github.com",
      path: `/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/latest`,
      headers: { "User-Agent": "Yakk-App" },
    };
    https.get(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error("Failed to parse release data"));
        }
      });
    }).on("error", reject);
  });
}

// Download file with redirect support and progress
function downloadFile(url, destPath, progressWin) {
  return new Promise((resolve, reject) => {
    const attempt = (downloadUrl) => {
      https.get(downloadUrl, { headers: { "User-Agent": "Yakk-App" } }, (res) => {
        // Follow redirects
        if (res.statusCode === 302 || res.statusCode === 301) {
          return attempt(res.headers.location);
        }

        const totalBytes = parseInt(res.headers["content-length"] || "0");
        let downloadedBytes = 0;
        const file = fs.createWriteStream(destPath);

        res.on("data", (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0 && progressWin && !progressWin.isDestroyed()) {
            const percent = Math.round((downloadedBytes / totalBytes) * 100);
            progressWin.setProgressBar(downloadedBytes / totalBytes);
            progressWin.setTitle(`Downloading update... ${percent}%`);
          }
        });

        res.pipe(file);
        file.on("finish", () => file.close(resolve));
        file.on("error", reject);
      }).on("error", reject);
    };
    attempt(url);
  });
}

async function checkForUpdates() {
  if (process.env.NODE_ENV === "development") return true;

  try {
    const release = await getLatestRelease();
    const latestVersion = release.tag_name;
    const currentVersion = `v${app.getVersion()}`;

    if (isNewerVersion(latestVersion, currentVersion)) {
      const asset = release.assets?.find(a => a.name.endsWith(".exe"));
      const downloadUrl = asset?.browser_download_url;

      const { response } = await dialog.showMessageBox({
        type: "info",
        title: "Update Available",
        message: `A new version of Yakk is available!`,
        detail: `Current version: ${currentVersion}\nNew version: ${latestVersion}\n\nYou must update to continue. Download now?`,
        buttons: ["Download & Install", "Close"],
        defaultId: 0,
        cancelId: 1,
      });

      if (response === 0 && downloadUrl) {
        const progressWin = new BrowserWindow({
          width: 400,
          height: 120,
          resizable: false,
          frame: true,
          title: "Downloading update...",
          webPreferences: { nodeIntegration: false },
        });
        progressWin.loadURL("about:blank");
        progressWin.setProgressBar(0);

        try {
          const destPath = path.join(os.tmpdir(), `Yakk-Setup-${latestVersion}.exe`);
          await downloadFile(downloadUrl, destPath, progressWin);
          progressWin.close();

          const { response: installResponse } = await dialog.showMessageBox({
            type: "info",
            title: "Download Complete",
            message: "Update downloaded!",
            detail: "Click Install to run the installer now. Yakk will close.",
            buttons: ["Install Now", "Install Later"],
            defaultId: 0,
          });

          if (installResponse === 0) {
            shell.openPath(destPath);
          } else {
            shell.showItemInFolder(destPath);
          }
          app.quit();
          return false;

        } catch (err) {
          progressWin.close();
          const { response: fallbackResponse } = await dialog.showMessageBox({
            type: "warning",
            title: "Download Failed",
            message: "Could not download update automatically.",
            detail: "Would you like to open the download page in your browser instead?",
            buttons: ["Open in Browser", "Close"],
            defaultId: 0,
          });
          if (fallbackResponse === 0) {
            shell.openExternal(release.html_url);
          }
          app.quit();
          return false;
        }
      }

      // User clicked Close
      app.quit();
      return false;
    }
  } catch (err) {
    console.log("Update check failed, continuing:", err.message);
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

  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === "media") callback(true);
    else callback(false);
  });
}

ipcMain.on("minimize", () => win.minimize());
ipcMain.on("maximize", () => win.isMaximized() ? win.unmaximize() : win.maximize());
ipcMain.on("close", () => win.close());

ipcMain.on("notify", (event, { title, body }) => {
  if (win && !win.isFocused() && Notification.isSupported()) {
    new Notification({ title, body, silent: false }).show();
  }
});

app.whenReady().then(async () => {
  const canContinue = await checkForUpdates();
  if (canContinue) {
    createWindow();
  }
});

app.on("window-all-closed", () => app.quit());
