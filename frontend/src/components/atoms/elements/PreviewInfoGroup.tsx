import { Box, Grid } from '@mui/material';

import { Markdown } from 'components/molecules/Markdown';

import { useFetch } from 'hooks/useFetch';

import { type IPreviewInfoGroupElement } from 'client-types/';

interface Props {
  element: IPreviewInfoGroupElement;
}

const PreviewInfoGroupElement = ({ element }: Props) => {
  const { data, error, isLoading } = useFetch(element.url || null);

  let content = '';

  if (isLoading) {
    content = 'Loading...';
  } else if (error) {
    content = 'An error occured';
  }
  return (
    <Box sx={{ fontFamily: (theme) => theme.typography.fontFamily }}>
      {data && data.items ? (
        <Grid container spacing={2}>
          {data.items.map((item: any, index: number) => (
            <Grid item xs={item.width == 'half' ? 6 : 12} key={index}>
              <Box>{item.label + '：' + item.value}</Box>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Markdown id={element.forId}>{content}</Markdown>
      )}
    </Box>
  );
};

export { PreviewInfoGroupElement };
