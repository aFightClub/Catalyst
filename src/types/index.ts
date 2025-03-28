// Define layout types
export enum LayoutType {
  SINGLE = "single",
  DOUBLE = "double",
  TRIPLE = "triple",
}

// Define workflow action types
export enum ActionType {
  CLICK = "click",
  TYPE = "type",
  NAVIGATE = "navigate",
  WAIT = "wait",
  HOVER = "hover",
  KEYPRESS = "keypress",
  SUBMIT = "submit",
}

export interface WorkflowAction {
  type: ActionType;
  data: any;
  timestamp: number;
}

export interface Workflow {
  id: string;
  name: string;
  actions: WorkflowAction[];
  variables: string[];
  startUrl?: string; // The URL where the workflow should start
}

export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isReady: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  tabs: Tab[];
  createdAt: string;
}

export interface ErasedElement {
  url: string; // Original URL for backwards compatibility
  domain: string; // Domain where this rule applies
  selector: string; // CSS selector to hide
}
