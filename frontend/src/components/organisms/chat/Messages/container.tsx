import { useAuth } from 'api/auth';
import { memo, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import {
  IAvatarElement,
  IFeedback,
  IFunction,
  IMessageElement,
  IStep,
  ITool,
  useChatInteract
} from '@chainlit/react-client';

import { MessageContainer as CMessageContainer } from 'components/molecules/messages/MessageContainer';

import { apiClientState } from 'state/apiClient';
import { playgroundState } from 'state/playground';
import {
  highlightMessage,
  projectSettingsState,
  sideViewState
} from 'state/project';
import { settingsState } from 'state/settings';

interface Props {
  loading: boolean;
  elements: IMessageElement[];
  avatars: IAvatarElement[];
  messages: IStep[];
  autoScroll?: boolean;
  onFeedbackUpdated: (
    message: IStep,
    onSuccess: () => void,
    feedback: IFeedback
  ) => void;
  setAutoScroll?: (autoScroll: boolean) => void;
}

const MessageContainer = memo(
  ({
    loading,
    avatars,
    autoScroll,
    elements,
    messages,
    onFeedbackUpdated,
    setAutoScroll
  }: Props) => {
    const appSettings = useRecoilValue(settingsState);
    const projectSettings = useRecoilValue(projectSettingsState);
    const setPlayground = useSetRecoilState(playgroundState);
    const setSideView = useSetRecoilState(sideViewState);
    const highlightedMessage = useRecoilValue(highlightMessage);
    const { uploadFile: _uploadFile } = useChatInteract();
    const apiClient = useRecoilValue(apiClientState);

    const uploadFile = useCallback(
      (file: File, onProgress: (progress: number) => void) => {
        return _uploadFile(apiClient, file, onProgress);
      },
      [_uploadFile]
    );

    const enableFeedback = !!projectSettings?.dataPersistence;

    const navigate = useNavigate();

    const onPlaygroundButtonClick = useCallback(
      (message: IStep) => {
        setPlayground((old) => {
          const generation = message.generation;
          let functions =
            (generation?.settings?.functions as unknown as IFunction[]) || [];
          const tools =
            (generation?.settings?.tools as unknown as ITool[]) || [];
          if (tools.length) {
            functions = [
              ...functions,
              ...tools
                .filter((t) => t.type === 'function')
                .map((t) => t.function)
            ];
          }
          return {
            ...old,
            generation: generation
              ? {
                  ...generation,
                  functions
                }
              : undefined,
            originalGeneration: generation
              ? {
                  ...generation,
                  functions
                }
              : undefined
          };
        });
      },
      [setPlayground]
    );

    const onElementRefClick = useCallback(
      (element: IMessageElement) => {
        let path = `/element/${element.id}`;

        if (element.display === 'side') {
          setSideView(element);
          return;
        }

        if (element.threadId) {
          path += `?thread=${element.threadId}`;
        }

        return navigate(element.display === 'page' ? path : '#');
      },
      [setSideView, navigate]
    );
    const { user } = useAuth();
    const createUserMessage = useCallback((output: string): IStep => {
      return {
        threadId: '',
        id: uuidv4(),
        name: user?.identifier || 'User',
        type: 'user_message',
        output,
        createdAt: new Date().toISOString()
      };
    }, []);

    const onError = useCallback((error: string) => toast.error(error), [toast]);

    // Memoize the context object since it's created on each render.
    // This prevents unnecessary re-renders of children components when no props have changed.
    const memoizedContext = useMemo(() => {
      return {
        uploadFile,
        allowHtml: projectSettings?.features?.unsafe_allow_html,
        latex: projectSettings?.features?.latex,
        avatars,
        defaultCollapseContent: appSettings.defaultCollapseContent,
        expandAll: appSettings.expandAll,
        hideCot: appSettings.hideCot,
        highlightedMessage,
        loading,
        showFeedbackButtons: enableFeedback,
        uiName: projectSettings?.ui?.name || '',
        onElementRefClick,
        onError,
        onFeedbackUpdated,
        onPlaygroundButtonClick,
        createUserMessage
      };
    }, [
      appSettings.defaultCollapseContent,
      appSettings.expandAll,
      appSettings.hideCot,
      avatars,
      enableFeedback,
      highlightedMessage,
      loading,
      projectSettings?.ui?.name,
      projectSettings?.features?.unsafe_allow_html,
      onElementRefClick,
      onError,
      onFeedbackUpdated,
      onPlaygroundButtonClick,
      createUserMessage
    ]);

    return (
      <CMessageContainer
        elements={elements}
        messages={messages}
        autoScroll={autoScroll}
        setAutoScroll={setAutoScroll}
        context={memoizedContext}
      />
    );
  }
);

export default MessageContainer;
