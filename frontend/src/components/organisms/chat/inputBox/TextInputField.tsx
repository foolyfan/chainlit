import {
  ChangeEvent,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';

import { InputAdornment, TextField } from '@mui/material';

import { IRule } from '@chainlit/react-client';

import { useRules } from 'hooks/useRules';

import { InputFieldPrompt } from './InputFieldPrompt';
import { SubmitButton } from './SubmitButton';

interface Props {
  placeholder?: string;
  disabled?: boolean;
  onChange: (e: any) => void;
  onFocus?: () => void;
  value: string;
  onSubmit: () => void;
  rules?: Array<IRule>;
}

export const TextInputField = forwardRef<HTMLDivElement | undefined, Props>(
  (
    { placeholder, disabled, onChange, value, onFocus, onSubmit, rules },
    ref
  ) => {
    const innerRef = useRef<HTMLDivElement | null>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [innerValue, setInnerValue] = useState<string>('');
    const { validateSubmit, validateChange, error, helperText } = useRules(
      innerValue,
      rules
    );
    const onInnerChange = useCallback(
      (value: string) => {
        if (value) {
          validateChange(value);
        }
        setInnerValue(value);
        onChange(value);
      },
      [validateChange]
    );
    const handleChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        onInnerChange(e.target.value);
      },
      [onInnerChange]
    );

    const handleSubmit = useCallback(() => {
      if (validateSubmit(value)) {
        onSubmit();
      }
    }, [validateSubmit, onSubmit]);

    useEffect(() => {
      onInnerChange(value);
    }, [value, onInnerChange]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          if (!isComposing) {
            e.preventDefault();
            if (!error && validateSubmit(innerValue)) {
              onSubmit();
            }
          }
        }
      },
      [innerValue, error]
    );

    return (
      <>
        {innerRef.current && error ? (
          <InputFieldPrompt anchorEl={innerRef.current} content={helperText} />
        ) : null}
        <TextField
          ref={innerRef}
          inputRef={ref}
          type="text"
          id="chat-input"
          multiline
          variant="standard"
          autoComplete="false"
          placeholder={placeholder}
          disabled={disabled}
          error={error}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onCompositionEnd={() => setIsComposing(false)}
          onCompositionStart={() => setIsComposing(true)}
          value={innerValue}
          fullWidth
          onFocus={onFocus}
          InputProps={{
            disableUnderline: true,
            startAdornment: (
              <InputAdornment
                sx={{ ml: 1, color: 'text.secondary' }}
                position="start"
              />
            ),
            endAdornment: (
              <SubmitButton
                onSubmit={handleSubmit}
                disabled={disabled || !innerValue || error}
              />
            )
          }}
        />
      </>
    );
  }
);

TextInputField.displayName = 'TextInputField';
