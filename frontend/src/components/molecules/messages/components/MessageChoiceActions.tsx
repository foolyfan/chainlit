import { MessageContext } from 'contexts/MessageContext';
import { useContext, useEffect, useState } from 'react';

import { List, ListItemButton, ListItemText } from '@mui/material';

import type { IChoiceAction, IChoiceLayout, IStep } from 'client-types/';

interface Props {
  message: IStep;
  choiceActions: IChoiceAction[];
  layout?: IChoiceLayout[];
}

export const MessageChoiceActions = ({
  message,
  choiceActions,
  layout
}: Props) => {
  const [scopedActions, setScopedActions] = useState<IChoiceAction[]>([]);
  useEffect(() => {
    console.log('创建');
    setScopedActions(
      choiceActions.filter((a) => {
        if (a.forId) {
          return a.forId === message.id;
        }
        return true;
      })
    );
    return () => {
      console.log('销毁');
    };
  }, []);

  const show = scopedActions;

  if (!show) {
    return null;
  }

  const RowData = ({
    action,
    rowNum
  }: {
    action: IChoiceAction;
    rowNum: number;
  }) => {
    const { askUser, loading } = useContext(MessageContext);
    const isAskingAction = askUser?.spec.type === 'choice_action';
    const isDisabled =
      isAskingAction && !askUser?.spec.keys?.includes(action.id);
    const handleClick = () => {
      if (isAskingAction) {
        askUser?.callback({
          id: action.id,
          forId: action.forId,
          type: 'click',
          value: action.id
        });
      } else {
        action.onClick();
      }
    };
    return (
      <ListItemButton
        divider
        sx={{ bgcolor: 'white' }}
        onClick={handleClick}
        disabled={loading || isDisabled}
      >
        <ListItemText primary={rowNum} sx={{ width: `10%`, flexGrow: 0 }} />
        {layout?.map((item) => (
          <ListItemText
            primary={action.data[item.field]}
            sx={{ width: `${item.width}%`, flexGrow: 0 }}
          />
        ))}
      </ListItemButton>
    );
  };

  return (
    <List sx={{ width: '100%' }}>
      {scopedActions.map((action, index) => {
        return <RowData action={action} rowNum={index + 1} />;
      })}
    </List>
  );
};
