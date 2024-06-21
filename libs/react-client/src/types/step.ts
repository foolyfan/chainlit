import { IFeedback } from './feedback';
import { ListSpec, PSMessageItem, PSPromptItem } from './file';
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

export type IChoiceLayout = {
  field: string;
  width: number;
};

export type ILayout = IChoiceLayout[];

export interface ISpeechPromptMessage {
  content: string;
}

export interface AIMessageHistory {
  step: IStep;
  attach?: ListSpec<PSPromptItem | PSMessageItem>;
}
