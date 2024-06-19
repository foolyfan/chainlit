import { forwardRef, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InputAdornment, TextField } from '@mui/material';

import { SubmitButton } from './SubmitButton';

interface Props {
  disabled?: boolean;
  onChange: (e: string) => void;
  onCompositionStart?: () => void;
  onCompositionEnd?: () => void;
  onFocus?: () => void;
  value: string;
  onSubmit: () => void;
}

const DefaultInputField = forwardRef<HTMLDivElement | undefined, Props>(
  ({ disabled, onChange, value, onFocus, onSubmit }, ref) => {
    const { t } = useTranslation();
    const [isComposing, setIsComposing] = useState(false);
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          if (!isComposing) {
            e.preventDefault();
            onSubmit();
          }
        }
      },
      [value]
    );
    return (
      <TextField
        inputRef={ref}
        id="chat-input"
        autoFocus
        multiline
        variant="standard"
        autoComplete="false"
        placeholder={t('components.organisms.chat.inputBox.input.placeholder')}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onCompositionEnd={() => setIsComposing(false)}
        onCompositionStart={() => setIsComposing(true)}
        value={value}
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
            <SubmitButton onSubmit={onSubmit} disabled={disabled || !value} />
          )
        }}
      />
    );
  }
);

export { DefaultInputField };
