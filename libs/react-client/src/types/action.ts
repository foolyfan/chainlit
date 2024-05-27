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
export interface IListAction {
  type: 'data' | 'external' | 'image';
  name: string;
  forId: string;
  id: string;
  onClick: () => void;
  data: any;
}

export type IChoiceAction = IListAction;

export interface IExternalAction extends IListAction {
  label: string;
}

export interface IChoiceImageAction extends IListAction {
  url: string;
  display: string;
  imageName: string;
  chainlitKey?: string;
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
