import { IAskResponse } from './action';
import { IChoiceLayout, IStep } from './step';

export interface FileSpec {
  accept?: string[] | Record<string, string[]>;
  max_size_mb?: number;
  max_files?: number;
}

export interface ActionSpec {
  keys?: string[];
}

export interface ChoiceActionSpec extends ActionSpec {
  layout?: IChoiceLayout[];
}

export interface IFileRef {
  id: string;
}

export interface IAsk {
  callback: (payload: IStep | IFileRef[] | IAskResponse) => void;
  spec: {
    type: 'text' | 'file' | 'action' | 'choice_action';
    timeout: number;
  } & FileSpec &
    ActionSpec &
    ChoiceActionSpec;
}

export interface GatherCommandSpec {
  type: 'capture_idcard' | 'face_recognition';
  timeout: number;
}

export interface ICaptureIdCard {
  imageIds?: string[];
}

export interface IGatherCommand {
  callback: (payload: GatherCommandSpec & ICaptureIdCard) => void;
  spec: GatherCommandSpec;
}
