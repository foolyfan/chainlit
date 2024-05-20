import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect
} from 'react';
import { useRecoilValue } from 'recoil';

import { speechPromptsState } from './state';
import { audioPlayer, textToSpeech } from './utils/speech';

interface ChatProviderProps {
  children: ReactNode;
}
interface ChatContextType {
  stopPlayer: () => void;
}
const ChatContext = createContext<ChatContextType | undefined>(undefined);

const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const speechPrompt = useRecoilValue(speechPromptsState);
  useEffect(() => {
    if (speechPrompt) {
      const localSrcs = [
        textToSpeech(
          speechPrompt.content!,
          speechPrompt.modelId,
          speechPrompt.language,
          speechPrompt.speakerName
        )
      ];
      audioPlayer.start(localSrcs);
      return () => {
        audioPlayer.stop();
      };
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
