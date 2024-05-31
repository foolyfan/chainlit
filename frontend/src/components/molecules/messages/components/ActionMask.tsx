import { memo, useEffect, useState } from 'react';

import { Stack } from '@mui/material';

export const ActionMask = memo(
  ({ show, onClick }: { show: boolean; onClick?: () => void }) => {
    const [showOverlay, setShowOverlay] = useState<boolean>(false);

    useEffect(() => {
      setShowOverlay(show);
    }, [show]);
    return showOverlay ? (
      <Stack
        position="absolute"
        top={0}
        left={0}
        width="100%"
        height="100%"
        bgcolor="rgba(232, 232, 232, 0.3)"
        zIndex={1300}
        alignItems="center"
        justifyContent="center"
        onClick={onClick}
        borderRadius={1}
      ></Stack>
    ) : null;
  }
);
