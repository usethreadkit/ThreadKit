import { useState, useCallback, useRef, useEffect } from 'react';
import type { User, SocialLinks } from '../types';
import { useTranslation } from '../i18n';
import { MAX_USERNAME_LENGTH, validateUsername } from '@threadkit/core';
import { Avatar } from './Avatar';
import { AvatarUploadModal } from './AvatarUploadModal';
import { GuestAwareUsername } from '../utils/username';
import { SOCIAL_ICONS } from '../auth/icons';
import { SettingsIcon } from '../icons/ui';

// Theme toggle icons
function DesktopIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M14.25 1c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 14.25 12h-3.727c.099 1.041.52 1.872 1.292 2.757A.752.752 0 0 1 11.25 16h-6.5a.75.75 0 0 1-.565-1.243c.772-.885 1.192-1.716 1.292-2.757H1.75A1.75 1.75 0 0 1 0 10.25v-7.5C0 1.784.784 1 1.75 1ZM1.75 2.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25ZM9.018 12H6.982a5.72 5.72 0 0 1-.765 2.5h3.566a5.72 5.72 0 0 1-.765-2.5Z" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-1.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm5.657-8.157a.75.75 0 0 1 0 1.061l-1.061 1.06a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l1.06-1.06a.75.75 0 0 1 1.06 0Zm-9.193 9.193a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 1 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0ZM8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0ZM3 8a.75.75 0 0 1-.75.75H.75a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 3 8Zm13 0a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 16 8Zm-8 5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 13Zm3.536-1.464a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 0 1-1.06 1.061l-1.061-1.06a.75.75 0 0 1 0-1.061Zm-9.193-9.193a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 0 1-1.06 1.061l-1.061-1.06a.75.75 0 0 1 0-1.061Z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M9.598 1.591a.749.749 0 0 1 .785-.175 7.001 7.001 0 1 1-8.967 8.967.75.75 0 0 1 .961-.96 5.5 5.5 0 0 0 7.046-7.046.75.75 0 0 1 .175-.786Zm1.616 1.945a7 7 0 0 1-7.678 7.678 5.499 5.499 0 1 0 7.678-7.678Z" />
    </svg>
  );
}

interface BlockedUser {
  id: string;
  name: string;
}

interface SettingsPanelProps {
  currentUser?: User;
  theme: 'light' | 'dark' | 'system';
  blockedUsers: BlockedUser[];
  apiUrl?: string;
  projectId?: string;
  token?: string;
  keyboardNavigationEnabled?: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onUpdateAvatar: (avatar: string) => void;
  onUpdateName: (name: string) => void;
  onUpdateSocialLinks: (socialLinks: SocialLinks) => void;
  onUnblock: (userId: string) => void;
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  onKeyboardNavigationChange?: (enabled: boolean) => void;
  onDeleteAccount: () => void;
}

const DELETE_HOLD_SECONDS = 15;

const DEFAULT_API_URL = 'https://api.usethreadkit.com';

