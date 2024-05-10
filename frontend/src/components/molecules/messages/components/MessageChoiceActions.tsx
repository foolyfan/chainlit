import { MessageContext } from 'contexts/MessageContext';
import { useContext, useEffect, useState } from 'react';

import { Button, List, ListItemButton, ListItemText } from '@mui/material';

import {
  type IChoiceAction,
  type IChoiceLayout,
  IExternalAction,
  type IStep,
  useChatData
} from '@chainlit/react-client';

interface Props {
  message: IStep;
  choiceActions: (IChoiceAction | IExternalAction)[];
  layout?: IChoiceLayout[];
}

export const MessageChoiceActions = ({
  message,
  choiceActions,
  layout
}: Props) => {
  const [scopedActions, setScopedActions] = useState<
    (IChoiceAction | IExternalAction)[]
  >([]);
  const [externalAction, setExternalAction] = useState<IExternalAction>();
  const { askUser } = useChatData();
  useEffect(() => {
    const sArray = [];
    for (let index = 0; index < choiceActions.length; index++) {
      if (choiceActions[index].forId) {
        if (choiceActions[index].forId !== message.id) {
          continue;
        }
        // @ts-ignore
        if (choiceActions[index].external) {
          // @ts-ignore
          setExternalAction(choiceActions[index]);
          continue;
        }
      }
      sArray.push(choiceActions[index]);
    }
    setScopedActions(sArray);
  }, [choiceActions]);

  const show = scopedActions;

  if (!show) {
    return null;
  }
  const handleClick = (action: IExternalAction) => {
    console.log('askUser?.spec.type', askUser?.spec.type);
    if (askUser?.spec.type === 'choice_action') {
      askUser?.callback({
        id: action.id,
        forId: action.forId,
        type: 'click',
        value: action.id
      });
    }
  };
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
      <>
        <ListItemButton
          divider
          sx={{ bgcolor: 'white', marginTop: '10px' }}
          onClick={handleClick}
          disabled={loading || isDisabled}
        >
          <ListItemText primary={rowNum} sx={{ width: 30, flexGrow: 0 }} />
          {layout?.map((item) => (
            <ListItemText
              primary={action.data[item.field]}
              sx={{ width: `${item.width}%`, flexGrow: 0, marginLeft: '5px' }}
            />
          ))}
        </ListItemButton>
      </>
    );
  };

  return (
    <List sx={{ width: '100%' }}>
      {scopedActions.map((action, index) => {
        return <RowData action={action} rowNum={index + 1} />;
      })}
      {externalAction?.display ? (
        <Button
          variant="outlined"
          sx={{ width: '100%', marginTop: '20px' }}
          onClick={() => handleClick(externalAction)}
        >
          {externalAction.label}
        </Button>
      ) : null}
    </List>
  );
};
