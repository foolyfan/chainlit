import { keyframes } from '@emotion/react';
import { useMessageContext } from 'contexts/MessageContext';
import { memo, useEffect, useRef, useState } from 'react';

import { CircularProgress } from '@mui/material';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import {
  ChoiceSpec,
  type IMessageElement,
  type IStep,
  MessageSpec,
  PreselectionSpec,
  useChatData
} from '@chainlit/react-client';

import { AUTHOR_BOX_WIDTH, Author } from './components/Author';
import { DetailsButton } from './components/DetailsButton';
import { MessageActions } from './components/MessageActions';
import { MessageChoices } from './components/MessageChoices';
import { MessageContent } from './components/MessageContent';
import { MessagePreselections } from './components/MessagePreselections';

import { Messages } from './Messages';

interface Props {
  message: IStep;
  elements: IMessageElement[];
  indent: number;
  showAvatar?: boolean;
  showBorder?: boolean;
  isRunning?: boolean;
  isLast?: boolean;
  scrollTop?: () => void;
}

const Message = memo(
  ({
    message,
    elements,
    indent,
    showAvatar,
    showBorder,
    isRunning,
    isLast,
    scrollTop
  }: Props) => {
    const {
      expandAll,
      hideCot,
      highlightedMessage,
      defaultCollapseContent,
      allowHtml,
      latex
    } = useMessageContext();

    const [showDetails, setShowDetails] = useState(expandAll);

    useEffect(() => {
      setShowDetails(expandAll);
    }, [expandAll]);

    if (hideCot && indent) {
      return null;
    }

    // 解决action、图片等资源加载后，不自动滚动到底部的问题
    const [height, setHeight] = useState<number>(0);
    const ref = useRef<HTMLDivElement>();
    useEffect(() => {
      if (ref.current) {
        const observer = new ResizeObserver((entries) => {
          for (const entry of entries) {
            setHeight(() => {
              if (entry.contentRect.height > height) {
                // 滚动窗口
                scrollTop && scrollTop();
              }
              return entry.contentRect.height;
            });
          }
        });

        observer.observe(ref.current);

        // 清理函数
        return () => {
          observer.disconnect();
        };
      }
    }, [ref, scrollTop]);

    const isUser = message.type === 'user_message';
    showAvatar = true;

    const [history, setHistory] = useState<boolean>(false);

    const { operableMessages } = useChatData();
    const [choiceAttach, setChoiceAttach] = useState<ChoiceSpec>();
    const [preselectionAttach, setPreselectioAttach] =
      useState<PreselectionSpec>();
    const [actionAttach, setActionAttach] = useState<MessageSpec>();
    // 可操作消息内容获取
    useEffect(() => {
      if (!operableMessages[message.id]) {
        return;
      }
      if (!operableMessages[message.id].active) {
        return;
      }
      const attach = operableMessages[message.id]?.attach;
      if (!attach) {
        return;
      }
      if (preselectionAttach || choiceAttach || actionAttach) {
        return;
      }
      if (attach.__type__ == 'PreselectionSpec') {
        setPreselectioAttach({
          ...(attach as PreselectionSpec)
        });
      }
      if (attach.__type__ == 'ChoiceSpec') {
        setChoiceAttach({
          ...(attach as ChoiceSpec)
        });
      }
      if (
        attach.__type__ == 'AskSpec' ||
        attach.__type__ == 'MessageSpec' ||
        (attach.__type__ == 'InputSpec' && (attach as MessageSpec).actions)
      ) {
        setActionAttach({
          ...(attach as MessageSpec)
        });
      }
    }, [operableMessages[message.id]]);

    // 可操作消息是否在活动，超时后不活动
    useEffect(() => {
      if (operableMessages[message.id]) {
        setHistory(!operableMessages[message.id].active);
      }
    }, [operableMessages[message.id]]);

    return (
      <Box
        ref={ref}
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
                        {actionAttach ? (
                          <MessageActions
                            attach={actionAttach}
                            disabled={history}
                            message={message}
                          />
                        ) : null}
                        {choiceAttach ? (
                          <MessageChoices
                            attach={choiceAttach}
                            disabled={history}
                            message={message}
                          />
                        ) : null}
                        {preselectionAttach ? (
                          <MessagePreselections attach={preselectionAttach} />
                        ) : null}
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

Message.displayName = 'Message';

export { Message };
