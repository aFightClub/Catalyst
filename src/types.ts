export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isReady: boolean;
  isCustomNamed?: boolean; // Tracks if the user has manually edited the tab name
}

export enum LayoutType {
  SINGLE = "single",
  DOUBLE = "double",
  TRIPLE = "triple",
}

export enum ActionType {
  NAVIGATE = "navigate",
  CLICK = "click",
  INPUT = "input",
  TYPE = "type", // Keep for backward compatibility
  WAIT = "wait",
  EXTRACT = "extract",
  KEYPRESS = "keypress",
  SUBMIT = "submit",
  JAVASCRIPT = "javascript", // Add JavaScript action type
}

export interface Workspace {
  id: string;
  name: string;
  tabs: Tab[];
  createdAt: string;
}

export interface ErasedElement {
  url: string;
  domain: string;
  selector: string;
}

export interface WorkflowAction {
  id: string;
  type: ActionType;
  target?: string;
  value?: string;
  variableName?: string;
  timestamp?: string;
  data?: any; // For storing UI-specific data
}

export interface Workflow {
  id: string;
  name: string;
  actions: WorkflowAction[];
  createdAt: string;
  variables?: string[];
  startUrl?: string;
}
