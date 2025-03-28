export interface Plugin {
  id: string;
  name: string;
  urlPattern: RegExp;
  injectJS?: string;
  injectCSS?: string;
  injectHTML?: string;
}

// A simple console logger plugin
export const consoleLoggerPlugin: Plugin = {
  id: "console-logger",
  name: "Console Logger",
  urlPattern: /.*/, // Match all URLs
  injectJS: `
    console.log('Plugin system active!');
    console.log('Current URL:', window.location.href);
    console.log('Page title:', document.title);
  `,
};

// Add dark mode to specific sites
export const darkModePlugin: Plugin = {
  id: "dark-mode",
  name: "Dark Mode",
  urlPattern: /google\.com/, // Only apply to Google
  injectCSS: `
    body {
      background-color: #222 !important;
      color: #eee !important;
    }
    a { color: #809fff !important; }
  `,
};

// A welcome banner plugin
export const welcomeBannerPlugin: Plugin = {
  id: "welcome-banner",
  name: "Welcome Banner",
  urlPattern: /.*/, // Match all URLs
  injectHTML: `
    <div style="
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      z-index: 9999;
      font-family: Arial, sans-serif;
    ">
      🔌 Custom Browser Plugin Active
      <button onclick="this.parentNode.remove()" style="
        background: none;
        border: none;
        color: white;
        float: right;
        cursor: pointer;
      ">✕</button>
    </div>
  `,
};

// Export a list of all available plugins
export const availablePlugins: Plugin[] = [
  consoleLoggerPlugin,
  darkModePlugin,
  welcomeBannerPlugin,
];
