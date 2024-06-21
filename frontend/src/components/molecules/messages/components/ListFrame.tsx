import { useCallback } from 'react';

import { List, ListItemButton } from '@mui/material';
import Box from '@mui/material/Box';

import { ListDataItem, useChatContext } from '@chainlit/react-client';

const ListItemFrame = ({ children }: { children: React.ReactNode }) => (
  <Box
    sx={{
      p: 1,
      boxSizing: 'border-box',
      display: 'flex',
      width: '100%',
      padding: 0
    }}
  >
    {children}
  </Box>
);

interface Props<T extends ListDataItem> {
  onClick: (item: T) => void;
  disabled: boolean;
  items: Array<T>;
}

export const ListFrame = <T extends ListDataItem>({
  onClick,
  disabled,
  items
}: Props<T>) => {
  const { abortAudioTask } = useChatContext();

  const handleClick = useCallback(
    (item: T) => {
      abortAudioTask();
      onClick(item);
    },
    [abortAudioTask, onClick]
  );

  return (
    <List>
      {items.map((item, index) => {
        return (
          <ListItemButton
            key={index}
            sx={{
              marginTop: '10px'
            }}
            disabled={disabled}
            onClick={() => handleClick(item)}
          >
            <ListItemFrame>
              <div
                className={`${item.display}-html`}
                style={{
                  maxWidth: '100%'
                }}
                dangerouslySetInnerHTML={{
                  __html: item.src
                }}
              />
            </ListItemFrame>
          </ListItemButton>
        );
      })}
    </List>
  );
};
