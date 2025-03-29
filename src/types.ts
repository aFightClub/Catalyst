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
  WAIT = "wait",
  EXTRACT = "extract",
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
}

export interface Workflow {
  id: string;
  name: string;
  actions: WorkflowAction[];
  createdAt: string;
}
