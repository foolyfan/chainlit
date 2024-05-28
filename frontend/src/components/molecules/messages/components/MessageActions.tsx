import { MessageContext } from 'contexts/MessageContext';
import { useCallback, useContext, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import type { IAction, IStep } from 'client-types/';

import { ActionButton } from './ActionButton';
import { ActionDrawerButton } from './ActionDrawerButton';

interface Props {
  message: IStep;
  actions: IAction[];
}

const MessageActions = ({ message, actions }: Props) => {
  const [displayedActions, setDisplayedActions] = useState<IAction[]>([]);
  const [displayedDrawerActions, setDisplayedDrawerActions] = useState<
    IAction[]
  >([]);

  const { askUser } = useContext(MessageContext);

  const [history, setHistory] = useState<boolean>(false);
  useEffect(() => {
    const scopedActions = actions.filter((a) => {
      if (a.forId) {
        return a.forId === message.id;
      }
      return true;
    });
    if (!scopedActions.length) {
      return;
    }
    if (actions.length < displayedActions.length) {
      setHistory(true);
      return;
    }
    setDisplayedActions(scopedActions.filter((a) => !a.collapsed));
    setDisplayedDrawerActions(scopedActions.filter((a) => a.collapsed));
  }, [actions]);

  const show =
    displayedActions.length || displayedDrawerActions.length || history;

  const handleClick = useCallback((action: IAction) => {
    if (history) {
      return;
    }
    askUser?.callback({
      id: action.id,
      forId: action.forId,
      value: action.id,
      type: 'click'
    });
  }, []);

  if (!show) {
    return null;
  }

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="start"
      justifyContent="space-between"
      width="100%"
    >
      <Box id="actions-list">
        {displayedActions.map((action) => (
          <ActionButton
            key={action.id}
            action={action}
            margin={'2px 8px 6px 0'}
            onClick={() => handleClick(action)}
            display={history}
          />
        ))}
        {displayedDrawerActions.length ? (
          <ActionDrawerButton actions={displayedDrawerActions} />
        ) : null}
      </Box>
    </Stack>
  );
};

export { MessageActions };
