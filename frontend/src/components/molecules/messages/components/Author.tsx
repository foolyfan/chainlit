import { useMessageContext } from 'contexts/MessageContext';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { AvatarElement } from 'components/atoms/elements';

import { useColorForName } from 'hooks/useColors';

import type { IStep } from 'client-types/';

import { MessageTime } from './MessageTime';

interface Props {
  message: IStep;
  show?: boolean;
  children?: React.ReactNode;
}

export const AUTHOR_BOX_WIDTH = 26;

const Author = ({ message, show, children }: Props) => {
  const context = useMessageContext();
  const getColorForName = useColorForName(context.uiName);

  const isUser = message.type === 'user_message';
  const author = isUser ? '我' : message.name;

  const avatarEl = context.avatars.find((e) => e.name === author);
  const avatar = show ? (
    <Stack alignItems="center" gap={1}>
      <AvatarElement
        element={avatarEl}
        author={author}
        bgColor={getColorForName(author, isUser, message.isError)}
      />
      {(!!message.indent || message.parentId) && (
        <Box
          width="2px"
          height="100%"
          borderRadius="13px"
          bgcolor={getColorForName(author, isUser)}
        />
      )}
    </Stack>
  ) : (
    <Box width={AUTHOR_BOX_WIDTH} />
  );
  const name = (
    <Stack direction="row" gap={1} alignItems="center">
      {!isUser && avatar}
      {isUser && <MessageTime timestamp={message.createdAt} />}
      {show ? (
        <Typography
          noWrap
          sx={{
            fontSize: '1rem',
            fontWeight: 600,
            lineHeight: 'unset'
          }}
        >
          {author}
        </Typography>
      ) : null}
      {!isUser && <MessageTime timestamp={message.createdAt} />}
      {isUser && avatar}
    </Stack>
  );

  return (
    <Stack direction="row" gap={1.5} width="100%" className="hello">
      <Stack
        gap={1}
        width={isUser ? '100%' : `calc(100% - 24px)`}
        sx={{ 'align-items': isUser ? 'end' : 'start' }}
      >
        {name}
        {children}
      </Stack>
    </Stack>
  );
};

export { Author };
