import { MessageContext, defaultMessageContext } from 'contexts/MessageContext';
import { memo, useCallback, useEffect, useRef } from 'react';

import Box from '@mui/material/Box';

import type {
  IAction,
  ILayout,
  IListAction,
  IMessageElement,
  IStep
} from 'client-types/';
import { IMessageContext } from 'types/messageContext';

import { Messages } from './Messages';

interface Props {
  actions: IAction[];
  listActions: IListAction[];
  autoScroll?: boolean;
  context: IMessageContext;
  elements: IMessageElement[];
  messages: IStep[];
  layout?: ILayout;
  setAutoScroll?: (autoScroll: boolean) => void;
  hidden?: boolean;
}

const MessageContainer = memo(
  ({
    actions,
    listActions,
    autoScroll,
    context,
    elements,
    messages,
    layout,
    setAutoScroll,
    hidden
  }: Props) => {
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
          display={hidden ? 'none' : 'flex'}
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
            actions={actions}
            listActions={listActions}
            layout={layout}
            scrollTop={handleScrollTop}
          />
        </Box>
      </MessageContext.Provider>
    );
  }
);

export { MessageContainer };
