import { IAskResponse, IInputResponse } from './action';
import { IChoiceLayout, IStep } from './step';

export interface FileSpec {
  accept?: string[] | Record<string, string[]>;
  max_size_mb?: number;
  max_files?: number;
}

export interface ActionSpec {
  keys?: string[];
}

export interface ListActionSpec extends ActionSpec {
  layout?: IChoiceLayout[];
}

export interface IFileRef {
  id: string;
}

export interface IAsk {
  callback: (payload: IStep | IFileRef[] | IAskResponse) => void;
  spec: {
    type: 'text' | 'file' | 'action' | 'list_action';
    timeout: number;
  } & FileSpec &
    ActionSpec &
    ListActionSpec;
}

export interface IRule {
  condition: 'onSubmit' | 'onChange';
  body: string;
}

export interface IInput {
  callback: (payload: IInputResponse) => void;
  spec: {
    type: 'text' | 'number';
    timeout: number;
    placeholder: string;
    rules?: Array<IRule>;
  } & ActionSpec;
}

export interface GatherCommandSpec {
  type:
    | 'capture_idcard'
    | 'face_recognition'
    | 'password'
    | 'custom_card'
    | 'scan';
  timeout: number;
}

export interface ICaptureIdCard {
  imageIds?: string[];
}

export interface IGatherCommand {
  callback: (
    payload: (IGatherCommandResponse & ICaptureIdCard) | undefined
  ) => void;
  spec: GatherCommandSpec;
}

export interface IGatherCommandResponse extends GatherCommandSpec {
  code: '00' | string;
  msg: string;
  data: any;
}

export interface UISettingsCommandOptions {
  type: string;
}

export interface BrightnessModeOptions extends UISettingsCommandOptions {
  mode: 'light' | 'dark';
  type: 'mode';
}

export interface FontOptions extends UISettingsCommandOptions {
  fontSize?: {
    type: 'add' | 'reduce';
    offset: number;
  };
  fontFamily?: string;
  type: 'font';
}

export interface IUISettingsCommandOptions {
  spec: BrightnessModeOptions | FontOptions;
}

export interface PSPromptItem {
  label: string;
}

export interface PSMessageItem {
  value: any;
  html: string;
}

export interface PreselectionSpec {
  items: Array<PSPromptItem> | Array<PSMessageItem>;
  type: 'prompt' | 'message';
}
