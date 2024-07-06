import { Chainlit } from './utils/chainlit';

export {};

/**
 * Enables using the findLast method on arrays.
 */
declare global {
  interface Window {
    __chainlit__: Chainlit;
  }
}
