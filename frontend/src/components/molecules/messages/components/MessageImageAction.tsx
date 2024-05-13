import { useState } from 'react';

import Skeleton from '@mui/material/Skeleton';

import { FrameElement } from 'components/atoms/elements/Frame';

import { IChoiceImageAction } from 'client-types/';

interface Props {
  element: IChoiceImageAction;
  onClick: () => void;
}

const MessageImageAction = ({ element, onClick }: Props) => {
  const [loading, setLoading] = useState(true);

  if (!element.url) {
    return null;
  }

  return (
    <FrameElement>
      {loading && <Skeleton variant="rectangular" width="100%" height={200} />}
      <img
        className={`${element.display}-image`}
        src={element.url}
        onLoad={() => setLoading(false)}
        onClick={onClick}
        style={{
          objectFit: 'cover',
          maxWidth: '100%',
          margin: 'auto',
          height: 'auto',
          display: 'block',
          cursor: element.display === 'inline' ? 'pointer' : 'default'
        }}
        alt={element.name}
        loading="lazy"
      />
    </FrameElement>
  );
};

export { MessageImageAction };
