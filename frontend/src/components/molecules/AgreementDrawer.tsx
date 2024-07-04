import ClearIcon from '@mui/icons-material/Clear';
import { Box, Button, IconButton, styled } from '@mui/material';
import Drawer from '@mui/material/Drawer';

import { ContentDrawer } from 'components/atoms/ContentDrawer';

interface Props {
  contentUrl: string;
  onClose: () => void;
  display: string;
}

const AgreementDrawer = ({ contentUrl, onClose, display }: Props) => {
  const DrawerHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: theme.spacing(1, 1)
  }));
  const DrawerFooter = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(1, 1)
  }));
  return (
    <Drawer
      anchor="bottom"
      open={true}
      onClose={onClose}
      sx={{ maxHeight: '70%' }}
    >
      <DrawerHeader>
        <IconButton onClick={onClose} sx={{ padding: '0' }}>
          <ClearIcon></ClearIcon>
        </IconButton>
      </DrawerHeader>
      <Box sx={{ padding: (theme) => theme.spacing(0, 1) }}>
        <ContentDrawer src={contentUrl} display={display} />
      </Box>

      <DrawerFooter>
        <Button variant="contained" sx={{ width: '100%' }} onClick={onClose}>
          同意并签署
        </Button>
      </DrawerFooter>
    </Drawer>
  );
};

export { AgreementDrawer };
