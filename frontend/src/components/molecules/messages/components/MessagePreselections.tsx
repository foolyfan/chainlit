import { memo, useCallback } from 'react';

import {
  PSMessageItem,
  PreselectionSpec,
  useChatInteract
} from '@chainlit/react-client';

import { ListFrame } from './ListFrame';

interface Props {
  attach: PreselectionSpec;
}

const MessagePreselections: React.FC<Props> = memo(({ attach }: Props) => {
  const { callPreselection } = useChatInteract();

  const handleClick = useCallback(
    (item: PSMessageItem) => {
      callPreselection(item);
    },
    [callPreselection]
  );

  return (
    <ListFrame
      onClick={handleClick}
      disabled={false}
      items={attach.items as PSMessageItem[]}
    />
  );
});

export { MessagePreselections };
