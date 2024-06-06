import { ChangeEvent, forwardRef, useEffect, useState } from 'react';

import { InputAdornment, TextField } from '@mui/material';

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
      onSubmit
    },
    ref
  ) => {
    const [innerValue, setInnerValue] = useState<string>(value);

    const onInnerChange = (e: ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;
      value = value.replace(/[^0-9]/g, '');
      setInnerValue(value);
      onChange(value);
    };

    useEffect(() => {
      setInnerValue(value);
    }, [value]);

    return (
      <TextField
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
              onSubmit={onSubmit}
              disabled={disabled || !innerValue}
            />
          )
        }}
      />
    );
  }
);
