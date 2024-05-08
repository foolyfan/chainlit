import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Stack from '@mui/material/Stack';

import type { IPreviewInfoGroupElement } from 'client-types/';

import { PreviewInfoGroupElement } from './PreviewInfoGroup';

interface Props {
  items: IPreviewInfoGroupElement[];
}

const InlinedPreviewInfoGroupList = ({ items }: Props) => (
  <Stack spacing={1}>
    {items.map((el, i) => {
      return (
        <Alert color="info" key={i} icon={false}>
          <AlertTitle>{el.name}</AlertTitle>
          <PreviewInfoGroupElement element={el} />
        </Alert>
      );
    })}
  </Stack>
);

export { InlinedPreviewInfoGroupList };
