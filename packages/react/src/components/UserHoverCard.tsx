import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { User, UserProfile } from '../types';
import { useTranslation } from '../i18n';
import { Avatar } from './Avatar';

interface UserHoverCardProps {
  userName: string;
  userId: string;
  currentUser?: User;
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
  currentUser,
  getUserProfile,
  children,
}: UserHoverCardProps) {
  const t = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ bottom: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const profile = getUserProfile?.(userId);

  // If this is the current user, use their data as fallback or override
  const isCurrentUser = currentUser?.id === userId;
  const avatar = profile?.avatar || (isCurrentUser ? currentUser?.avatar : undefined);

  const showCard = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
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
    avatar,
    karma: isCurrentUser && currentUser?.karma ? currentUser.karma : (Math.floor(Math.random() * 10000) + 100),
    totalComments: isCurrentUser && currentUser?.totalComments ? currentUser.totalComments : (Math.floor(Math.random() * 500) + 10),
    joinDate: isCurrentUser && currentUser?.joinDate ? currentUser.joinDate : (Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)),
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
      {isVisible && position && createPortal(
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
          <div className="threadkit-hover-card-content">
            <div className="threadkit-hover-card-avatar">
              <Avatar
                src={displayProfile.avatar}
                alt={displayProfile.name}
                seed={displayProfile.name}
              />
            </div>
            <div className="threadkit-hover-card-info">
              <div className="threadkit-hover-card-name">{displayProfile.name}</div>
              {displayProfile.socialLinks && (
                <div className="threadkit-hover-card-social-links">
                  {displayProfile.socialLinks.twitter && (
                    <a href={`https://twitter.com/${displayProfile.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" title="Twitter">
                      {/* Replace with actual Twitter SVG icon */}
                      <span className="threadkit-social-icon">T</span>
                    </a>
                  )}
                  {displayProfile.socialLinks.github && (
                    <a href={`https://github.com/${displayProfile.socialLinks.github}`} target="_blank" rel="noopener noreferrer" title="GitHub">
                      {/* Replace with actual GitHub SVG icon */}
                      <span className="threadkit-social-icon">G</span>
                    </a>
                  )}
                  {displayProfile.socialLinks.facebook && (
                    <a href={`https://facebook.com/${displayProfile.socialLinks.facebook}`} target="_blank" rel="noopener noreferrer" title="Facebook">
                      {/* Replace with actual Facebook SVG icon */}
                      <span className="threadkit-social-icon">F</span>
                    </a>
                  )}
                  {displayProfile.socialLinks.whatsapp && (
                    <a href={`https://wa.me/${displayProfile.socialLinks.whatsapp}`} target="_blank" rel="noopener noreferrer" title="WhatsApp">
                      {/* Replace with actual WhatsApp SVG icon */}
                      <span className="threadkit-social-icon">W</span>
                    </a>
                  )}
                  {displayProfile.socialLinks.telegram && (
                    <a href={`https://t.me/${displayProfile.socialLinks.telegram}`} target="_blank" rel="noopener noreferrer" title="Telegram">
                      {/* Replace with actual Telegram SVG icon */}
                      <span className="threadkit-social-icon">Te</span>
                    </a>
                  )}
                  {displayProfile.socialLinks.instagram && (
                    <a href={`https://instagram.com/${displayProfile.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer" title="Instagram">
                      {/* Replace with actual Instagram SVG icon */}
                      <span className="threadkit-social-icon">I</span>
                    </a>
                  )}
                  {displayProfile.socialLinks.tiktok && (
                    <a href={`https://tiktok.com/@${displayProfile.socialLinks.tiktok}`} target="_blank" rel="noopener noreferrer" title="TikTok">
                      {/* Replace with actual TikTok SVG icon */}
                      <span className="threadkit-social-icon">Tk</span>
                    </a>
                  )}
                  {displayProfile.socialLinks.snapchat && (
                    <a href={`https://snapchat.com/add/${displayProfile.socialLinks.snapchat}`} target="_blank" rel="noopener noreferrer" title="Snapchat">
                      {/* Replace with actual Snapchat SVG icon */}
                      <span className="threadkit-social-icon">S</span>
                    </a>
                  )}
                  {displayProfile.socialLinks.discord && (
                    <a href={`https://discordapp.com/users/${displayProfile.socialLinks.discord}`} target="_blank" rel="noopener noreferrer" title="Discord">
                      {/* Replace with actual Discord SVG icon */}
                      <span className="threadkit-social-icon">D</span>
                    </a>
                  )}
                </div>
              )}
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
        </div>,
        document.body
      )}
    </>
  );
}
