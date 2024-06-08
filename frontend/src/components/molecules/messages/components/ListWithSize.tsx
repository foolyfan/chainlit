import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';

import type { IChoiceImageAction } from 'client-types/';

const ListWithSize = <T extends IChoiceImageAction>({
  elements,
  renderElement: Renderer
}: {
  elements: T[];
  renderElement: ({
    element,
    index
  }: {
    element: T;
    index: number;
  }) => JSX.Element | null;
}) => {
  return (
    <ImageList
      sx={{
        margin: 0,
        // Promote the list into its own layer in Chrome. This costs memory, but helps keeping high FPS.
        transform: 'translateZ(0)',
        width: '100%',
        maxWidth: 600
      }}
      variant="quilted"
      cols={4}
      gap={8}
    >
      {elements.map((element, i) => {
        return (
          <ImageListItem key={i} cols={2} rows={2}>
            <Renderer element={element} index={i} />
          </ImageListItem>
        );
      })}
    </ImageList>
  );
};

export { ListWithSize };
