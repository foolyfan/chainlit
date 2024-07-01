import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';

import type { IAction } from 'client-types/';

interface ActionProps {
  action: IAction;
  margin: number | string;
  onClick?: () => void;
  disabled: boolean;
}

const ActionButton = ({ action, margin, onClick, disabled }: ActionProps) => {
  return (
    <Tooltip title={action.description} placement="top">
      <span>
        <Button
          size="small"
          variant="outlined"
          sx={[
            {
              textTransform: 'none',
              margin
            }
          ]}
          id={action.id}
          onClick={onClick}
          disabled={disabled}
        >
          {action.label || action.name}
        </Button>
      </span>
    </Tooltip>
  );
};

export { ActionButton };
