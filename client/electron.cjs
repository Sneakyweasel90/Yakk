const { app, BrowserWindow, ipcMain, Notification, dialog, shell } = require("electron");
const path = require("path");
const https = require("https");
const fs = require("fs");
const os = require("os");

const GITHUB_USER = "Sneakyweasel90";
const GITHUB_REPO = "Yakk";

let win;

// Log file in user's home directory
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
    https.get(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("Failed to parse release data: " + e.message)); }
      });
    }).on("error", reject);
  });
}

function downloadFile(url, destPath, progressWin) {
  return new Promise((resolve, reject) => {
    const attempt = (downloadUrl) => {
      log("Attempting download from: " + downloadUrl);
      https.get(downloadUrl, { headers: { "User-Agent": "Yakk-App" } }, (res) => {
        log("Response status: " + res.statusCode);
        if (res.statusCode === 302 || res.statusCode === 301) {
          return attempt(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} from download URL`));
        }
        const totalBytes = parseInt(res.headers["content-length"] || "0");
        let downloadedBytes = 0;
        const file = fs.createWriteStream(destPath);
        res.on("data", (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0 && progressWin && !progressWin.isDestroyed()) {
            progressWin.setProgressBar(downloadedBytes / totalBytes);
            progressWin.setTitle(`Downloading update... ${Math.round((downloadedBytes / totalBytes) * 100)}%`);
          }
        });
        res.pipe(file);
        file.on("finish", () => { log("Download complete: " + destPath); file.close(resolve); });
        file.on("error", (e) => { log("File write error: " + e.message); reject(e); });
      }).on("error", (e) => { log("HTTPS error: " + e.message); reject(e); });
    };
    attempt(url);
  });
}

async function checkForUpdates() {
  log("checkForUpdates started");
  if (process.env.NODE_ENV === "development") { log("Dev mode, skipping update check"); return true; }
  try {
    log("Fetching latest release...");
    const release = await getLatestRelease();
    const latestVersion = release.tag_name;
    const currentVersion = `v${app.getVersion()}`;
    log(`Current: ${currentVersion}, Latest: ${latestVersion}`);

    if (isNewerVersion(latestVersion, currentVersion)) {
      log("Update available!");
      const asset = release.assets?.find(a => a.name.endsWith(".exe"));
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
        const destPath = path.join(os.homedir(), "Downloads", `Yakk-Setup-${latestVersion}.exe`);
        log("Saving to: " + destPath);
        await downloadFile(downloadUrl, destPath, null);
        log("Download finished, launching installer");
        log("Opening with shell.openPath: " + destPath);
        shell.openPath(destPath).then((result) => {
          log("shell.openPath result: '" + result + "'");
          // Delete the installer after launching it
          setTimeout(() => {
            try {
              fs.unlinkSync(destPath);
              log("Installer deleted: " + destPath);
            } catch (e) {
              log("Could not delete installer: " + e.message);
            }
          }, 5000);
        });
        await new Promise(r => setTimeout(r, 3000));
        log("Quitting");
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

  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === "media") callback(true);
    else callback(false);
  });
}

ipcMain.on("minimize", () => win?.minimize());
ipcMain.on("maximize", () => win?.isMaximized() ? win.unmaximize() : win.maximize());
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
