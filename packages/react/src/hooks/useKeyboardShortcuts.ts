import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  handler: () => void;
  description?: string;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  shortcuts: KeyboardShortcut[];
}

export function useKeyboardShortcuts({
  enabled = true,
  shortcuts,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        // Allow Escape key even in inputs
        if (e.key !== 'Escape') {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrl === (e.ctrlKey || e.metaKey);
        const altMatch = !!shortcut.alt === e.altKey;
        const shiftMatch = !!shortcut.shift === e.shiftKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

// Default shortcuts for ThreadKit
export function getDefaultShortcuts(actions: {
  focusInput?: () => void;
  submitComment?: () => void;
  collapseAll?: () => void;
  expandAll?: () => void;
  nextComment?: () => void;
  prevComment?: () => void;
}): KeyboardShortcut[] {
  const shortcuts: KeyboardShortcut[] = [];

  if (actions.focusInput) {
    shortcuts.push({
      key: 'c',
      handler: actions.focusInput,
      description: 'Focus comment input',
    });
  }

  if (actions.collapseAll) {
    shortcuts.push({
      key: '[',
      handler: actions.collapseAll,
      description: 'Collapse all comments',
    });
  }

  if (actions.expandAll) {
    shortcuts.push({
      key: ']',
      handler: actions.expandAll,
      description: 'Expand all comments',
    });
  }

  if (actions.nextComment) {
    shortcuts.push({
      key: 'j',
      handler: actions.nextComment,
      description: 'Next comment',
    });
  }

  if (actions.prevComment) {
    shortcuts.push({
      key: 'k',
      handler: actions.prevComment,
      description: 'Previous comment',
    });
  }

  return shortcuts;
}
