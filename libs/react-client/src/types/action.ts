export interface IAction {
  description?: string;
  forId: string;
  id: string;
  label?: string;
  name: string;
  onClick: () => void;
  value: string;
  collapsed: boolean;
}

export interface IChoiceAction {
  forId: string;
  id: string;
  onClick: () => void;
  data: any;
}

export interface IExternalAction extends IChoiceAction {
  display: boolean;
  label: string;
  external: boolean;
}

export interface ICallFn {
  callback: (payload: Record<string, any>) => void;
  name: string;
  args: Record<string, any>;
}

export interface IAskResponse {
  value: string;
  type: 'click' | 'text';
  forId: string;
  id: string;
}
