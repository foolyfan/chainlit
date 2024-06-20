import { useCallback } from 'react';

import { List, ListItemButton } from '@mui/material';

import {
  type IStep,
  PSMessageItem,
  useChatContext,
  useChatData,
  useChatInteract
} from '@chainlit/react-client';

import { ChoiceFrame } from './ChoiceFrame';

interface Props {
  message: IStep;
}

export const MessageChoices = ({ message }: Props) => {
  const { preselection } = useChatData();
  const { callPreselection } = useChatInteract();
  const { abortAudioTask } = useChatContext();
  const handleClick = useCallback((item: PSMessageItem) => {
    4;
    abortAudioTask();
    callPreselection(item);
  }, []);
  if (
    !preselection ||
    (preselection.type == 'message' && preselection.forId != message.id)
  ) {
    return null;
  }
  return (
    <List>
      {preselection.items.map((item) => {
        return (
          <ListItemButton
            sx={{
              marginTop: '10px'
            }}
            onClick={() => handleClick(item as PSMessageItem)}
          >
            <ChoiceFrame>
              <div
                className={`${(item as PSMessageItem).display}-html`}
                style={{
                  maxWidth: '100%'
                }}
                dangerouslySetInnerHTML={{
                  __html: (item as PSMessageItem).src
                }}
              />
            </ChoiceFrame>
          </ListItemButton>
        );
      })}
    </List>
  );
};
