import { createContext, useContext } from 'react';

import { IMessageContext } from 'types/messageContext';

const defaultMessageContext = {
  avatars: [],
  defaultCollapseContent: false,
  expandAll: false,
  hideCot: false,
  highlightedMessage: null,
  loading: false,
  onElementRefClick: undefined,
  onFeedbackUpdated: undefined,
  onPlaygroundButtonClick: undefined,
  showFeedbackButtons: true,
  onError: () => undefined,
  uiName: ''
};

const MessageContext = createContext<IMessageContext | undefined>(undefined);

const useMessageContext = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessageContext must be used within a MessageProvider');
  }
  return context;
};

export { MessageContext, defaultMessageContext, useMessageContext };
