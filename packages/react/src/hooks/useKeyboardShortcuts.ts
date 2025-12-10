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
  editComment?: () => void;
  replyToComment?: () => void;
  deleteComment?: () => void;
  confirmYes?: () => void;
  confirmNo?: () => void;
  cancelAction?: () => void;
  upvote?: () => void;
  downvote?: () => void;
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
      key: '-',
      handler: actions.collapseAll,
      description: 'Collapse focused comment',
    });
  }

  if (actions.expandAll) {
    shortcuts.push({
      key: '=',
      handler: actions.expandAll,
      description: 'Expand focused comment',
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

  if (actions.editComment) {
    shortcuts.push({
      key: 'e',
      handler: actions.editComment,
      description: 'Edit focused comment',
    });
  }

  if (actions.replyToComment) {
    shortcuts.push({
      key: 'r',
      handler: actions.replyToComment,
      description: 'Reply to focused comment',
    });
  }

  if (actions.deleteComment) {
    shortcuts.push({
      key: 'd',
      handler: actions.deleteComment,
      description: 'Delete focused comment',
    });
  }

  if (actions.confirmYes) {
    shortcuts.push({
      key: 'y',
      handler: actions.confirmYes,
      description: 'Confirm yes',
    });
  }

  if (actions.confirmNo) {
    shortcuts.push({
      key: 'n',
      handler: actions.confirmNo,
      description: 'Confirm no',
    });
  }

  if (actions.cancelAction) {
    shortcuts.push({
      key: 'Escape',
      handler: actions.cancelAction,
      description: 'Cancel/close',
    });
  }

  if (actions.upvote) {
    shortcuts.push({
      key: 'f',
      handler: actions.upvote,
      description: 'Upvote focused comment',
    });
  }

  if (actions.downvote) {
    shortcuts.push({
      key: 's',
      handler: actions.downvote,
      description: 'Downvote focused comment',
    });
  }

  return shortcuts;
}
