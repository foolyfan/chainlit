import { MessageContext, defaultMessageContext } from 'contexts/MessageContext';
import { memo, useCallback, useEffect, useRef } from 'react';
import { IMessageContext } from 'types';

import Box from '@mui/material/Box';

import type { IMessageElement, IStep } from 'client-types/';

import { Messages } from './Messages';

interface Props {
  autoScroll?: boolean;
  elements: IMessageElement[];
  messages: IStep[];
  context: IMessageContext;
  setAutoScroll?: (autoScroll: boolean) => void;
}

const MessageContainer = memo(
  ({ autoScroll, elements, messages, setAutoScroll, context }: Props) => {
    const ref = useRef<HTMLDivElement>();

    useEffect(() => {
      if (!ref.current || !autoScroll) {
        return;
      }
      ref.current.scrollTop = ref.current.scrollHeight;
    }, [messages, autoScroll]);

    const handleScroll = () => {
      if (!ref.current || !setAutoScroll) return;

      const { scrollTop, scrollHeight, clientHeight } = ref.current;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setAutoScroll(atBottom);
    };

    const handleScrollTop = useCallback(() => {
      if (ref.current && ref.current.scrollHeight > ref.current.clientHeight) {
        ref.current.scrollTop = ref.current.scrollHeight;
      }
    }, []);

    return (
      <MessageContext.Provider value={context || defaultMessageContext}>
        <Box
          ref={ref}
          position="relative"
          display="flex"
          flexDirection="column"
          flexGrow={1}
          sx={{
            overflowY: 'auto'
          }}
          onScroll={handleScroll}
        >
          <Messages
            indent={0}
            messages={messages}
            elements={elements}
            scrollTop={handleScrollTop}
          />
        </Box>
      </MessageContext.Provider>
    );
  }
);

export { MessageContainer };