export function SettingsPanel({
  currentUser,
  theme,
  blockedUsers,
  apiUrl = DEFAULT_API_URL,
  projectId,
  token,
  keyboardNavigationEnabled = true,
  onLogin,
  onLogout,
  onUpdateAvatar: _onUpdateAvatar,
  onUpdateName,
  onUpdateSocialLinks,
  onUnblock,
  onThemeChange,
  onKeyboardNavigationChange,
  onDeleteAccount,
}: SettingsPanelProps) {
  const t = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(currentUser?.name || '');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(DELETE_HOLD_SECONDS);
  const [isHolding, setIsHolding] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | undefined>(undefined);
  const [twitter, setTwitter] = useState(currentUser?.socialLinks?.twitter || '');
  const [github, setGithub] = useState(currentUser?.socialLinks?.github || '');
  const [facebook, setFacebook] = useState(currentUser?.socialLinks?.facebook || '');
  const [whatsapp, setWhatsapp] = useState(currentUser?.socialLinks?.whatsapp || '');
  const [telegram, setTelegram] = useState(currentUser?.socialLinks?.telegram || '');
  const [instagram, setInstagram] = useState(currentUser?.socialLinks?.instagram || '');
  const [tiktok, setTiktok] = useState(currentUser?.socialLinks?.tiktok || '');
  const [snapchat, setSnapchat] = useState(currentUser?.socialLinks?.snapchat || '');
  const [discord, setDiscord] = useState(currentUser?.socialLinks?.discord || '');
  const [savingSocialLinksMap, setSavingSocialLinksMap] = useState<Record<string, boolean>>({});
  const [savedSocialLinksMap, setSavedSocialLinksMap] = useState<Record<string, boolean>>({});
  const holdIntervalRef = useRef<number | null>(null);
  const hideDeleteModeRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const checkUsernameRef = useRef<number | null>(null);
  const saveSocialLinksRefs = useRef<Record<string, number>>({});
  const savedSocialLinksTimeoutRefs = useRef<Record<string, number>>({});
  const prevIsOpenRef = useRef(false);

  // Helper to save a specific social link field
  const saveSocialLinkField = useCallback((platform: string, value: string) => {
    if (!currentUser) return;

    // Clear existing timeouts for this field
    if (saveSocialLinksRefs.current[platform]) {
      clearTimeout(saveSocialLinksRefs.current[platform]);
    }
    if (savedSocialLinksTimeoutRefs.current[platform]) {
      clearTimeout(savedSocialLinksTimeoutRefs.current[platform]);
    }

    // Set saving state for this field
    setSavingSocialLinksMap(prev => ({ ...prev, [platform]: true }));
    setSavedSocialLinksMap(prev => ({ ...prev, [platform]: false }));

    // Debounce save
    saveSocialLinksRefs.current[platform] = window.setTimeout(async () => {
      // Build the full social links object with the updated field
      const socialLinks = {
        twitter: platform === 'twitter' ? value || undefined : twitter || undefined,
        github: platform === 'github' ? value || undefined : github || undefined,
        facebook: platform === 'facebook' ? value || undefined : facebook || undefined,
        whatsapp: platform === 'whatsapp' ? value || undefined : whatsapp || undefined,
        telegram: platform === 'telegram' ? value || undefined : telegram || undefined,
        instagram: platform === 'instagram' ? value || undefined : instagram || undefined,
        tiktok: platform === 'tiktok' ? value || undefined : tiktok || undefined,
        snapchat: platform === 'snapchat' ? value || undefined : snapchat || undefined,
        discord: platform === 'discord' ? value || undefined : discord || undefined,
      };

      await onUpdateSocialLinks(socialLinks);

      setSavingSocialLinksMap(prev => ({ ...prev, [platform]: false }));
      setSavedSocialLinksMap(prev => ({ ...prev, [platform]: true }));

      // Hide checkmark after 2 seconds
      savedSocialLinksTimeoutRefs.current[platform] = window.setTimeout(() => {
        setSavedSocialLinksMap(prev => ({ ...prev, [platform]: false }));
      }, 2000);
    }, 1000);
  }, [currentUser, onUpdateSocialLinks, twitter, github, facebook, whatsapp, telegram, instagram, tiktok, snapchat, discord]);

  // Debounced username availability check
  useEffect(() => {
    if (!editingName || !newName.trim() || newName === currentUser?.name) {
      setUsernameAvailable(null);
      setUsernameError(null);
      setCheckingUsername(false);
      return;
    }

    // First validate format
    const validationError = validateUsername(newName.trim());
    if (validationError) {
      setUsernameError(validationError);
      setUsernameAvailable(null);
      setCheckingUsername(false);
      return;
    }

    setCheckingUsername(true);
    setUsernameAvailable(null);
    setUsernameError(null);

    if (checkUsernameRef.current) {
      clearTimeout(checkUsernameRef.current);
    }

    checkUsernameRef.current = window.setTimeout(async () => {
      try {
        const response = await fetch(`${apiUrl}/v1/users/check-username`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: newName.trim() }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.error) {
            setUsernameError(data.error);
            setUsernameAvailable(false);
          } else {
            setUsernameError(null);
            setUsernameAvailable(data.available);
          }
        }
      } catch {
        // Silently fail - allow save attempt
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => {
      if (checkUsernameRef.current) {
        clearTimeout(checkUsernameRef.current);
      }
    };
  }, [newName, editingName, currentUser?.name, apiUrl]);

  // Sync social links state with currentUser only when panel first opens
  useEffect(() => {
    // Only sync when transitioning from closed to open
    if (isOpen && !prevIsOpenRef.current && currentUser) {
      setTwitter(currentUser.socialLinks?.twitter || '');
      setGithub(currentUser.socialLinks?.github || '');
      setFacebook(currentUser.socialLinks?.facebook || '');
      setWhatsapp(currentUser.socialLinks?.whatsapp || '');
      setTelegram(currentUser.socialLinks?.telegram || '');
      setInstagram(currentUser.socialLinks?.instagram || '');
      setTiktok(currentUser.socialLinks?.tiktok || '');
      setSnapchat(currentUser.socialLinks?.snapchat || '');
      setDiscord(currentUser.socialLinks?.discord || '');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, currentUser]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    setActiveSection(null);
    setEditingName(false);
    setLocalAvatar(undefined);
    setTwitter(currentUser?.socialLinks?.twitter || '');
    setGithub(currentUser?.socialLinks?.github || '');
    setFacebook(currentUser?.socialLinks?.facebook || '');
    setWhatsapp(currentUser?.socialLinks?.whatsapp || '');
    setTelegram(currentUser?.socialLinks?.telegram || '');
    setInstagram(currentUser?.socialLinks?.instagram || '');
    setTiktok(currentUser?.socialLinks?.tiktok || '');
    setSnapchat(currentUser?.socialLinks?.snapchat || '');
    setDiscord(currentUser?.socialLinks?.discord || '');
    setDeleteMode(false);
    setDeleteCountdown(DELETE_HOLD_SECONDS);
    setIsHolding(false);
    setDeleted(false);
  }, []);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveSection(null);
        setEditingName(false);
        setDeleteMode(false);
        setDeleteCountdown(DELETE_HOLD_SECONDS);
        setIsHolding(false);
        setDeleted(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Prevent body scroll when open on mobile
  useEffect(() => {
    if (isOpen && window.innerWidth <= 640) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  const handleSaveName = useCallback(() => {
    if (newName.trim() && newName !== currentUser?.name) {
      onUpdateName(newName.trim());
    }
    setEditingName(false);
  }, [newName, currentUser?.name, onUpdateName]);

  const handleAvatarUploadComplete = useCallback((url: string) => {
    setLocalAvatar(url);
    _onUpdateAvatar(url);
  }, [_onUpdateAvatar]);

  const startHolding = useCallback(() => {
    if (deleted) return;
    // Clear any pending hide timeout
    if (hideDeleteModeRef.current) {
      clearTimeout(hideDeleteModeRef.current);
      hideDeleteModeRef.current = null;
    }
    setIsHolding(true);
  }, [deleted]);

  const stopHolding = useCallback(() => {
    setIsHolding(false);
    if (!deleted) {
      setDeleteCountdown(DELETE_HOLD_SECONDS);
      // Hide delete mode after 500ms
      hideDeleteModeRef.current = window.setTimeout(() => {
        setDeleteMode(false);
      }, 500);
    }
  }, [deleted]);

  useEffect(() => {
    if (isHolding && !deleted) {
      holdIntervalRef.current = window.setInterval(() => {
        setDeleteCountdown((prev) => {
          if (prev <= 1) {
            setIsHolding(false);
            setDeleted(true);
            onDeleteAccount();
            if (holdIntervalRef.current) {
              clearInterval(holdIntervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }

    return () => {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
      }
      if (hideDeleteModeRef.current) {
        clearTimeout(hideDeleteModeRef.current);
      }
    };
  }, [isHolding, deleted, onDeleteAccount]);

  const renderSocialLinkInput = (
    platform: string,
    value: string,
    setValue: (value: string) => void
  ) => {
    const Icon = SOCIAL_ICONS[platform];
    if (!Icon) return null;

    const isSaving = savingSocialLinksMap[platform] || false;
    const isSaved = savedSocialLinksMap[platform] || false;

    return (
      <div className="threadkit-social-link-input-group">
        <label>
          <Icon className="threadkit-social-icon" />
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const newValue = e.target.value;
            setValue(newValue);
            saveSocialLinkField(platform, newValue);
          }}
          maxLength={30}
          className="threadkit-settings-name-input"
          placeholder={`https://${platform}.com/your-profile`}
        />
        {isSaving && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" opacity="0.25"/>
            <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 12 12"
                to="360 12 12"
                dur="1s"
                repeatCount="indefinite"
              />
            </path>
          </svg>
        )}
        {isSaved && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--threadkit-success)" strokeWidth="2" style={{ flexShrink: 0 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
    );
  };

  return (
    <div className="threadkit-settings" ref={containerRef}>
      <button
        className="threadkit-settings-btn"
        onClick={handleToggle}
        aria-label={t('settings')}
        title={t('settings')}
      >
        <SettingsIcon />
      </button>

      {isOpen && (
        <div className="threadkit-settings-dropdown">
          {/* Mobile header with close button */}
          <div className="threadkit-mobile-header">
            <span className="threadkit-mobile-title">{t('settings')}</span>
            <button
              className="threadkit-mobile-close"
              onClick={handleToggle}
              aria-label={t('close')}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          {!currentUser ? (
            <div className="threadkit-settings-section">
              <button className="threadkit-settings-item" onClick={onLogin}>
                {t('signIn')}
              </button>
            </div>
          ) : (
            <>
              {/* User Info */}
              <div className="threadkit-settings-user">
                <div
                  onClick={() => setShowAvatarModal(true)}
                  style={{ cursor: 'pointer' }}
                  title="Click to change avatar"
                >
                  <Avatar
                    src={localAvatar || currentUser.avatar}
                    alt={currentUser.name}
                    seed={currentUser.name}
                    className="threadkit-settings-avatar"
                  />
                </div>
                <div className="threadkit-settings-user-info">
                  {editingName ? (
                    <div className="threadkit-settings-name-edit">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => {
                          // Normalize on input: lowercase, replace spaces with hyphens, remove invalid chars
                          let value = e.target.value.toLowerCase();
                          value = value.replace(/\s+/g, '-'); // Replace spaces with hyphens
                          value = value.replace(/[^a-z0-9\-_]/g, ''); // Remove invalid characters
                          value = value.slice(0, MAX_USERNAME_LENGTH); // Enforce max length
                          setNewName(value);
                        }}
                        className={`threadkit-settings-name-input ${usernameAvailable === false || usernameError ? 'error' : ''}`}
                        autoFocus
                        maxLength={MAX_USERNAME_LENGTH}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && usernameAvailable !== false && !usernameError && !checkingUsername) handleSaveName();
                          if (e.key === 'Escape') setEditingName(false);
                        }}
                      />
                      <button
                        className="threadkit-submit-btn"
                        onClick={handleSaveName}
                        disabled={usernameAvailable === false || checkingUsername || !!usernameError}
                      >
                        {checkingUsername ? t('checking') : t('save')}
                      </button>
                      {(usernameAvailable === false || usernameError) && (
                        <span className="threadkit-username-taken">{usernameError || t('usernameTaken')}</span>
                      )}
                      {usernameAvailable === true && !usernameError && (
                        <span className="threadkit-username-available">{t('usernameAvailable')}</span>
                      )}
                    </div>
                  ) : (
                    <span className="threadkit-settings-username">
                      <GuestAwareUsername userName={currentUser.name} t={t} />
                      <button
                        className="threadkit-settings-edit-btn"
                        onClick={() => {
                          setNewName(currentUser.name);
                          setEditingName(true);
                        }}
                        title="Edit name"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </span>
                  )}
                </div>
              </div>

              {/* Theme Toggle */}
              <div className="threadkit-settings-section threadkit-theme-section">
                <div className="threadkit-settings-item">
                  <span></span>
                  <div className="threadkit-theme-toggle">
                    <button
                      onClick={() => onThemeChange('system')}
                      className={`threadkit-theme-toggle-btn ${theme === 'system' ? 'active' : ''}`}
                      aria-label="System theme"
                    >
                      <DesktopIcon className="threadkit-theme-toggle-icon" />
                    </button>
                    <button
                      onClick={() => onThemeChange('light')}
                      className={`threadkit-theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
                      aria-label="Light theme"
                    >
                      <SunIcon className="threadkit-theme-toggle-icon" />
                    </button>
                    <button
                      onClick={() => onThemeChange('dark')}
                      className={`threadkit-theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
                      aria-label="Dark theme"
                    >
                      <MoonIcon className="threadkit-theme-toggle-icon" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Blocked Users */}
              <div className="threadkit-settings-section">
                <button
                  className="threadkit-settings-item"
                  onClick={() => setActiveSection(activeSection === 'blocked' ? null : 'blocked')}
                >
                  {t('blockedUsers')} ({blockedUsers.length})
                  <span className="threadkit-settings-arrow">{activeSection === 'blocked' ? '▲' : '▼'}</span>
                </button>
                {activeSection === 'blocked' && (
                  <div className="threadkit-blocked-list">
                    {blockedUsers.length === 0 ? (
                      <div className="threadkit-settings-empty">{t('noBlockedUsers')}</div>
                    ) : (
                      blockedUsers.map((user) => (
                        <div key={user.id} className="threadkit-blocked-user">
                          <span>
                            <GuestAwareUsername userName={user.name} t={t} />
                          </span>
                          <button
                            className="threadkit-action-btn"
                            onClick={() => onUnblock(user.id)}
                          >
                            {t('unblock')}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div className="threadkit-settings-section">
                <button
                  className="threadkit-settings-item"
                  onClick={() => setActiveSection(activeSection === 'notifications' ? null : 'notifications')}
                >
                  {t('notifications')}
                  <span className="threadkit-settings-arrow">{activeSection === 'notifications' ? '▲' : '▼'}</span>
                </button>
                {activeSection === 'notifications' && (
                  <div className="threadkit-notification-settings">
                    <label className="threadkit-settings-toggle">
                      <input type="checkbox" defaultChecked />
                      <span>{t('emailOnReplies')}</span>
                    </label>
                    <label className="threadkit-settings-toggle">
                      <input type="checkbox" defaultChecked />
                      <span>{t('emailOnMentions')}</span>
                    </label>
                    <label className="threadkit-settings-toggle">
                      <input type="checkbox" />
                      <span>{t('weeklyDigest')}</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Keyboard Navigation */}
              <div className="threadkit-settings-section">
                <button
                  className="threadkit-settings-item"
                  onClick={() => setActiveSection(activeSection === 'keyboard' ? null : 'keyboard')}
                >
                  {t('keyboardNavigation')}
                  <span className="threadkit-settings-arrow">{activeSection === 'keyboard' ? '▲' : '▼'}</span>
                </button>
                {activeSection === 'keyboard' && (
                  <div className="threadkit-keyboard-settings">
                    <label className="threadkit-settings-toggle">
                      <input
                        type="checkbox"
                        checked={keyboardNavigationEnabled}
                        onChange={(e) => onKeyboardNavigationChange?.(e.target.checked)}
                      />
                      <span>{t('enableKeyboardShortcuts')}</span>
                    </label>
                    <div className="threadkit-keyboard-shortcuts-table">
                      <table>
                        <thead>
                          <tr>
                            <th>{t('key')}</th>
                            <th>{t('action')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><kbd>j</kbd></td>
                            <td>{t('nextComment')}</td>
                          </tr>
                          <tr>
                            <td><kbd>k</kbd></td>
                            <td>{t('previousComment')}</td>
                          </tr>
                          <tr>
                            <td><kbd>c</kbd></td>
                            <td>{t('focusCommentInput')}</td>
                          </tr>
                          <tr>
                            <td><kbd>e</kbd></td>
                            <td>{t('editFocusedComment')}</td>
                          </tr>
                          <tr>
                            <td><kbd>r</kbd></td>
                            <td>{t('replyToFocusedComment')}</td>
                          </tr>
                          <tr>
                            <td><kbd>d</kbd></td>
                            <td>{t('deleteFocusedComment')}</td>
                          </tr>
                          <tr>
                            <td><kbd>-</kbd></td>
                            <td>{t('toggleCollapseFocusedComment')}</td>
                          </tr>
                          <tr>
                            <td><kbd>f</kbd></td>
                            <td>{t('upvoteFocusedComment')}</td>
                          </tr>
                          <tr>
                            <td><kbd>s</kbd></td>
                            <td>{t('downvoteFocusedComment')}</td>
                          </tr>
                          <tr>
                            <td><kbd>y</kbd> / <kbd>n</kbd></td>
                            <td>{t('confirmYesNo')}</td>
                          </tr>
                          <tr>
                            <td><kbd>esc</kbd></td>
                            <td>{t('cancelClose')}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Social Links */}
              <div className="threadkit-settings-section">
                <button
                  className="threadkit-settings-item"
                  onClick={() => setActiveSection(activeSection === 'social' ? null : 'social')}
                >
                  <span>{t('socialLinks')}</span>
                  <span className="threadkit-settings-arrow">{activeSection === 'social' ? '▲' : '▼'}</span>
                </button>
                {activeSection === 'social' && (
                  <div className="threadkit-social-links-settings">
                    {renderSocialLinkInput('twitter', twitter, setTwitter)}
                    {renderSocialLinkInput('github', github, setGithub)}
                    {renderSocialLinkInput('facebook', facebook, setFacebook)}
                    {renderSocialLinkInput('whatsapp', whatsapp, setWhatsapp)}
                    {renderSocialLinkInput('telegram', telegram, setTelegram)}
                    {renderSocialLinkInput('instagram', instagram, setInstagram)}
                    {renderSocialLinkInput('tiktok', tiktok, setTiktok)}
                    {renderSocialLinkInput('snapchat', snapchat, setSnapchat)}
                    {renderSocialLinkInput('discord', discord, setDiscord)}
                  </div>
                )}
              </div>

              <div className="threadkit-settings-divider" />

              {/* Logout */}
              <div className="threadkit-settings-section">
                <button className="threadkit-settings-item" onClick={onLogout}>
                  {t('signOut')}
                </button>
              </div>

              {/* Delete Account */}
              <div className="threadkit-settings-section">
                {!deleteMode ? (
                  <button
                    className="threadkit-settings-item threadkit-settings-danger"
                    onClick={() => setDeleteMode(true)}
                  >
                    {t('deleteAccount')}
                  </button>
                ) : deleted ? (
                  <div className="threadkit-settings-item threadkit-delete-complete">
                    {t('accountDeleted')}
                  </div>
                ) : (
                  <button
                    className="threadkit-settings-item threadkit-delete-hold"
                    onMouseDown={startHolding}
                    onMouseUp={stopHolding}
                    onMouseLeave={stopHolding}
                    onTouchStart={startHolding}
                    onTouchEnd={stopHolding}
                  >
                    {isHolding
                      ? t('holdForSeconds', { seconds: deleteCountdown })
                      : t('holdToDelete')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {showAvatarModal && token && projectId && (
        <AvatarUploadModal
          apiUrl={apiUrl}
          projectId={projectId}
          token={token}
          currentAvatar={localAvatar || currentUser?.avatar}
          theme={theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme}
          onClose={() => setShowAvatarModal(false)}
          onUploadComplete={handleAvatarUploadComplete}
        />
      )}
    </div>
  );
}
