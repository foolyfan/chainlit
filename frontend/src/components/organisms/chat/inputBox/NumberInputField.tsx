import {
  ChangeEvent,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';

import { InputAdornment, TextField } from '@mui/material';

import { useRules } from 'hooks/useRules';

import { IRule } from 'client-types/*';

import { InputFieldPrompt } from './InputFieldPrompt';
import { SubmitButton } from './SubmitButton';

interface Props {
  placeholder?: string;
  disabled?: boolean;
  onChange: (e: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onFocus?: () => void;
  value: string;
  onSubmit: () => void;
  rules?: Array<IRule>;
}

export const NumberInputField = forwardRef<HTMLDivElement | undefined, Props>(
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
        // 移除非数字和小数点的字符
        value = value.replace(/[^0-9.]/g, '');
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
          inputMode="decimal"
          type="text"
          id="chat-input"
          autoFocus
          multiline
          variant="standard"
          autoComplete="false"
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          error={error}
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

NumberInputField.displayName = 'NumberInputField';
