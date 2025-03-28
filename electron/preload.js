const { contextBridge, ipcRenderer } = require("electron");
const Store = require("electron-store");

// Create a Store instance
const store = new Store({
  name: "custom-web-browser-data",
  // Schema is defined in renderer to avoid duplication
});

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
  // Add other IPC methods as needed
  send: (channel, data) => {
    // whitelist channels
    let validChannels = ["eraser-element-selected", "save-data"];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    let validChannels = ["data-saved", "operation-error"];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
});
