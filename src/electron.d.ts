interface ElectronAPI {
  appInfo: {
    version: string;
  };
  ipcRenderer: {
    send: (channel: string, data: any) => void;
    on: (channel: string, func: (...args: any[]) => void) => void;
  };
}

interface Window {
  electron: ElectronAPI;
}
