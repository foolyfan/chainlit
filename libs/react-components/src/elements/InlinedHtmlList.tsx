import Stack from '@mui/material/Stack';

import type { IHtmlElement } from 'client-types/';

import { HtmlElement } from './Html';

interface Props {
  items: IHtmlElement[];
}

const InlinedHtmlList = ({ items }: Props) => (
  <Stack spacing={1}>
    {items.map((html, i) => {
      return (
        <div
          key={i}
          style={{
            maxWidth: '600px',
            height: (html.height ? html.height : 400) + 'px'
          }}
        >
          <HtmlElement element={html} />
        </div>
      );
    })}
  </Stack>
);

export { InlinedHtmlList };
