import { type IHtmlElement } from 'client-types/';

import { FrameElement } from './Frame';

interface Props {
  element: IHtmlElement;
}

const HtmlElement = ({ element }: Props) => {
  if (!element.src) {
    return null;
  }

  return (
    <FrameElement>
      <div
        className={`${element.display}-html`}
        dangerouslySetInnerHTML={{ __html: element.src }}
      />
    </FrameElement>
  );
};

export { HtmlElement };
