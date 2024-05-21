import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect
} from 'react';
import { useRecoilValue } from 'recoil';

import { IProjectSettings } from './types/config';

import { speechPromptsState } from './state';
import { audioPlayer, localTextToSpeech } from './utils/speech';

interface ChatProviderProps {
  children: ReactNode;
  chatSettings: IProjectSettings | undefined;
}
interface ChatContextType {
  stopPlayer: () => void;
}
const ChatContext = createContext<ChatContextType | undefined>(undefined);

const ChatProvider: React.FC<ChatProviderProps> = ({
  children,
  chatSettings
}) => {
  const speechPrompt = useRecoilValue(speechPromptsState);
  useEffect(() => {
    if (chatSettings?.features.text_to_speech?.params && speechPrompt) {
      // const localSrcs = [
      //   textToSpeech(
      //     speechPrompt.content!,
      //     chatSettings?.features.text_to_speech?.params
      //   )
      // ];
      // audioPlayer.start(localSrcs);
      // return () => {
      //   audioPlayer.stop();
      // };
      localTextToSpeech(
        speechPrompt.content!,
        chatSettings?.features.text_to_speech?.params
      );
    }
  }, [speechPrompt]);

  const stopPlayer = useCallback(() => {
    audioPlayer.stop();
  }, []);

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
