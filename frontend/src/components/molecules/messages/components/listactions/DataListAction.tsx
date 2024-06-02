import { List, ListItemButton, ListItemText } from '@mui/material';

import { type IChoiceAction, type IChoiceLayout } from '@chainlit/react-client';

interface Props {
  choiceActions: IChoiceAction[];
  layout?: IChoiceLayout[];
  onClick: (action: IChoiceAction) => void;
}

export const DataListAction = ({ choiceActions, layout, onClick }: Props) => {
  return (
    <List sx={{ width: '100%' }}>
      {choiceActions.map((action, index) => {
        return (
          <ListItemButton
            key={index}
            divider
            sx={{ bgcolor: 'white', marginTop: '10px' }}
            onClick={() => onClick(action)}
          >
            <ListItemText primary={index + 1} sx={{ width: 30, flexGrow: 0 }} />
            {layout?.map((item) => (
              <ListItemText
                primary={action.data[item.field]}
                sx={{ width: `${item.width}%`, flexGrow: 0, marginLeft: '5px' }}
              />
            ))}
            <ListItemText />
          </ListItemButton>
        );
      })}
    </List>
  );
};
