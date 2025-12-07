import { useState, useRef, useEffect } from 'react';
import type { UserProfile } from '../types';
import { useTranslation } from '../i18n';

interface UserHoverCardProps {
  userName: string;
  userId: string;
  getUserProfile?: (userId: string) => UserProfile | undefined;
  children: React.ReactNode;
}

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
  userName,
  userId,
  getUserProfile,
  children,
}: UserHoverCardProps) {
  const t = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const profile = getUserProfile?.(userId);

  const showCard = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        // Position above the trigger (card height is ~100px, add 8px gap)
        const cardHeight = 100;
        setPosition({
          top: rect.top + window.scrollY - cardHeight - 8,
          left: rect.left + window.scrollX,
        });
        setIsVisible(true);
      }
    }, 300);
  };

  const hideCard = () => {
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

  // Mock profile data if not provided
  const displayProfile: UserProfile = profile || {
    id: userId,
    name: userName,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`,
    karma: Math.floor(Math.random() * 10000) + 100,
    totalComments: Math.floor(Math.random() * 500) + 10,
    joinDate: Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000),
  };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={showCard}
        onMouseLeave={hideCard}
        className="threadkit-username-trigger"
      >
        {children}
      </span>
      {isVisible && position && (
        <div
          ref={cardRef}
          className="threadkit-hover-card"
          style={{
            position: 'absolute',
            top: position.top,
            left: position.left,
            zIndex: 1000,
          }}
          onMouseEnter={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          }}
          onMouseLeave={hideCard}
        >
          <div className="threadkit-hover-card-content">
            <div className="threadkit-hover-card-avatar">
              <img
                src={displayProfile.avatar}
                alt={displayProfile.name}
              />
            </div>
            <div className="threadkit-hover-card-info">
              <div className="threadkit-hover-card-name">{displayProfile.name}</div>
              <div className="threadkit-hover-card-stats">
                <div className="threadkit-hover-card-stat">
                  <span className="threadkit-hover-card-stat-value">
                    {formatNumber(displayProfile.karma)}
                  </span>
                  <span className="threadkit-hover-card-stat-label">{t('karma')}</span>
                </div>
                <div className="threadkit-hover-card-stat">
                  <span className="threadkit-hover-card-stat-value">
                    {formatNumber(displayProfile.totalComments)}
                  </span>
                  <span className="threadkit-hover-card-stat-label">{t('comments')}</span>
                </div>
              </div>
              <div className="threadkit-hover-card-joined">
                {t('joined')} {formatDate(displayProfile.joinDate)}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
