import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, getDefaultShortcuts } from '../src/hooks/useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('basic shortcuts', () => {
    it('calls handler when shortcut key is pressed', () => {
      const handler = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          shortcuts: [{ key: 'a', handler }],
        })
      );

      const event = new KeyboardEvent('keydown', { key: 'a' });
      window.dispatchEvent(event);

      expect(handler).toHaveBeenCalled();
    });

    it('matches keys case-insensitively', () => {
      const handler = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          shortcuts: [{ key: 'A', handler }],
        })
      );

      const event = new KeyboardEvent('keydown', { key: 'a' });
      window.dispatchEvent(event);

      expect(handler).toHaveBeenCalled();
    });

    it('does not call handler for non-matching key', () => {
      const handler = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          shortcuts: [{ key: 'a', handler }],
        })
      );

      const event = new KeyboardEvent('keydown', { key: 'b' });
      window.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('modifier keys', () => {
    it('matches Ctrl modifier', () => {
      const handler = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          shortcuts: [{ key: 's', ctrl: true, handler }],
        })
      );

      // Without Ctrl - should not match
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
      expect(handler).not.toHaveBeenCalled();

      // With Ctrl - should match
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
      expect(handler).toHaveBeenCalled();
    });

    it('matches Meta key as Ctrl (for Mac)', () => {
      const handler = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          shortcuts: [{ key: 's', ctrl: true, handler }],
        })
      );

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true }));
      expect(handler).toHaveBeenCalled();
    });

    it('matches Alt modifier', () => {
      const handler = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          shortcuts: [{ key: 'a', alt: true, handler }],
        })
      );

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(handler).not.toHaveBeenCalled();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', altKey: true }));
      expect(handler).toHaveBeenCalled();
    });

    it('matches Shift modifier', () => {
      const handler = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          shortcuts: [{ key: 'a', shift: true, handler }],
        })
      );

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(handler).not.toHaveBeenCalled();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', shiftKey: true }));
      expect(handler).toHaveBeenCalled();
    });

    it('matches multiple modifiers', () => {
      const handler = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          shortcuts: [{ key: 's', ctrl: true, shift: true, handler }],
        })
      );

      // Only Ctrl - should not match
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
      expect(handler).not.toHaveBeenCalled();

      // Both Ctrl and Shift - should match
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, shiftKey: true }));
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('input field handling', () => {
    it('ignores shortcuts when typing in input', () => {
      const handler = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          shortcuts: [{ key: 'a', handler }],
        })
      );

      const input = document.createElement('input');
      document.body.appendChild(input);

      const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
      Object.defineProperty(event, 'target', { value: input });
      window.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();

      document.body.removeChild(input);
    });

    it('ignores shortcuts when typing in textarea', () => {
      const handler = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          shortcuts: [{ key: 'a', handler }],
        })
      );

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
      Object.defineProperty(event, 'target', { value: textarea });
      window.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();

      document.body.removeChild(textarea);
    });

    it('ignores shortcuts in contentEditable', () => {
      const handler = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          shortcuts: [{ key: 'a', handler }],
        })
      );

      const div = document.createElement('div');
      div.contentEditable = 'true';
      document.body.appendChild(div);

      // Create event with target as contentEditable element
      const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
      // Mock isContentEditable property on target
      const mockTarget = { ...div, isContentEditable: true };
      Object.defineProperty(event, 'target', { value: mockTarget, writable: false });
      window.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();

      document.body.removeChild(div);
    });

    it('allows Escape key in input fields', () => {
      const handler = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          shortcuts: [{ key: 'Escape', handler }],
        })
      );

      const input = document.createElement('input');
      document.body.appendChild(input);

      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      Object.defineProperty(event, 'target', { value: input });
      window.dispatchEvent(event);

      expect(handler).toHaveBeenCalled();

      document.body.removeChild(input);
    });
  });

  describe('enabled option', () => {
    it('does not register shortcuts when disabled', () => {
      const handler = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          enabled: false,
          shortcuts: [{ key: 'a', handler }],
        })
      );

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(handler).not.toHaveBeenCalled();
    });

    it('removes event listener when disabled', () => {
      const handler = vi.fn();

      const { rerender } = renderHook(
        ({ enabled }) =>
          useKeyboardShortcuts({
            enabled,
            shortcuts: [{ key: 'a', handler }],
          }),
        { initialProps: { enabled: true } }
      );

      // Initially enabled
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(handler).toHaveBeenCalledTimes(1);

      // Disable
      rerender({ enabled: false });

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
    });
  });

  describe('preventDefault', () => {
    it('prevents default when shortcut matches', () => {
      const handler = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          shortcuts: [{ key: 'a', handler }],
        })
      );

      const event = new KeyboardEvent('keydown', { key: 'a' });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('multiple shortcuts', () => {
    it('matches correct shortcut from multiple', () => {
      const handlerA = vi.fn();
      const handlerB = vi.fn();

      renderHook(() =>
        useKeyboardShortcuts({
          shortcuts: [
            { key: 'a', handler: handlerA },
            { key: 'b', handler: handlerB },
          ],
        })
      );

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));

      expect(handlerA).not.toHaveBeenCalled();
      expect(handlerB).toHaveBeenCalled();
    });
  });
});

describe('getDefaultShortcuts', () => {
  it('returns empty array when no actions provided', () => {
    const shortcuts = getDefaultShortcuts({});
    expect(shortcuts).toEqual([]);
  });

  it('creates focusInput shortcut', () => {
    const focusInput = vi.fn();
    const shortcuts = getDefaultShortcuts({ focusInput });

    expect(shortcuts).toHaveLength(1);
    expect(shortcuts[0].key).toBe('c');
    expect(shortcuts[0].description).toBe('Focus comment input');

    shortcuts[0].handler();
    expect(focusInput).toHaveBeenCalled();
  });

  it('creates nextComment shortcut', () => {
    const nextComment = vi.fn();
    const shortcuts = getDefaultShortcuts({ nextComment });

    expect(shortcuts).toHaveLength(1);
    expect(shortcuts[0].key).toBe('j');
    expect(shortcuts[0].description).toBe('Next comment');
  });

  it('creates prevComment shortcut', () => {
    const prevComment = vi.fn();
    const shortcuts = getDefaultShortcuts({ prevComment });

    expect(shortcuts).toHaveLength(1);
    expect(shortcuts[0].key).toBe('k');
    expect(shortcuts[0].description).toBe('Previous comment');
  });

  it('creates multiple shortcuts when multiple actions provided', () => {
    const shortcuts = getDefaultShortcuts({
      focusInput: vi.fn(),
      nextComment: vi.fn(),
      prevComment: vi.fn(),
    });

    expect(shortcuts).toHaveLength(3);
  });
});
