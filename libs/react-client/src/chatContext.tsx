import { isEmpty } from 'lodash';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect
} from 'react';
import { useRecoilValue } from 'recoil';

import { IProjectSettings } from './types/config';

import { ChainlitAPI } from './api';
import { sessionIdState, speechPromptsState } from './state';
import { decodeAndConcatAudioFiles, localTextToSpeech } from './utils/speech';

interface ChatProviderProps {
  children: ReactNode;
  chatSettings: IProjectSettings | undefined;
  client: ChainlitAPI;
}
interface ChatContextType {
  stopPlayer: () => void;
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
    if (chatSettings?.features.text_to_speech?.enabled && speechPrompt) {
      if (!isEmpty(speechPrompt.chainlitKey)) {
        console.log('服务端tts');
        fetch(client.getElementUrl(speechPrompt.chainlitKey, sessionId))
          .then((response) => response.arrayBuffer())
          .then((arrayBuffer) => {
            // setSrc(URL.createObjectURL(blob));
            decodeAndConcatAudioFiles(arrayBuffer);
          })
          .catch((error) => {
            console.log(error);
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

  const stopPlayer = useCallback(() => {}, []);

  return (
    <ChatContext.Provider value={{ stopPlayer }}>
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
