const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  MenuItem,
  dialog,
} = require("electron");
const path = require("path");
const log = require("electron-log");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: true,
      nodeIntegrationInSubframes: true,
      nodeIntegrationInWorker: true,
      webviewTag: true,
      webSecurity: false, // This disables same-origin policy for the browser window
    },
    titleBarStyle: "hiddenInset",
    vibrancy: "under-window",
    visualEffectState: "active",
    icon: path.join(__dirname, "../src/images/icon.png"),
  });

  mainWindow.loadURL(
    app.isPackaged
      ? `file://${path.join(__dirname, "../dist/index.html")}`
      : "http://localhost:3001"
  );

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Add context menu for the window
  mainWindow.webContents.on("context-menu", (event, params) => {
    const menu = new Menu();

    // Add Cut/Copy/Paste items when text is selected or in an editable field
    if (params.isEditable || params.selectionText) {
      if (params.isEditable) {
        menu.append(
          new MenuItem({
            label: "Cut",
            role: "cut",
            accelerator: "CmdOrCtrl+X",
            enabled: params.editFlags.canCut,
          })
        );
      }

      if (params.selectionText) {
        menu.append(
          new MenuItem({
            label: "Copy",
            role: "copy",
            accelerator: "CmdOrCtrl+C",
            enabled: params.editFlags.canCopy,
          })
        );
      }

      if (params.isEditable) {
        menu.append(
          new MenuItem({
            label: "Paste",
            role: "paste",
            accelerator: "CmdOrCtrl+V",
            enabled: params.editFlags.canPaste,
          })
        );
      }

      menu.popup();
    }
  });
}

// Set handlers for IPC messages
ipcMain.on("eraser-element-selected", (event, selector) => {
  console.log("Eraser element selected:", selector);
  // You can save this to Electron store if needed
});

// Register webview protocol handlers
app.on("web-contents-created", (e, contents) => {
  if (contents.getType() === "webview") {
    // Set a consistent user agent
    contents.setUserAgent(contents.getUserAgent() + " YourAppName/1.0");

    // Configure webview-specific settings
    contents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Access-Control-Allow-Origin": ["*"],
        },
      });
    });

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

    // Add context menu for webviews
    contents.on("context-menu", (event, params) => {
      const menu = new Menu();

      // Add standard browser context menu items
      menu.append(
        new MenuItem({
          label: "Back",
          click: () => contents.goBack(),
          enabled: contents.canGoBack(),
        })
      );
      menu.append(
        new MenuItem({
          label: "Forward",
          click: () => contents.goForward(),
          enabled: contents.canGoForward(),
        })
      );
      menu.append(
        new MenuItem({ label: "Reload", click: () => contents.reload() })
      );
      menu.append(new MenuItem({ type: "separator" }));

      // Add Cut/Copy/Paste items when text is selected or in an editable field
      if (params.isEditable || params.selectionText) {
        if (params.isEditable) {
          menu.append(
            new MenuItem({
              label: "Cut",
              role: "cut",
              accelerator: "CmdOrCtrl+X",
              enabled: params.editFlags.canCut,
            })
          );
        }

        if (params.selectionText) {
          menu.append(
            new MenuItem({
              label: "Copy",
              role: "copy",
              accelerator: "CmdOrCtrl+C",
              enabled: params.editFlags.canCopy,
            })
          );
        }

        if (params.isEditable) {
          menu.append(
            new MenuItem({
              label: "Paste",
              role: "paste",
              accelerator: "CmdOrCtrl+V",
              enabled: params.editFlags.canPaste,
            })
          );
        }
      }

      // Add link handling
      if (params.linkURL) {
        menu.append(new MenuItem({ type: "separator" }));
        menu.append(
          new MenuItem({
            label: "Open Link in New Tab",
            click: () => {
              // Notify the renderer to open a new tab with this URL
              e.sender.send("open-url-in-new-tab", params.linkURL);
            },
          })
        );
        menu.append(
          new MenuItem({
            label: "Copy Link Address",
            click: () => {
              require("electron").clipboard.writeText(params.linkURL);
            },
          })
        );
      }

      menu.popup();
    });
  }
});

// Handle IPC events from the renderer process
ipcMain.on("run-workflow-in-current-window", (event, data) => {
  // Just relay the message back to the sender so App.tsx can handle it
  event.sender.send("run-workflow-in-current-window", data);
});

ipcMain.on("run-workflow-in-new-window", async (event, data) => {
  const { workflowId, variables, detached } = data;
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
      icon: path.join(__dirname, "../src/images/icon.png"),
    });

    const isDevelopment = !app.isPackaged;

    // Encode variables as a JSON string and pass as a query parameter
    const variablesParam = variables
      ? `&variables=${encodeURIComponent(JSON.stringify(variables))}`
      : "";

    // Load the app with a special query parameter to indicate which workflow to run
    await newWindow.loadURL(
      isDevelopment
        ? `http://localhost:${
            process.env.PORT || 3000
          }?runWorkflow=${workflowId}${variablesParam}`
        : `file://${path.join(
            __dirname,
            "../dist/index.html"
          )}?runWorkflow=${workflowId}${variablesParam}`
    );

    // Focus the new window
    newWindow.focus();

    // If this is a scheduled automation that should run detached
    if (detached) {
      // Set up listener for 'workflow-complete' event
      newWindow.webContents.on("workflow-complete", () => {
        // Close the window when workflow is complete
        newWindow.close();
      });

      // Fallback: Close window after a timeout if workflow completion isn't detected
      setTimeout(() => {
        if (!newWindow.isDestroyed()) {
          newWindow.close();
        }
      }, 5 * 60 * 1000); // Close after 5 minutes if workflow doesn't complete
    }
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

app.on("ready", () => {
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Mock auto-updater handlers for development
ipcMain.handle("check-for-updates", async () => {
  dialog.showMessageBox({
    type: "info",
    title: "Development Mode",
    message: "Auto-updates are only available in production builds.",
    detail: "This feature is disabled during development.",
  });
  return { updateAvailable: false };
});

ipcMain.handle("install-update", () => {
  return true;
});

log.info("Development app starting...");
