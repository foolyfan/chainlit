import { useRecoilValue } from 'recoil';

import { settingsState } from 'state/settings';

import { FrameElement } from './elements';

interface Props {
  src: string;
  display: string;
}

const ContentDrawer = ({ src, display }: Props) => {
  const { theme } = useRecoilValue(settingsState);
  if (!src) {
    return null;
  }
  return (
    <FrameElement>
      <div
        className={`${display}-html ${theme}`}
        style={{
          maxWidth: '100%'
        }}
        dangerouslySetInnerHTML={{ __html: src }}
      />
    </FrameElement>
  );
};

export { ContentDrawer };
