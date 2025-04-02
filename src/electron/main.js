const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

// Set app name
app.setName("Catalyst");

function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Needed for IPC to work properly
      webviewTag: true, // Enable webviews
    },
    icon: path.join(__dirname, "../src/images/mac-icon.png"),
  });

  // Check if app is running in development or production mode
  const isDevelopment = !app.isPackaged;

  if (isDevelopment) {
    // In development mode, load from localhost Vite dev server
    win.loadURL(`http://localhost:${process.env.PORT || 3000}`);

    // Open DevTools
    win.webContents.openDevTools();
  } else {
    // In production, load from build directory
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
      icon: path.join(__dirname, "../src/images/mac-icon.png"),
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

// Handle file system operations
ipcMain.handle("export-data-to-file", async (event, data) => {
  const { defaultPath, content } = data;
  try {
    const saveOptions = {
      title: "Export Browser Data",
      defaultPath:
        defaultPath ||
        path.join(app.getPath("documents"), "browser-backup.json"),
      buttonLabel: "Save",
      filters: [{ name: "JSON Files", extensions: ["json"] }],
    };

    const { canceled, filePath } = await dialog.showSaveDialog(saveOptions);

    if (!canceled && filePath) {
      await fs.promises.writeFile(filePath, content, "utf8");
      return { success: true, path: filePath };
    } else {
      return { success: false, message: "Operation canceled by user" };
    }
  } catch (error) {
    console.error("Error exporting data:", error);
    return {
      success: false,
      message: error.message || "Unknown error occurred",
    };
  }
});

ipcMain.handle("import-data-from-file", async (event) => {
  try {
    const openOptions = {
      title: "Import Browser Data",
      buttonLabel: "Import",
      filters: [{ name: "JSON Files", extensions: ["json"] }],
      properties: ["openFile"],
    };

    const { canceled, filePaths } = await dialog.showOpenDialog(openOptions);

    if (!canceled && filePaths && filePaths.length > 0) {
      const content = await fs.promises.readFile(filePaths[0], "utf8");
      return { success: true, content };
    } else {
      return { success: false, message: "Operation canceled by user" };
    }
  } catch (error) {
    console.error("Error importing data:", error);
    return {
      success: false,
      message: error.message || "Unknown error occurred",
    };
  }
});

// Set app icon for Linux and Windows (macOS uses icns file in build config)
if (process.platform === "linux" || process.platform === "win32") {
  app.on("ready", () => {
    app.whenReady().then(() => {
      try {
        const iconPath = path.join(__dirname, "../src/images/mac-icon.png");
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
