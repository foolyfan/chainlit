import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import { Box } from '@mui/material';

import CardBackImg from 'assets/cardback.png';
import CardFrontImg from 'assets/cardfront.png';
import CustomCard from 'assets/customcard.png';
import FaceRecognition from 'assets/facerecognition.png';

import { IGatherCommand } from 'client-types/*';

interface Props {
  gatherCommand: IGatherCommand | undefined;
}

const CommandContainer = ({ gatherCommand }: Props) => {
  const children = (
    gatherCommand: IGatherCommand | undefined
  ): JSX.Element | null => {
    switch (gatherCommand?.spec.type) {
      case 'capture_idcard':
        return (
          <>
            <img
              src={CardBackImg}
              alt="身份证反面"
              style={{ maxWidth: '80%', height: 'auto' }}
            />
            <img
              src={CardFrontImg}
              alt="身份证正面"
              style={{ maxWidth: '80%', height: 'auto', marginTop: '180px' }}
            />
          </>
        );
      case 'face_recognition':
        return (
          <img
            src={FaceRecognition}
            alt="人脸验证"
            style={{ maxWidth: '80%', height: 'auto' }}
          />
        );
      case 'custom_card':
        return (
          <img
            src={CustomCard}
            alt="定制卡面"
            style={{ maxWidth: '80%', height: 'auto' }}
          />
        );
      case 'scan':
        return <DocumentScannerIcon sx={{ fontSize: 200 }} color="primary" />;
      default:
        return null;
    }
  };
  return (
    <Box
      position="relative"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      sx={{
        overflowY: 'auto',
        height: '100%'
      }}
    >
      {children(gatherCommand)}
    </Box>
  );
};

export { CommandContainer };
