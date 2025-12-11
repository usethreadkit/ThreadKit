import type { Comment } from './types';

interface ThreadKitDevTools {
  state: {
    comments: Comment[];
    loading: boolean;
    error: Error | null;
    pageId: string | null;
  };
  config: {
    apiUrl: string;
    projectId: string;
    url: string;
    mode: 'comments' | 'chat';
    theme: 'light' | 'dark' | 'system';
    sortBy: 'top' | 'new' | 'controversial' | 'old';
    wsEnabled: boolean;
  };
  auth: {
    user: {
      id: string;
      name: string;
      avatar?: string;
    } | null;
    token: string | null;
  };
  webSocket: {
    connected: boolean;
    presenceCount: number;
    typingUsers: string[];
  };
  events: Array<{
    type: string;
    timestamp: number;
    data: unknown;
  }>;
}

declare global {
  interface Window {
    __THREADKIT_DEVTOOLS__?: ThreadKitDevTools;
  }
}

/**
 * Initialize React DevTools integration for ThreadKit.
 * Only available in development mode.
 */
export function initDevTools(initialState: Partial<ThreadKitDevTools>) {
  if (process.env.NODE_ENV === 'development') {
    if (!window.__THREADKIT_DEVTOOLS__) {
      window.__THREADKIT_DEVTOOLS__ = {
        state: {
          comments: [],
          loading: false,
          error: null,
          pageId: null,
        },
        config: {
          apiUrl: '',
          projectId: '',
          url: '',
          mode: 'comments',
          theme: 'light',
          sortBy: 'top',
          wsEnabled: false,
        },
        auth: {
          user: null,
          token: null,
        },
        webSocket: {
          connected: false,
          presenceCount: 0,
          typingUsers: [],
        },
        events: [],
      };
    }

    // Merge with initial state
    Object.assign(window.__THREADKIT_DEVTOOLS__, initialState);

    console.log('[ThreadKit DevTools] Initialized. Access via window.__THREADKIT_DEVTOOLS__');
  }
}

/**
 * Update DevTools state (development only)
 */
export function updateDevTools(updates: Partial<ThreadKitDevTools>) {
  if (process.env.NODE_ENV === 'development' && window.__THREADKIT_DEVTOOLS__) {
    Object.assign(window.__THREADKIT_DEVTOOLS__, updates);
  }
}

/**
 * Log an event to DevTools (development only)
 */
export function logDevToolsEvent(type: string, data?: unknown) {
  if (process.env.NODE_ENV === 'development' && window.__THREADKIT_DEVTOOLS__) {
    window.__THREADKIT_DEVTOOLS__.events.push({
      type,
      timestamp: Date.now(),
      data,
    });

    // Keep only last 100 events
    if (window.__THREADKIT_DEVTOOLS__.events.length > 100) {
      window.__THREADKIT_DEVTOOLS__.events = window.__THREADKIT_DEVTOOLS__.events.slice(-100);
    }
  }
}
