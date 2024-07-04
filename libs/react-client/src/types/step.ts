import { IFeedback } from './feedback';
import {
  AskSpec,
  CheckSpec,
  ChoiceSpec,
  InputSpec,
  MessageSpec,
  PreselectionSpec
} from './file';
import { IGeneration } from './generation';

type StepType =
  | 'assistant_message'
  | 'user_message'
  | 'system_message'
  | 'run'
  | 'tool'
  | 'llm'
  | 'embedding'
  | 'retrieval'
  | 'rerank'
  | 'undefined'
  | 'waiting';

export interface IStep {
  id: string;
  name: string;
  type: StepType;
  threadId?: string;
  parentId?: string;
  isError?: boolean;
  showInput?: boolean | string;
  waitForAnswer?: boolean;
  input?: string;
  output: string;
  createdAt: number | string;
  start?: number | string;
  end?: number | string;
  disableFeedback?: boolean;
  feedback?: IFeedback;
  language?: string;
  streaming?: boolean;
  generation?: IGeneration;
  steps?: IStep[];
  speechContent?: string;
  //legacy
  indent?: number;
}

export interface ISpeechPromptMessage {
  content: string;
}

export interface OperableMessage {
  active: boolean;
  step: IStep;
  attach?:
    | PreselectionSpec
    | ChoiceSpec
    | AskSpec
    | InputSpec
    | MessageSpec
    | CheckSpec;
}
