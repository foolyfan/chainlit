import { isEmpty } from 'lodash';
import {
  ReactNode,
  RefObject,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef
} from 'react';
import { useRecoilValue } from 'recoil';

import { IProjectSettings } from './types/config';

import { ChainlitAPI } from './api';
import { sessionIdState, speechPromptsState } from './state';
import { audioPlayer, localTextToSpeech } from './utils/speech';

interface ChatProviderProps {
  children: ReactNode;
  chatSettings: IProjectSettings | undefined;
  client: ChainlitAPI;
}
interface ChatContextType {
  stopPlayer: () => void;
  actionRef: React.RefObject<any>;
  setActionRef: (ref: React.RefObject<any>) => void;
}
const ChatContext = createContext<ChatContextType | undefined>(undefined);

const ChatProvider: React.FC<ChatProviderProps> = ({
  children,
  chatSettings,
  client
}) => {
  const speechPrompt = useRecoilValue(speechPromptsState);
  const sessionId = useRecoilValue(sessionIdState);
  useEffect(() => {
    if (
      chatSettings?.features.text_to_speech?.enabled &&
      speechPrompt &&
      audioPlayer
    ) {
      if (!isEmpty(speechPrompt.content)) {
        console.log('服务端tts');
        client
          .ttsMethod(speechPrompt.content, sessionId)
          .then((response) => response.arrayBuffer())
          .then((arrayBuffer) => {
            audioPlayer!.play(arrayBuffer);
          })
          .catch((error) => {
            console.log('play fail', error);
          });
      } else {
        console.log('客户端tts');
        localTextToSpeech(
          speechPrompt.content!,
          chatSettings?.features.text_to_speech?.params
        );
      }
    }
  }, [speechPrompt]);

  const stopPlayer = useCallback(() => {
    audioPlayer?.stop();
  }, []);

  const actionRef = useRef<any | undefined>(undefined);
  const setActionRef = useCallback((ref: RefObject<any>) => {
    console.log('setActionRef');

    actionRef.current = ref.current;
  }, []);

  return (
    <ChatContext.Provider value={{ stopPlayer, actionRef, setActionRef }}>
      {children}
    </ChatContext.Provider>
  );
};
const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export { useChatContext, ChatProvider };
