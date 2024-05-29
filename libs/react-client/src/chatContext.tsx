import { isEmpty } from 'lodash';
import {
  ReactNode,
  RefObject,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
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
  abortAudioTask: () => void;
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
  const [ttsRuning, setTtsRuning] = useState<boolean>(false);
  const ttsAbortRef = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    if (
      chatSettings?.features.text_to_speech?.enabled &&
      speechPrompt &&
      audioPlayer
    ) {
      if (!isEmpty(speechPrompt.content)) {
        abortAudioTask();
        setTtsRuning(true);
        console.log('服务端tts');
        const controller = new AbortController();
        ttsAbortRef.current = controller;
        client
          .ttsMethod(speechPrompt.content, sessionId, controller.signal)
          .then((response) => response.arrayBuffer())
          .then((arrayBuffer) => {
            console.log('音频资源加载完成');
            audioPlayer!.play(arrayBuffer);
          })
          .catch((error) => {
            console.log('play fail', error);
          })
          .finally(() => {
            setTtsRuning(false);
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

  const abortAudioTask = useCallback(() => {
    audioPlayer?.stop();
    if (ttsRuning) {
      ttsAbortRef.current?.abort('中断tts请求');
    }
  }, [ttsRuning, ttsAbortRef]);

  const actionRef = useRef<any | undefined>(undefined);
  const setActionRef = useCallback((ref: RefObject<any>) => {
    actionRef.current = ref.current;
  }, []);

  return (
    <ChatContext.Provider value={{ abortAudioTask, actionRef, setActionRef }}>
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
