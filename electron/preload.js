const { contextBridge, ipcRenderer } = require("electron");
const path = require("path");
const fs = require("fs");

// Try to load electron-store with a fallback
let Store;
let store;
try {
  Store = require("electron-store");
  // Create a Store instance
  store = new Store({
    name: "custom-web-browser-data",
  });
} catch (error) {
  console.warn(
    "electron-store module not found, using in-memory storage fallback"
  );
  // Simple in-memory fallback
  store = {
    data: {},
    get: function (key) {
      return this.data[key];
    },
    set: function (key, value) {
      this.data[key] = value;
      return true;
    },
    delete: function (key) {
      delete this.data[key];
      return true;
    },
    clear: function () {
      this.data = {};
      return true;
    },
  };
}

// Get version from package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../package.json"), "utf8")
);
const version = packageJson.version;

console.log("PRELOAD SCRIPT - App version from package.json:", version);

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", {
  // Expose electron-store methods through a safe interface
  store: {
    get: (key) => {
      try {
        return store.get(key);
      } catch (error) {
        console.error("Failed to get data from store:", error);
        return null;
      }
    },
    set: (key, value) => {
      try {
        store.set(key, value);
        return true;
      } catch (error) {
        console.error("Failed to set data in store:", error);
        return false;
      }
    },
    delete: (key) => {
      try {
        store.delete(key);
        return true;
      } catch (error) {
        console.error("Failed to delete data from store:", error);
        return false;
      }
    },
    clear: () => {
      try {
        store.clear();
        return true;
      } catch (error) {
        console.error("Failed to clear store:", error);
        return false;
      }
    },
  },
  // Add version information
  appInfo: {
    version: version,
  },
  // Add update methods
  updater: {
    checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
    onUpdateAvailable: (callback) =>
      ipcRenderer.on("update-available", callback),
    onUpdateDownloaded: (callback) =>
      ipcRenderer.on("update-downloaded", callback),
    onUpdateNotAvailable: (callback) =>
      ipcRenderer.on("update-not-available", callback),
    onUpdateError: (callback) => ipcRenderer.on("update-error", callback),
    installUpdate: () => ipcRenderer.invoke("install-update"),
  },
  // Add other IPC methods as needed
  send: (channel, data) => {
    // whitelist channels
    const validChannels = [
      "eraser-element-selected",
      "run-workflow-in-current-window",
      "run-workflow-in-new-tab",
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    const validChannels = [
      "run-workflow-in-current-window",
      "open-url-in-new-tab",
    ];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
});

console.log("PRELOAD SCRIPT - Exposed electron API with version:", version);
