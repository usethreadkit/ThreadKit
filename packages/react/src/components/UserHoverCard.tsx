import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { UserProfile } from '../types';
import { useTranslation } from '../i18n';
import { Avatar } from './Avatar';
import { GuestAwareUsername } from '../utils/username';
import { SOCIAL_ICONS } from '../auth/icons';

interface UserHoverCardProps {
  userId: string;
  getUserProfile?: (userId: string) => UserProfile | undefined;
  fetchUserProfile?: (userId: string) => Promise<void>;
  children: React.ReactNode;
}

// Global pending requests tracker
let pendingProfileRequests = 0;
const MAX_CONCURRENT_PROFILE_REQUESTS = 10;

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export function UserHoverCard({
  userId,
  getUserProfile,
  fetchUserProfile,
  children,
}: UserHoverCardProps) {
  const t = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [isClickMode, setIsClickMode] = useState(false); // Track if opened by click
  const [position, setPosition] = useState<{ bottom: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const profile = getUserProfile?.(userId);

  // Check if this is an anonymous user (guest with no ID or ID starting with 'guest-' or 'anon-')
  const isAnonymous = !userId || userId.startsWith('guest-') || userId.startsWith('anon-');

  const showCard = () => {
    // Don't show card for anonymous users
    if (isAnonymous) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Limit concurrent requests to prevent excessive fetching when scrolling over many usernames
    if (fetchUserProfile && !profile && pendingProfileRequests < MAX_CONCURRENT_PROFILE_REQUESTS) {
      pendingProfileRequests++;
      fetchUserProfile(userId).finally(() => {
        pendingProfileRequests--;
      });
    }

    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        // Position above the trigger using fixed positioning
        // Calculate bottom to avoid needing the card's height
        setPosition({
          bottom: window.innerHeight - rect.top + 8,
          left: rect.left,
        });
        setIsVisible(true);
      }
    }, 300);
  };

  const hideCard = () => {
    // Don't hide if opened by click
    if (isClickMode) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Prevent body scroll when in click mode
  useEffect(() => {
    if (isClickMode && isVisible) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isClickMode, isVisible]);

  // Click outside to close in click mode
  useEffect(() => {
    if (!isClickMode || !isVisible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        cardRef.current && !cardRef.current.contains(e.target as Node)
      ) {
        setIsVisible(false);
        setIsClickMode(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isClickMode, isVisible]);

  // Don't add hover triggers for anonymous users
  if (isAnonymous) {
    return <>{children}</>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expanding parent elements

    if (isAnonymous) return;

    // Clear any pending hover timeouts to prevent both modes from showing
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Limit concurrent requests to prevent excessive fetching when scrolling over many usernames
    if (fetchUserProfile && !profile && pendingProfileRequests < MAX_CONCURRENT_PROFILE_REQUESTS) {
      pendingProfileRequests++;
      fetchUserProfile(userId).finally(() => {
        pendingProfileRequests--;
      });
    }

    // Toggle click mode
    if (isClickMode && isVisible) {
      setIsVisible(false);
      setIsClickMode(false);
    } else {
      setIsVisible(true);
      setIsClickMode(true);
    }
  };

  const skeletonCard = (
    <div className="threadkit-hover-card-content">
      <div className="threadkit-hover-card-avatar">
        <div className="threadkit-skeleton threadkit-skeleton-avatar" />
      </div>
      <div className="threadkit-hover-card-info">
        <div className="threadkit-hover-card-name">
          <div className="threadkit-skeleton threadkit-skeleton-text" style={{ width: '120px', height: '16px' }} />
        </div>
        <div className="threadkit-hover-card-stats">
          <div className="threadkit-hover-card-stat">
            <div className="threadkit-skeleton threadkit-skeleton-text" style={{ width: '40px', height: '20px', marginBottom: '4px' }} />
            <div className="threadkit-skeleton threadkit-skeleton-text" style={{ width: '50px', height: '12px' }} />
          </div>
          <div className="threadkit-hover-card-stat">
            <div className="threadkit-skeleton threadkit-skeleton-text" style={{ width: '40px', height: '20px', marginBottom: '4px' }} />
            <div className="threadkit-skeleton threadkit-skeleton-text" style={{ width: '60px', height: '12px' }} />
          </div>
        </div>
        <div className="threadkit-hover-card-joined">
          <div className="threadkit-skeleton threadkit-skeleton-text" style={{ width: '100px', height: '12px' }} />
        </div>
      </div>
    </div>
  );

  const profileCard = profile && (
    <div className="threadkit-hover-card-content">
      <div className="threadkit-hover-card-avatar">
        <Avatar
          src={profile.avatar}
          alt={profile.name}
          seed={profile.name}
        />
      </div>
      <div className="threadkit-hover-card-info">
        <div className="threadkit-hover-card-name">
          <GuestAwareUsername userName={profile.name} t={t} />
        </div>
        {profile.socialLinks && Object.values(profile.socialLinks).some(v => v) && (
          <div className="threadkit-hover-card-social-links">
            {Object.entries(profile.socialLinks).map(([platform, handle]) => {
              if (!handle) return null;
              const Icon = SOCIAL_ICONS[platform];
              if (!Icon) return null;

              const urlMap: Record<string, string> = {
                twitter: `https://twitter.com/${handle}`,
                github: `https://github.com/${handle}`,
                facebook: `https://facebook.com/${handle}`,
                whatsapp: `https://wa.me/${handle}`,
                telegram: `https://t.me/${handle}`,
                instagram: `https://instagram.com/${handle}`,
                tiktok: `https://tiktok.com/@${handle}`,
                snapchat: `https://snapchat.com/add/${handle}`,
                discord: `https://discordapp.com/users/${handle}`,
              };

              const url = urlMap[platform];
              const title = platform.charAt(0).toUpperCase() + platform.slice(1);

              return (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={title}
                  aria-label={`${title} profile`}
                  className="threadkit-social-link"
                >
                  <Icon className="threadkit-social-icon" />
                </a>
              );
            })}
          </div>
        )}
        <div className="threadkit-hover-card-stats">
          <div className="threadkit-hover-card-stat">
            <span className="threadkit-hover-card-stat-value">
              {formatNumber(profile.karma)}
            </span>
            <span className="threadkit-hover-card-stat-label">{t('karma')}</span>
          </div>
          <div className="threadkit-hover-card-stat">
            <span className="threadkit-hover-card-stat-value">
              {formatNumber(profile.totalComments)}
            </span>
            <span className="threadkit-hover-card-stat-label">{t('comments')}</span>
          </div>
        </div>
        <div className="threadkit-hover-card-joined">
          {t('joined')} {formatDate(profile.joinDate)}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={showCard}
        onMouseLeave={hideCard}
        onClick={handleClick}
        className="threadkit-username-trigger"
      >
        {children}
      </span>

      {/* Hover mode - positioned above username */}
      {isVisible && !isClickMode && position && createPortal(
        <div
          ref={cardRef}
          className="threadkit-root threadkit-hover-card"
          style={{
            position: 'fixed',
            bottom: position.bottom,
            left: position.left,
            zIndex: 1000,
          }}
          onMouseEnter={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          }}
          onMouseLeave={hideCard}
        >
          {profile ? profileCard : skeletonCard}
        </div>,
        document.body
      )}

      {/* Click mode - centered with overlay */}
      {isVisible && isClickMode && createPortal(
        <div className="threadkit-root threadkit-user-modal-overlay" onClick={() => { setIsVisible(false); setIsClickMode(false); }}>
          <div
            ref={cardRef}
            className="threadkit-root threadkit-hover-card threadkit-hover-card-centered"
            role="dialog"
            aria-modal="true"
            aria-label="User profile"
            onClick={(e) => e.stopPropagation()}
          >
            {profile ? profileCard : skeletonCard}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
