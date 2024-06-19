import { useCallback, useEffect, useState } from 'react';

import { IRule } from '@chainlit/react-client';

type RuleFunction = (value: string) => boolean | string;

const useRules = (value: string, rules?: Array<IRule>) => {
  const [submitRules, setSubmitRules] = useState<Array<RuleFunction>>([]);
  const [changeRules, setChangeRules] = useState<Array<RuleFunction>>([]);
  const [error, setError] = useState(false);
  const [helperText, setHelperText] = useState('');
  useEffect(() => {
    if (rules && rules.length) {
      const sr: Array<RuleFunction> = [];
      const cr: Array<RuleFunction> = [];
      rules.forEach((rule) => {
        if (rule.condition == 'onSubmit') {
          sr.push(new Function('value', rule.body) as RuleFunction);
        }
        if (rule.condition == 'onChange') {
          cr.push(new Function('value', rule.body) as RuleFunction);
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
        (rule) => typeof rule(innerValue) === 'string'
      );

      if (result) {
        setError(true);
        setHelperText(result(innerValue) as string);
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
        (rule) => typeof rule(innerValue) === 'string'
      );
      if (result) {
        setError(true);
        setHelperText(result(innerValue) as string);
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
