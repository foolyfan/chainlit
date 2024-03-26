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
        style={{
          objectFit: 'cover',
          maxWidth: '100%',
          margin: 'auto',
          height: 'auto',
          display: 'block',
          cursor: element.display === 'inline' ? 'pointer' : 'default'
        }}
        dangerouslySetInnerHTML={{ __html: element.src }}
      />
    </FrameElement>
  );
};

export { HtmlElement };
