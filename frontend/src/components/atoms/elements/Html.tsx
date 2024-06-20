import { useRecoilValue } from 'recoil';

import { settingsState } from 'state/settings';

import { type IHtmlElement } from 'client-types/';

import { FrameElement } from './Frame';

interface Props {
  element: IHtmlElement;
}

const HtmlElement = ({ element }: Props) => {
  const { theme } = useRecoilValue(settingsState);
  if (!element.src) {
    return null;
  }
  return (
    <FrameElement>
      <div
        className={`${element.display}-html ${theme}`}
        style={{
          maxWidth: '100%'
        }}
        dangerouslySetInnerHTML={{ __html: element.src }}
      />
    </FrameElement>
  );
};

export { HtmlElement };
