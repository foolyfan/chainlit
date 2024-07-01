export interface IAction {
  description?: string;
  forId: string;
  id: string;
  label?: string;
  name: string;
  onClick: () => void;
  value: string;
  collapsed: boolean;
  data: any;
}

export interface ICallFn {
  callback: (payload: Record<string, any>) => void;
  name: string;
  args: Record<string, any>;
}

export interface IInputResponse {
  value: string;
  type: 'click' | 'input' | 'asr_res';
  forId: string;
  id: string;
}
