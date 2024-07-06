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
  name: string;
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

export interface FontSizeParameters {
  offset: number;
}

export interface WebBehaviorHandler {
  name: 'dark_style' | 'light_style' | 'add_font_size' | 'reduce_font_size';
  parameters?: FontSizeParameters;
}

export type LightStyle = WebBehaviorHandler;
export type DarkStyle = WebBehaviorHandler;

export interface AddFontSize extends WebBehaviorHandler {
  parameters: FontSizeParameters;
}
export interface ReduceFontSize extends WebBehaviorHandler {
  parameters: FontSizeParameters;
}

export interface CustomizeHtmlContent {
  src: string;
  display: string;
}

export interface MdLink extends CustomizeHtmlContent {
  data: string;
}

export interface ListDataItem extends CustomizeHtmlContent {
  data: any;
}

export interface PSInputItem extends ListDataItem {
  label: string;
}

export type PSMessageItem = ListDataItem;

export interface BaseSpec {
  callback?: (payload: { type: UserInputType; data: any }) => void;
  __type__:
    | 'PreselectionSpec'
    | 'ChoiceSpec'
    | 'AskSpec'
    | 'InputSpec'
    | 'MessageSpec'
    | 'CheckSpec';
  mdLinks?: Array<MdLink>;
}

export interface ListSpec<T extends ListDataItem> extends BaseSpec {
  items: Array<T>;
}

export interface PreselectionSpec
  extends ListSpec<PSInputItem | PSMessageItem> {
  type: 'input' | 'message';
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

export interface CheckSpec extends AskSpec {
  mdAgreementLinks: Array<MdLink>;
}

export interface InputSpec extends MessageSpec {
  type: 'text' | 'number';
  timeout: number;
  placeholder: string;
  rules?: Array<IRule>;
}
