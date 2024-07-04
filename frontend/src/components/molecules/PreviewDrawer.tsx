import ClearIcon from '@mui/icons-material/Clear';
import { Box, IconButton, styled } from '@mui/material';
import Drawer from '@mui/material/Drawer';

import { ContentDrawer } from 'components/atoms/ContentDrawer';

interface Props {
  contentUrl: string;
  onClose: () => void;
  display: string;
}

const PreviewDrawer = ({ contentUrl, onClose, display }: Props) => {
  const DrawerHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: theme.spacing(1, 1)
  }));
  return (
    <Drawer anchor="bottom" open={true} onClose={onClose}>
      <DrawerHeader>
        <IconButton onClick={onClose} sx={{ padding: '0' }}>
          <ClearIcon></ClearIcon>
        </IconButton>
      </DrawerHeader>
      <Box
        sx={{
          padding: (theme) => theme.spacing(0, 1),
          maxHeight: '80vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          marginBottom: '16px'
        }}
      >
        <ContentDrawer src={contentUrl} display={display} />
      </Box>
    </Drawer>
  );
};

export { PreviewDrawer };
