import { memo, useCallback, useState } from 'react';

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
  const [history, setHistory] = useState<boolean>(false);

  const { callPreselection } = useChatInteract();

  const handleClick = useCallback(
    (item: PSMessageItem) => {
      const res = callPreselection(item);
      res &&
        res.then(() => {
          setHistory(true);
        });
    },
    [callPreselection]
  );

  return (
    <ListFrame
      onClick={handleClick}
      disabled={history}
      items={attach.items as PSMessageItem[]}
    />
  );
});

export { MessagePreselections };
