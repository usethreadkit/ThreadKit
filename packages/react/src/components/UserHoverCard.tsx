import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { UserProfile } from '../types';
import { useTranslation } from '../i18n';
import { Avatar } from './Avatar';
import { GuestAwareUsername } from '../utils/username';

interface UserHoverCardProps {
  userId: string;
  getUserProfile?: (userId: string) => UserProfile | undefined;
  fetchUserProfile?: (userId: string) => Promise<void>;
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
  userId,
  getUserProfile,
  fetchUserProfile,
  children,
}: UserHoverCardProps) {
  const t = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ bottom: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const profile = getUserProfile?.(userId);

  const showCard = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Trigger fetch on hover
    if (fetchUserProfile && !profile) {
      fetchUserProfile(userId);
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

  // Only show hover card if we have real profile data
  if (!profile) {
    return <>{children}</>;
  }

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
                src={profile.avatar}
                alt={profile.name}
                seed={profile.name}
              />
            </div>
            <div className="threadkit-hover-card-info">
              <div className="threadkit-hover-card-name">
                <GuestAwareUsername userName={profile.name} t={t} />
              </div>
              {profile.socialLinks && (
                <div className="threadkit-hover-card-social-links">
                  {profile.socialLinks.twitter && (
                    <a href={`https://twitter.com/${profile.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" title="Twitter">
                      {/* Replace with actual Twitter SVG icon */}
                      <span className="threadkit-social-icon">T</span>
                    </a>
                  )}
                  {profile.socialLinks.github && (
                    <a href={`https://github.com/${profile.socialLinks.github}`} target="_blank" rel="noopener noreferrer" title="GitHub">
                      {/* Replace with actual GitHub SVG icon */}
                      <span className="threadkit-social-icon">G</span>
                    </a>
                  )}
                  {profile.socialLinks.facebook && (
                    <a href={`https://facebook.com/${profile.socialLinks.facebook}`} target="_blank" rel="noopener noreferrer" title="Facebook">
                      {/* Replace with actual Facebook SVG icon */}
                      <span className="threadkit-social-icon">F</span>
                    </a>
                  )}
                  {profile.socialLinks.whatsapp && (
                    <a href={`https://wa.me/${profile.socialLinks.whatsapp}`} target="_blank" rel="noopener noreferrer" title="WhatsApp">
                      {/* Replace with actual WhatsApp SVG icon */}
                      <span className="threadkit-social-icon">W</span>
                    </a>
                  )}
                  {profile.socialLinks.telegram && (
                    <a href={`https://t.me/${profile.socialLinks.telegram}`} target="_blank" rel="noopener noreferrer" title="Telegram">
                      {/* Replace with actual Telegram SVG icon */}
                      <span className="threadkit-social-icon">Te</span>
                    </a>
                  )}
                  {profile.socialLinks.instagram && (
                    <a href={`https://instagram.com/${profile.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer" title="Instagram">
                      {/* Replace with actual Instagram SVG icon */}
                      <span className="threadkit-social-icon">I</span>
                    </a>
                  )}
                  {profile.socialLinks.tiktok && (
                    <a href={`https://tiktok.com/@${profile.socialLinks.tiktok}`} target="_blank" rel="noopener noreferrer" title="TikTok">
                      {/* Replace with actual TikTok SVG icon */}
                      <span className="threadkit-social-icon">Tk</span>
                    </a>
                  )}
                  {profile.socialLinks.snapchat && (
                    <a href={`https://snapchat.com/add/${profile.socialLinks.snapchat}`} target="_blank" rel="noopener noreferrer" title="Snapchat">
                      {/* Replace with actual Snapchat SVG icon */}
                      <span className="threadkit-social-icon">S</span>
                    </a>
                  )}
                  {profile.socialLinks.discord && (
                    <a href={`https://discordapp.com/users/${profile.socialLinks.discord}`} target="_blank" rel="noopener noreferrer" title="Discord">
                      {/* Replace with actual Discord SVG icon */}
                      <span className="threadkit-social-icon">D</span>
                    </a>
                  )}
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
        </div>,
        document.body
      )}
    </>
  );
}
