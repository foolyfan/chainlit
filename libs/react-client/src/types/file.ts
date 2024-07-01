import { IAction, IInputResponse } from './action';

export interface FileSpec {
  accept?: string[] | Record<string, string[]>;
  max_size_mb?: number;
  max_files?: number;
}

export interface ActionSpec {
  keys?: string[];
}

export type UserInputType = 'keyboard' | 'speech' | 'touch';

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

export interface ListDataItem {
  data: any;
  src: string;
  display: string;
}

export interface PSPromptItem extends ListDataItem {
  label: string;
}

export interface PSMessageItem extends ListDataItem {
  name: string;
}

export interface BaseSpec {
  callback?: (payload: { type: UserInputType; data: any }) => void;
  __type__:
    | 'PreselectionSpec'
    | 'ChoiceSpec'
    | 'AskSpec'
    | 'InputSpec'
    | 'MessageSpec';
}

export interface ListSpec<T extends ListDataItem> extends BaseSpec {
  items: Array<T>;
}

export interface PreselectionSpec
  extends ListSpec<PSPromptItem | PSMessageItem> {
  type: 'prompt' | 'message';
}

export type ChoiceItem = ListDataItem;

export interface ChoiceSpec extends ListSpec<ChoiceItem> {
  timeout: number;
}

export interface MessageSpec extends BaseSpec {
  actions?: Array<IAction>;
}

export interface AskSpec extends MessageSpec {
  timeout: number;
}

export interface InputSpec extends MessageSpec {
  type: 'text' | 'number';
  timeout: number;
  placeholder: string;
  rules?: Array<IRule>;
}
