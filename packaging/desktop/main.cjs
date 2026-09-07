const { app, BrowserWindow } = require("electron");
const path = require("node:path");

const smokeTest = process.argv.includes("--smoke-test");
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 650,
    show: !smokeTest,
    autoHideMenuBar: true,
    backgroundColor: "#090b17",
    icon: path.join(__dirname, "..", "www", "assets", "app-icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", event => event.preventDefault());
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.type === "keyDown" && input.key === "F11") {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
  });
  mainWindow.loadFile(path.join(__dirname, "..", "www", "index.html"));
  if (smokeTest) mainWindow.webContents.once("did-finish-load", () => setTimeout(() => app.exit(0), 250));
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); } });
  app.whenReady().then(createWindow);
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  app.on("window-all-closed", () => app.quit());
}
