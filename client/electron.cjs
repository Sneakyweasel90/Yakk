const { app, BrowserWindow, ipcMain, Notification } = require("electron");
const path = require("path");

let win;

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

// Desktop notifications — only fires when window is not focused
ipcMain.on("notify", (event, { title, body }) => {
  if (win && !win.isFocused() && Notification.isSupported()) {
    new Notification({ title, body, silent: false }).show();
  }
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());