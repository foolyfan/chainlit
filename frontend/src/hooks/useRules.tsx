import { useCallback, useEffect, useState } from 'react';

import { IRule } from '@chainlit/react-client';

const useRules = (value: string, rules?: Array<IRule>) => {
  const [submitRules, setSubmitRules] = useState<Array<string>>([]);
  const [changeRules, setChangeRules] = useState<Array<string>>([]);
  const [error, setError] = useState(false);
  const [helperText, setHelperText] = useState('');
  useEffect(() => {
    if (rules && rules.length) {
      const sr: Array<string> = [];
      const cr: Array<string> = [];
      rules.forEach((rule) => {
        if (rule.condition == 'onSubmit') {
          sr.push(rule.name);
        }
        if (rule.condition == 'onChange') {
          cr.push(rule.name);
        }
      });
      setSubmitRules(sr);
      setChangeRules(cr);
    }
  }, [rules]);

  useEffect(() => {
    if (!value) {
      setError(false);
      setHelperText('');
    }
  }, [value]);

  const validateSubmit = useCallback(
    (value: string): boolean => {
      const innerValue = value.replace(/[\n\r]/g, '');

      const result = submitRules.find(
        (name) =>
          typeof window.__chainlit__.__rules__[name](innerValue) === 'string'
      );

      if (result) {
        setError(true);
        setHelperText(
          window.__chainlit__.__rules__[result](innerValue) as string
        );
        return false;
      } else {
        setError(false);
        setHelperText('');
        return true;
      }
    },
    [submitRules]
  );
  const validateChange = useCallback(
    (value: string): boolean => {
      const innerValue = value.replace(/[\n\r]/g, '');

      const result = changeRules.find(
        (name) =>
          typeof window.__chainlit__.__rules__[name](innerValue) === 'string'
      );
      if (result) {
        setError(true);
        setHelperText(
          window.__chainlit__.__rules__[result](innerValue) as string
        );
        return false;
      } else {
        setError(false);
        setHelperText('');
        return true;
      }
    },
    [changeRules]
  );
  return {
    validateSubmit,
    validateChange,
    error,
    helperText
  };
};

export { useRules };
