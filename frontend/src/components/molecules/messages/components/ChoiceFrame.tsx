import Box from '@mui/material/Box';

const ChoiceFrame = ({ children }: { children: React.ReactNode }) => (
  <Box
    sx={{
      p: 1,
      boxSizing: 'border-box',
      display: 'flex',
      width: '100%'
    }}
  >
    {children}
  </Box>
);

export { ChoiceFrame };
