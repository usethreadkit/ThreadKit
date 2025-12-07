import { createContext, useContext } from 'react';

const DebugContext = createContext<boolean>(false);

export const DebugProvider = DebugContext.Provider;

export function useDebug(): boolean {
  return useContext(DebugContext);
}

/**
 * Log a debug message if debug mode is enabled.
 * Use this as a hook-friendly alternative when you have access to the debug context.
 */
export function debugLog(debug: boolean, ...args: unknown[]): void {
  if (debug) {
    console.log(...args);
  }
}
