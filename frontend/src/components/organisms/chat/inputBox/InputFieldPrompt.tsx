import { Box, Fade, Paper, Popper, Typography } from '@mui/material';

interface Props {
  anchorEl: HTMLDivElement;
  content: string;
}

const InputFieldPrompt = ({ anchorEl, content }: Props) => {
  return (
    <Popper
      open={true}
      anchorEl={anchorEl}
      disablePortal={false}
      placement="top"
      transition
      modifiers={[
        {
          name: 'arrow',
          enabled: true
        },
        {
          name: 'offset',
          options: {
            offset: [0, 10] // 垂直向上偏移 8px
          }
        }
      ]}
      sx={{
        '& > div': {
          boxShadow: 'none !important'
        }
      }}
    >
      {({ TransitionProps }) => (
        <>
          <Fade {...TransitionProps} timeout={350}>
            <Paper>
              <Typography sx={{ p: 2 }}>{content}</Typography>
            </Paper>
          </Fade>
          <Box
            id="arrow"
            data-popper-arrow
            sx={{
              bottom: '-0.75em',
              width: '1.5em',
              height: '0.75em',
              '&::before': {
                position: 'absolute',
                width: '0.75em',
                height: '0.75em',
                top: '0',
                left: '50%',
                'z-index': -1,
                transform: 'translate(-50%, -50%) rotate(45deg)',
                background: (theme) => theme.palette.background.paper,
                color: '#ffffff',
                content: '""'
              }
            }}
          ></Box>
        </>
      )}
    </Popper>
  );
};

export { InputFieldPrompt };
