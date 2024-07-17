import StopCircle from '@mui/icons-material/StopCircle';
import Telegram from '@mui/icons-material/Telegram';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';

import { useChatData, useChatInteract } from '@chainlit/react-client';

interface SubmitButtonProps {
  disabled?: boolean;
  onSubmit: () => void;
}

const SubmitButton = ({ disabled, onSubmit }: SubmitButtonProps) => {
  const { loading } = useChatData();
  const { stopTask } = useChatInteract();

  const handleClick = () => {
    stopTask();
  };

  return (
    <Box
      sx={{
        mr: 1,
        color: 'text.secondary'
      }}
    >
      {!loading ? (
        <IconButton disabled={disabled} color="inherit" onClick={onSubmit}>
          <Telegram />
        </IconButton>
      ) : (
        <IconButton id="stop-button" onClick={handleClick}>
          <StopCircle />
        </IconButton>
      )}
    </Box>
  );
};

export { SubmitButton };
