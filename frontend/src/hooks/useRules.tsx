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
    (value: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const innerValue = value.replace(/[\n\r]/g, '');
        const result = submitRules.find(
          (rule) => typeof rule(innerValue) === 'string'
        );

        if (result) {
          setError(true);
          setHelperText(result(innerValue) as string);
          reject();
        } else {
          setError(false);
          setHelperText('');
          resolve();
        }
      });
    },
    [submitRules]
  );
  const validateChange = useCallback(
    (value: string) => {
      const innerValue = value.replace(/[\n\r]/g, '');
      const result = changeRules.find(
        (rule) => typeof rule(innerValue) === 'string'
      );
      if (result) {
        setError(true);
        setHelperText(result(innerValue) as string);
      } else {
        setError(false);
        setHelperText('');
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
