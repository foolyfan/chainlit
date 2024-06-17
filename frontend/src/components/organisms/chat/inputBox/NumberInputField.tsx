import { ChangeEvent, forwardRef, useEffect, useRef, useState } from 'react';

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
  onCompositionStart?: () => void;
  onCompositionEnd?: () => void;
  onFocus?: () => void;
  value: string;
  onSubmit: () => void;
  rules?: Array<IRule>;
}

export const NumberInputField = forwardRef<HTMLDivElement | undefined, Props>(
  (
    {
      placeholder,
      disabled,
      onChange,
      onKeyDown,
      onCompositionStart,
      onCompositionEnd,
      value,
      onFocus,
      onSubmit,
      rules
    },
    ref
  ) => {
    const innerRef = useRef<HTMLDivElement | null>(null);

    const [innerValue, setInnerValue] = useState<string>(value);
    const { validateSubmit, validateChange, error, helperText } = useRules(
      innerValue,
      rules
    );

    const onInnerChange = (e: ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;
      // 移除非数字和小数点的字符
      value = value.replace(/[^0-9.]/g, '');
      setInnerValue(value);
      validateChange(value);
      onChange(value);
    };

    useEffect(() => {
      setInnerValue(value);
    }, [value]);

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
          onChange={onInnerChange}
          onKeyDown={onKeyDown}
          error={error}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
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
                onSubmit={() => {
                  validateSubmit(value).then(() => {
                    onSubmit();
                  });
                }}
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
