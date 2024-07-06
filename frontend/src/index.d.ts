import { Chainlit } from '@chainlit/react-client';

export {};

/**
 * Enables using the findLast method on arrays.
 */
declare global {
  interface Array<T> {
    findLast(
      predicate: (value: T, index: number, array: T[]) => unknown,
      thisArg?: any
    ): T | undefined;
  }
  interface Window {
    __chainlit__: Chainlit;
  }
}
