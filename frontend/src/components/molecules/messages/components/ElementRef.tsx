import { useMessageContext } from 'contexts/MessageContext';

import Link from '@mui/material/Link';

import type { IMessageElement } from 'client-types/';

interface Props {
  element: IMessageElement;
}

const ElementRef = ({ element }: Props) => {
  const { onElementRefClick } = useMessageContext();

  if (element.display === 'inline') {
    return <span style={{ fontWeight: 700 }}>{element.name}</span>;
  }

  return (
    <Link
      role="link"
      className="element-link"
      sx={{ cursor: 'pointer' }}
      onClick={() => onElementRefClick && onElementRefClick(element)}
    >
      {element.name}
    </Link>
  );
};

export { ElementRef };
