import { List, ListItemButton, ListItemText } from '@mui/material';

import { type IChoiceAction, type IChoiceLayout } from '@chainlit/react-client';

interface Props {
  choiceActions: IChoiceAction[];
  layout?: IChoiceLayout[];
  onClick: (action: IChoiceAction, index?: number) => void;
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
            onClick={() => onClick(action, index + 1)}
          >
            <ListItemText primary={index + 1} sx={{ width: 30, flexGrow: 0 }} />
            {action.html ? (
              <div
                className={`test-html`}
                style={{
                  objectFit: 'cover',
                  maxWidth: '100%',
                  margin: 'auto',
                  height: 'auto',
                  display: 'block'
                }}
                dangerouslySetInnerHTML={{ __html: action.html }}
              ></div>
            ) : (
              layout?.map((item) => (
                <ListItemText
                  primary={action.data[item.field]}
                  sx={{
                    width: `${item.width}%`,
                    flexGrow: 0,
                    marginLeft: '5px'
                  }}
                />
              ))
            )}
            <ListItemText />
          </ListItemButton>
        );
      })}
    </List>
  );
};
