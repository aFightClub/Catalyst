export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isReady: boolean;
  isCustomNamed?: boolean; // Tracks if the user has manually edited the tab name
}
