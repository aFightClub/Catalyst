const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      webSecurity: false, // This disables same-origin policy for the browser window
    },
    titleBarStyle: "hiddenInset",
    vibrancy: "under-window",
    visualEffectState: "active",
    icon: path.join(__dirname, "../src/images/icon.png"),
  });

  if (!app.isPackaged) {
    win.loadURL("http://localhost:3001");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

// Set handlers for IPC messages
ipcMain.on("eraser-element-selected", (event, selector) => {
  console.log("Eraser element selected:", selector);
  // You can save this to Electron store if needed
});

// Register webview protocol handlers
app.on("web-contents-created", (e, contents) => {
  if (contents.getType() === "webview") {
    // Handle webview events and security
    contents.on("will-navigate", (e, url) => {
      console.log(`Navigating to: ${url}`);
    });

    // Allow opening DevTools for webviews for debugging
    contents.on("before-input-event", (e, input) => {
      if (input.type === "keyDown" && input.key === "F12") {
        contents.openDevTools();
      }
    });
  }
});

// Handle IPC events from the renderer process
ipcMain.on("run-workflow-in-current-window", (event, data) => {
  // Just relay the message back to the sender so App.tsx can handle it
  event.sender.send("run-workflow-in-current-window", data);
});

ipcMain.on("run-workflow-in-new-tab", async (event, data) => {
  const { workflowId, startUrl } = data;
  try {
    // Create a new browser window/tab
    const newWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webviewTag: true,
      },
    });

    const isDevelopment = !app.isPackaged;

    // Load the app with a special query parameter to indicate which workflow to run
    await newWindow.loadURL(
      isDevelopment
        ? `http://localhost:${
            process.env.PORT || 3000
          }?runWorkflow=${workflowId}`
        : `file://${path.join(
            __dirname,
            "../dist/index.html"
          )}?runWorkflow=${workflowId}`
    );

    // Focus the new window
    newWindow.focus();
  } catch (error) {
    console.error("Failed to open workflow in new tab:", error);
  }
});

// Set app icon for Linux and Windows (macOS uses icns file in build config)
if (process.platform === "linux" || process.platform === "win32") {
  app.on("ready", () => {
    app.whenReady().then(() => {
      try {
        const iconPath = path.join(__dirname, "../src/images/icon.png");
        console.log("Setting application icon:", iconPath);
        app.setAppUserModelId(app.name); // Set app ID for Windows
      } catch (err) {
        console.error("Failed to set app icon:", err);
      }
    });
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
