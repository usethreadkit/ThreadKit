import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from '../src/EventEmitter';

interface TestEvents {
  message: string;
  count: number;
  data: { id: string; value: number };
}

describe('EventEmitter', () => {
  describe('on', () => {
    it('subscribes to events', () => {
      const emitter = new EventEmitter<TestEvents>();
      const handler = vi.fn();

      emitter.on('message', handler);
      emitter.emit('message', 'hello');

      expect(handler).toHaveBeenCalledWith('hello');
    });

    it('allows multiple subscriptions to the same event', () => {
      const emitter = new EventEmitter<TestEvents>();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('message', handler1);
      emitter.on('message', handler2);
      emitter.emit('message', 'hello');

      expect(handler1).toHaveBeenCalledWith('hello');
      expect(handler2).toHaveBeenCalledWith('hello');
    });

    it('returns an unsubscribe function', () => {
      const emitter = new EventEmitter<TestEvents>();
      const handler = vi.fn();

      const unsubscribe = emitter.on('message', handler);
      unsubscribe();
      emitter.emit('message', 'hello');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('removes a specific handler', () => {
      const emitter = new EventEmitter<TestEvents>();
      const handler = vi.fn();

      emitter.on('message', handler);
      emitter.off('message', handler);
      emitter.emit('message', 'hello');

      expect(handler).not.toHaveBeenCalled();
    });

    it('does nothing if handler was not subscribed', () => {
      const emitter = new EventEmitter<TestEvents>();
      const handler = vi.fn();

      // Should not throw
      emitter.off('message', handler);
    });
  });

  describe('emit', () => {
    it('emits events to all subscribers', () => {
      const emitter = new EventEmitter<TestEvents>();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('count', handler1);
      emitter.on('count', handler2);
      emitter.emit('count', 42);

      expect(handler1).toHaveBeenCalledWith(42);
      expect(handler2).toHaveBeenCalledWith(42);
    });

    it('handles complex event data', () => {
      const emitter = new EventEmitter<TestEvents>();
      const handler = vi.fn();

      emitter.on('data', handler);
      emitter.emit('data', { id: 'test', value: 123 });

      expect(handler).toHaveBeenCalledWith({ id: 'test', value: 123 });
    });

    it('continues if a handler throws', () => {
      const emitter = new EventEmitter<TestEvents>();
      const errorHandler = vi.fn(() => {
        throw new Error('test error');
      });
      const normalHandler = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      emitter.on('message', errorHandler);
      emitter.on('message', normalHandler);
      emitter.emit('message', 'hello');

      expect(errorHandler).toHaveBeenCalledWith('hello');
      expect(normalHandler).toHaveBeenCalledWith('hello');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('does nothing if no handlers are subscribed', () => {
      const emitter = new EventEmitter<TestEvents>();

      // Should not throw
      emitter.emit('message', 'hello');
    });
  });

  describe('removeAllListeners', () => {
    it('removes all listeners for a specific event', () => {
      const emitter = new EventEmitter<TestEvents>();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('message', handler1);
      emitter.on('count', handler2);
      emitter.removeAllListeners('message');

      emitter.emit('message', 'hello');
      emitter.emit('count', 42);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith(42);
    });

    it('removes all listeners when no event specified', () => {
      const emitter = new EventEmitter<TestEvents>();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on('message', handler1);
      emitter.on('count', handler2);
      emitter.removeAllListeners();

      emitter.emit('message', 'hello');
      emitter.emit('count', 42);

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('returns the number of listeners for an event', () => {
      const emitter = new EventEmitter<TestEvents>();

      expect(emitter.listenerCount('message')).toBe(0);

      emitter.on('message', () => {});
      expect(emitter.listenerCount('message')).toBe(1);

      emitter.on('message', () => {});
      expect(emitter.listenerCount('message')).toBe(2);
    });

    it('returns 0 for unregistered events', () => {
      const emitter = new EventEmitter<TestEvents>();
      expect(emitter.listenerCount('message')).toBe(0);
    });
  });
});
