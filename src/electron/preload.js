const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods for renderer process
contextBridge.exposeInMainWorld("electron", {
  // IPC send method
  send: (channel, data) => {
    // Only allowed channels
    const validChannels = [
      "eraser-element-selected",
      "run-workflow-in-current-window",
      "run-workflow-in-new-window",
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  // IPC invoke method (for async calls with response)
  invoke: (channel, data) => {
    // Only allowed channels for invoke
    const validChannels = ["export-data-to-file", "import-data-from-file"];

    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }

    return Promise.reject(new Error(`Invalid invoke channel: ${channel}`));
  },

  // For relaying messages from main process to renderer
  on: (channel, func) => {
    const validChannels = ["run-workflow-in-current-window"];
    if (validChannels.includes(channel)) {
      // Remove old listener to avoid duplicates
      ipcRenderer.removeAllListeners(channel);
      // Add new listener
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
});
