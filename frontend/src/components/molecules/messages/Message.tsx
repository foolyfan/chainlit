import { keyframes } from '@emotion/react';
import { MessageContext } from 'contexts/MessageContext';
import { memo, useContext, useEffect, useState } from 'react';

import { CircularProgress } from '@mui/material';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import { AskUploadButton } from './components/AskUploadButton';
import { AUTHOR_BOX_WIDTH, Author } from './components/Author';
import { DetailsButton } from './components/DetailsButton';
import { MessageActions } from './components/MessageActions';
import { MessageContent } from './components/MessageContent';
import { MessageListActions } from './components/MessageListActions';

import type {
  IAction,
  ILayout,
  IListAction,
  IMessageElement,
  IStep
} from 'client-types/';

import { Messages } from './Messages';

interface Props {
  message: IStep;
  elements: IMessageElement[];
  actions: IAction[];
  listActions: IListAction[];
  indent: number;
  showAvatar?: boolean;
  showBorder?: boolean;
  isRunning?: boolean;
  isLast?: boolean;
  layout?: ILayout;
}

const Message = memo(
  ({
    message,
    elements,
    actions,
    listActions,
    indent,
    showAvatar,
    showBorder,
    isRunning,
    isLast,
    layout
  }: Props) => {
    const {
      expandAll,
      hideCot,
      highlightedMessage,
      defaultCollapseContent,
      allowHtml,
      latex,
      onError
    } = useContext(MessageContext);

    const [showDetails, setShowDetails] = useState(expandAll);

    useEffect(() => {
      setShowDetails(expandAll);
    }, [expandAll]);

    if (hideCot && indent) {
      return null;
    }

    const isUser = message.type === 'user_message';
    const isAsk = message.waitForAnswer;
    showAvatar = false;
    return (
      <Box
        sx={{
          color: 'text.primary',
          backgroundColor: (theme) =>
            isUser
              ? 'transparent'
              : theme.palette.mode === 'dark'
              ? theme.palette.grey[800]
              : theme.palette.grey[100]
        }}
        className={isUser ? 'user step' : 'step'}
      >
        <Box
          sx={{
            boxSizing: 'border-box',
            mx: 'auto',
            maxWidth: '60rem',
            px: 2,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}
        >
          <Stack
            id={`step-${message.id}`}
            direction="row"
            ml={indent ? `${indent * (AUTHOR_BOX_WIDTH + 12)}px` : 0}
            sx={{
              py: 2,
              borderBottom: (theme) =>
                showBorder ? `1px solid ${theme.palette.divider}` : 'none',
              animation:
                message.id && highlightedMessage === message.id
                  ? `3s ease-in-out 0.1s ${flash}`
                  : 'none',
              overflowX: 'auto'
            }}
          >
            <Author message={message} show={showAvatar}>
              <Stack
                alignItems="flex-start"
                sx={{
                  background: isUser
                    ? 'linear-gradient(270deg,#6485ff 0.95%,#849ffe 100%)'
                    : 'white',
                  'border-radius': isUser
                    ? '16px 16px 4px 16px'
                    : '4px 16px 16px 16px',
                  padding: '10px',
                  color: isUser ? 'white' : 'black',
                  width: isUser ? 'fit-content' : '100%'
                }}
              >
                {message.type == 'waiting' ? (
                  <Box
                    sx={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <CircularProgress size={16} />
                  </Box>
                ) : (
                  <>
                    <MessageContent
                      elements={elements}
                      message={message}
                      preserveSize={
                        !!message.streaming || !defaultCollapseContent
                      }
                      allowHtml={allowHtml}
                      latex={latex}
                    />
                    <DetailsButton
                      message={message}
                      opened={showDetails}
                      onClick={() => setShowDetails(!showDetails)}
                      loading={isRunning && isLast}
                    />
                    {!isRunning && isLast && isAsk && (
                      <AskUploadButton onError={onError} />
                    )}
                    {!isUser && (
                      <Box
                        sx={{
                          position: 'relative',
                          width: '100%',
                          paddingBottom: 1,
                          paddingTop: 1,
                          marginTop: 1
                        }}
                      >
                        {<MessageActions message={message} actions={actions} />}
                        {
                          <MessageListActions
                            layout={layout}
                            message={message}
                            listActions={listActions}
                          />
                        }
                      </Box>
                    )}
                  </>
                )}
              </Stack>
            </Author>
          </Stack>
        </Box>
        {message.steps && showDetails && (
          <Messages
            messages={message.steps}
            actions={actions}
            listActions={listActions}
            elements={elements}
            indent={indent + 1}
            isRunning={isRunning}
          />
        )}
      </Box>
    );
  }
);

// Uses yellow[500] with 50% opacity
const flash = keyframes`
  from {
    background-color: transparent;
  }
  25% {
    background-color: rgba(255, 173, 51, 0.5);
  }
  to {
    background-color: transparent;
  }
`;

export { Message };
