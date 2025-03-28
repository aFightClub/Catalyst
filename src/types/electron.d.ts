declare namespace Electron {
  interface WebviewTag extends HTMLElement {
    // Methods
    loadURL(url: string): void;
    getURL(): string;
    getTitle(): string;
    isLoading(): boolean;
    isWaitingForResponse(): boolean;
    stop(): void;
    reload(): void;
    reloadIgnoringCache(): void;
    canGoBack(): boolean;
    canGoForward(): boolean;
    goBack(): void;
    goForward(): void;
    executeJavaScript(code: string): Promise<any>;
    insertCSS(css: string): Promise<string>;
    openDevTools(): void;
    closeDevTools(): void;
    isDevToolsOpened(): boolean;
    isDevToolsFocused(): boolean;
    inspectElement(x: number, y: number): void;
    getWebContentsId(): number;

    // Events
    addEventListener(event: "did-finish-load", listener: () => void): this;
    addEventListener(
      event: "did-fail-load",
      listener: (event: any) => void
    ): this;
    addEventListener(event: "did-start-loading", listener: () => void): this;
    addEventListener(event: "did-stop-loading", listener: () => void): this;
    addEventListener(event: "dom-ready", listener: () => void): this;
    addEventListener(
      event: "page-title-updated",
      listener: (event: any) => void
    ): this;
    addEventListener(
      event: "page-favicon-updated",
      listener: (event: any) => void
    ): this;
    addEventListener(
      event: "did-navigate",
      listener: (event: any) => void
    ): this;
    addEventListener(
      event: "did-navigate-in-page",
      listener: (event: any) => void
    ): this;
    addEventListener(event: string, listener: (...args: any[]) => void): this;
    removeEventListener(
      event: string,
      listener: (...args: any[]) => void
    ): this;
  }
}

declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<
      WebViewHTMLAttributes,
      Electron.WebviewTag
    >;
  }
}

interface WebViewHTMLAttributes
  extends React.HTMLAttributes<Electron.WebviewTag> {
  allowpopups?: string | boolean;
  autosize?: string | boolean;
  disableblinkfeatures?: string;
  disableguestresize?: string | boolean;
  disablewebsecurity?: string | boolean;
  httpreferrer?: string;
  nodeintegration?: string | boolean;
  partition?: string;
  plugins?: string | boolean;
  preload?: string;
  src?: string;
  useragent?: string;
  webpreferences?: string;
}
