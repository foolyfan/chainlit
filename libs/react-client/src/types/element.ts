export type IElement =
  | IHtmlElement
  | IImageElement
  | ITextElement
  | IPdfElement
  | IAvatarElement
  | ITasklistElement
  | IAudioElement
  | IVideoElement
  | IFileElement
  | IPlotlyElement
  | IPreviewInfoGroupElement;

export type IMessageElement =
  | IHtmlElement
  | IImageElement
  | ITextElement
  | IPdfElement
  | IAudioElement
  | IVideoElement
  | IFileElement
  | IPlotlyElement
  | IPreviewInfoGroupElement;

export type ElementType = IElement['type'];
export type IElementSize = 'small' | 'medium' | 'large';

interface TElement<T> {
  id: string;
  type: T;
  threadId?: string;
  forId: string;
  mime?: string;
  url?: string;
  chainlitKey?: string;
}

interface TMessageElement<T> extends TElement<T> {
  name: string;
  display: 'inline' | 'side' | 'page';
}

export interface IHtmlElement extends TMessageElement<'html'> {
  size?: IElementSize;
  src: string;
  width?: number;
  height?: number;
}

export interface IImageElement extends TMessageElement<'image'> {
  size?: IElementSize;
}

export interface IAvatarElement extends TElement<'avatar'> {
  name: string;
}

export interface ITextElement extends TMessageElement<'text'> {
  language?: string;
}

export interface IPdfElement extends TMessageElement<'pdf'> {
  page?: number;
}

export interface IAudioElement extends TMessageElement<'audio'> {}

export interface IVideoElement extends TMessageElement<'video'> {
  size?: IElementSize;
}

export interface IFileElement extends TMessageElement<'file'> {
  type: 'file';
}

export interface IPlotlyElement extends TMessageElement<'plotly'> {}

export interface ITasklistElement extends TElement<'tasklist'> {}

export interface IPreviewInfoGroupElement
  extends TMessageElement<'previewinfogroup'> {}
