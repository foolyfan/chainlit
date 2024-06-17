import { ChangeEvent, forwardRef, useEffect, useRef, useState } from 'react';

import { InputAdornment, TextField } from '@mui/material';

import { IRule } from '@chainlit/react-client';

import { useRules } from 'hooks/useRules';

import { InputFieldPrompt } from './InputFieldPrompt';
import { SubmitButton } from './SubmitButton';

interface Props {
  placeholder?: string;
  disabled?: boolean;
  onChange: (e: any) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onCompositionStart?: () => void;
  onCompositionEnd?: () => void;
  onFocus?: () => void;
  value: string;
  onSubmit: () => void;
  rules?: Array<IRule>;
}

export const TextInputField = forwardRef<HTMLDivElement | undefined, Props>(
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
      validateChange(e.target.value);
      setInnerValue(e.target.value);
      onChange(e.target.value);
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
          type="text"
          id="chat-input"
          multiline
          variant="standard"
          autoComplete="false"
          placeholder={placeholder}
          disabled={disabled}
          error={error}
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

TextInputField.displayName = 'TextInputField';
