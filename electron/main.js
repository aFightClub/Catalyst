const { app, BrowserWindow, ipcMain, Menu, MenuItem } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
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
      // (in a real implementation you might want to make this configurable)
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

  // Check for updates after app launch
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
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

// Auto-updater events
autoUpdater.on("checking-for-update", () => {
  console.log("Checking for update...");
});

autoUpdater.on("update-available", (info) => {
  console.log("Update available:", info);
});

autoUpdater.on("update-not-available", (info) => {
  console.log("Update not available:", info);
});

autoUpdater.on("error", (err) => {
  console.log("Error in auto-updater:", err);
});

autoUpdater.on("download-progress", (progressObj) => {
  console.log(`Download speed: ${progressObj.bytesPerSecond}`);
  console.log(`Downloaded ${progressObj.percent}%`);
});

autoUpdater.on("update-downloaded", (info) => {
  console.log("Update downloaded:", info);

  // Notify user and offer to restart
  const { dialog } = require("electron");
  dialog
    .showMessageBox({
      type: "info",
      title: "Update Ready",
      message: `Catalyst ${info.version} is ready to install`,
      detail:
        "The update has been downloaded. Restart the application to apply the updates.",
      buttons: ["Restart Now", "Later"],
      defaultId: 0,
    })
    .then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
});
