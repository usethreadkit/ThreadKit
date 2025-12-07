import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { UserHoverCard } from '../src/components/UserHoverCard';
import type { UserProfile } from '../src/types';

describe('UserHoverCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('basic rendering', () => {
    it('renders children', () => {
      render(
        <UserHoverCard userName="testuser" userId="user-1">
          <span>Test User</span>
        </UserHoverCard>
      );
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('renders trigger with correct class', () => {
      render(
        <UserHoverCard userName="testuser" userId="user-1">
          <span>Test User</span>
        </UserHoverCard>
      );
      const trigger = screen.getByText('Test User').parentElement;
      expect(trigger).toHaveClass('threadkit-username-trigger');
    });

    it('does not show card initially', () => {
      render(
        <UserHoverCard userName="testuser" userId="user-1">
          <span>Test User</span>
        </UserHoverCard>
      );
      expect(document.querySelector('.threadkit-hover-card')).not.toBeInTheDocument();
    });
  });

  describe('hover behavior', () => {
    it('shows card after hover delay', async () => {
      render(
        <UserHoverCard userName="testuser" userId="user-1">
          <span>Test User</span>
        </UserHoverCard>
      );

      const trigger = screen.getByText('Test User').parentElement!;

      fireEvent.mouseEnter(trigger);

      // Card should not be visible immediately
      expect(document.querySelector('.threadkit-hover-card')).not.toBeInTheDocument();

      // Advance timer by 300ms (the delay)
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(document.querySelector('.threadkit-hover-card')).toBeInTheDocument();
    });

    it('hides card after mouse leave with delay', async () => {
      render(
        <UserHoverCard userName="testuser" userId="user-1">
          <span>Test User</span>
        </UserHoverCard>
      );

      const trigger = screen.getByText('Test User').parentElement!;

      // Show the card
      fireEvent.mouseEnter(trigger);
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(document.querySelector('.threadkit-hover-card')).toBeInTheDocument();

      // Mouse leave
      fireEvent.mouseLeave(trigger);

      // Should still be visible during delay
      expect(document.querySelector('.threadkit-hover-card')).toBeInTheDocument();

      // After delay, should be hidden
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(document.querySelector('.threadkit-hover-card')).not.toBeInTheDocument();
    });

    it('cancels hide when re-entering trigger', async () => {
      render(
        <UserHoverCard userName="testuser" userId="user-1">
          <span>Test User</span>
        </UserHoverCard>
      );

      const trigger = screen.getByText('Test User').parentElement!;

      // Show the card
      fireEvent.mouseEnter(trigger);
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(document.querySelector('.threadkit-hover-card')).toBeInTheDocument();

      // Start leaving
      fireEvent.mouseLeave(trigger);
      act(() => {
        vi.advanceTimersByTime(50); // Partial delay
      });

      // Re-enter before hide completes
      fireEvent.mouseEnter(trigger);
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Card should still be visible
      expect(document.querySelector('.threadkit-hover-card')).toBeInTheDocument();
    });

    it('keeps card visible when hovering over the card itself', async () => {
      render(
        <UserHoverCard userName="testuser" userId="user-1">
          <span>Test User</span>
        </UserHoverCard>
      );

      const trigger = screen.getByText('Test User').parentElement!;

      // Show the card
      fireEvent.mouseEnter(trigger);
      act(() => {
        vi.advanceTimersByTime(300);
      });

      const card = document.querySelector('.threadkit-hover-card')!;

      // Leave trigger
      fireEvent.mouseLeave(trigger);

      // Enter card before hide delay
      fireEvent.mouseEnter(card);

      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Card should still be visible
      expect(document.querySelector('.threadkit-hover-card')).toBeInTheDocument();
    });

    it('hides card when leaving the card', async () => {
      render(
        <UserHoverCard userName="testuser" userId="user-1">
          <span>Test User</span>
        </UserHoverCard>
      );

      const trigger = screen.getByText('Test User').parentElement!;

      // Show the card
      fireEvent.mouseEnter(trigger);
      act(() => {
        vi.advanceTimersByTime(300);
      });

      const card = document.querySelector('.threadkit-hover-card')!;

      // Enter then leave card
      fireEvent.mouseEnter(card);
      fireEvent.mouseLeave(card);

      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(document.querySelector('.threadkit-hover-card')).not.toBeInTheDocument();
    });
  });

  describe('profile data', () => {
    it('displays custom profile data from getUserProfile', async () => {
      const customProfile: UserProfile = {
        id: 'user-1',
        name: 'Custom Name',
        avatar: 'https://example.com/avatar.png',
        karma: 12345,
        totalComments: 678,
        joinDate: new Date('2023-06-15').getTime(),
      };

      const getUserProfile = vi.fn().mockReturnValue(customProfile);

      render(
        <UserHoverCard userName="testuser" userId="user-1" getUserProfile={getUserProfile}>
          <span>Test User</span>
        </UserHoverCard>
      );

      const trigger = screen.getByText('Test User').parentElement!;
      fireEvent.mouseEnter(trigger);
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(getUserProfile).toHaveBeenCalledWith('user-1');
      expect(screen.getByText('Custom Name')).toBeInTheDocument();
      expect(screen.getByText('12.3K')).toBeInTheDocument(); // formatted karma
      expect(screen.getByText('678')).toBeInTheDocument(); // totalComments
      expect(screen.getByText('Joined Jun 15, 2023')).toBeInTheDocument();
    });

    it('displays default mock profile when getUserProfile not provided', async () => {
      render(
        <UserHoverCard userName="testuser" userId="user-1">
          <span>Test User</span>
        </UserHoverCard>
      );

      const trigger = screen.getByText('Test User').parentElement!;
      fireEvent.mouseEnter(trigger);
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText(/karma/i)).toBeInTheDocument();
      expect(screen.getByText(/comments/i)).toBeInTheDocument();
    });

    it('displays default mock profile when getUserProfile returns undefined', async () => {
      const getUserProfile = vi.fn().mockReturnValue(undefined);

      render(
        <UserHoverCard userName="testuser" userId="user-1" getUserProfile={getUserProfile}>
          <span>Test User</span>
        </UserHoverCard>
      );

      const trigger = screen.getByText('Test User').parentElement!;
      fireEvent.mouseEnter(trigger);
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    it('displays avatar image', async () => {
      const customProfile: UserProfile = {
        id: 'user-1',
        name: 'Test User',
        avatar: 'https://example.com/avatar.png',
        karma: 100,
        totalComments: 10,
        joinDate: Date.now(),
      };

      const getUserProfile = vi.fn().mockReturnValue(customProfile);

      render(
        <UserHoverCard userName="testuser" userId="user-1" getUserProfile={getUserProfile}>
          <span>Test User</span>
        </UserHoverCard>
      );

      const trigger = screen.getByText('Test User').parentElement!;
      fireEvent.mouseEnter(trigger);
      act(() => {
        vi.advanceTimersByTime(300);
      });

      const img = screen.getByAltText('Test User');
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.png');
    });
  });

  describe('number formatting', () => {
    it('formats numbers in thousands with K suffix', async () => {
      const customProfile: UserProfile = {
        id: 'user-1',
        name: 'Test',
        avatar: '',
        karma: 5500,
        totalComments: 1234,
        joinDate: Date.now(),
      };

      const getUserProfile = vi.fn().mockReturnValue(customProfile);

      render(
        <UserHoverCard userName="test" userId="user-1" getUserProfile={getUserProfile}>
          <span>Test</span>
        </UserHoverCard>
      );

      const trigger = screen.getByText('Test').parentElement!;
      fireEvent.mouseEnter(trigger);
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(screen.getByText('5.5K')).toBeInTheDocument();
      expect(screen.getByText('1.2K')).toBeInTheDocument();
    });

    it('formats numbers in millions with M suffix', async () => {
      const customProfile: UserProfile = {
        id: 'user-1',
        name: 'Test',
        avatar: '',
        karma: 2500000,
        totalComments: 1000000,
        joinDate: Date.now(),
      };

      const getUserProfile = vi.fn().mockReturnValue(customProfile);

      render(
        <UserHoverCard userName="test" userId="user-1" getUserProfile={getUserProfile}>
          <span>Test</span>
        </UserHoverCard>
      );

      const trigger = screen.getByText('Test').parentElement!;
      fireEvent.mouseEnter(trigger);
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(screen.getByText('2.5M')).toBeInTheDocument();
      expect(screen.getByText('1.0M')).toBeInTheDocument();
    });

    it('displays small numbers without formatting', async () => {
      const customProfile: UserProfile = {
        id: 'user-1',
        name: 'Test',
        avatar: '',
        karma: 999,
        totalComments: 42,
        joinDate: Date.now(),
      };

      const getUserProfile = vi.fn().mockReturnValue(customProfile);

      render(
        <UserHoverCard userName="test" userId="user-1" getUserProfile={getUserProfile}>
          <span>Test</span>
        </UserHoverCard>
      );

      const trigger = screen.getByText('Test').parentElement!;
      fireEvent.mouseEnter(trigger);
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(screen.getByText('999')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  describe('card positioning', () => {
    it('positions card above trigger element', async () => {
      // Mock getBoundingClientRect
      const mockGetBoundingClientRect = vi.fn().mockReturnValue({
        top: 200,
        left: 100,
        width: 80,
        height: 20,
      });

      render(
        <UserHoverCard userName="testuser" userId="user-1">
          <span>Test User</span>
        </UserHoverCard>
      );

      const trigger = screen.getByText('Test User').parentElement!;
      trigger.getBoundingClientRect = mockGetBoundingClientRect;

      fireEvent.mouseEnter(trigger);
      act(() => {
        vi.advanceTimersByTime(300);
      });

      const card = document.querySelector('.threadkit-hover-card') as HTMLElement;
      expect(card.style.position).toBe('fixed');
      // bottom = window.innerHeight - 200 (rect.top) + 8
      const expectedBottom = window.innerHeight - 200 + 8;
      expect(card.style.bottom).toBe(`${expectedBottom}px`);
      expect(card.style.left).toBe('100px');
    });
  });

  describe('cleanup', () => {
    it('cleans up timeout on unmount', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount } = render(
        <UserHoverCard userName="testuser" userId="user-1">
          <span>Test User</span>
        </UserHoverCard>
      );

      const trigger = screen.getByText('Test User').parentElement!;
      fireEvent.mouseEnter(trigger);

      // Unmount before timeout fires
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});
