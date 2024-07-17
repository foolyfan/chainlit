import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FC, useCallback } from 'react';

import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import { Box, Button } from '@mui/material';

import { IGatherCommand, useChatInteract } from '@chainlit/react-client';

import CardBackImg from 'assets/cardback.png';
import CardFrontImg from 'assets/cardfront.png';
import FaceRecognition from 'assets/facerecognition.png';

import { CustomCardPanel } from './CustomCardPanel';

interface Props {
  gatherCommand: IGatherCommand | undefined;
}

const CommandContainer: FC<Props> = ({ gatherCommand }: Props) => {
  const children = (gatherCommand: IGatherCommand): JSX.Element | null => {
    switch (gatherCommand.spec.type) {
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
        return <CustomCardPanel />;
      case 'scan':
        return <DocumentScannerIcon sx={{ fontSize: 200 }} color="primary" />;
      default:
        return null;
    }
  };
  // 关闭面板，默认成功
  const { replyCmdMessage } = useChatInteract();
  const onCancel = useCallback(() => {
    replyCmdMessage({
      ...gatherCommand!.spec,
      code: '00',
      msg: '客户操作成功',
      data: {}
    });
  }, [gatherCommand]);
  return gatherCommand ? (
    <Box
      position="relative"
      display="flex"
      flexDirection="column"
      sx={{
        overflowY: 'auto',
        height: '100%',
        padding: (theme) => theme.spacing(2)
      }}
    >
      <Box
        sx={{
          width: '100%',
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {children(gatherCommand)}
      </Box>
      <Button
        component="label"
        role={undefined}
        variant="outlined"
        tabIndex={-1}
        startIcon={<FontAwesomeIcon icon={faXmark} size="xl" />}
        sx={{
          width: '100%',
          marginTop: '10px'
        }}
        onClick={onCancel}
      >
        关闭
      </Button>
    </Box>
  ) : null;
};

export { CommandContainer };
