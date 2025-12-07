import { useState, useCallback, useRef, useEffect } from 'react';
import type { User } from '../types';
import { useTranslation } from '../i18n';
import { MAX_USERNAME_LENGTH, validateUsername } from '@threadkit/core';

interface BlockedUser {
  id: string;
  name: string;
}

interface SettingsPanelProps {
  currentUser?: User;
  theme: 'light' | 'dark';
  blockedUsers: BlockedUser[];
  apiUrl?: string;
  onLogin: () => void;
  onLogout: () => void;
  onUpdateAvatar: (avatar: string) => void;
  onUpdateName: (name: string) => void;
  onUnblock: (userId: string) => void;
  onThemeChange: (theme: 'light' | 'dark') => void;
  onDeleteAccount: () => void;
}

const AVATAR_SEEDS = [
  'Felix', 'Aneka', 'Milo', 'Jasper', 'Luna', 'Zoe', 'Leo', 'Aria',
  'Max', 'Ivy', 'Oscar', 'Ruby', 'Charlie', 'Willow', 'Jack', 'Olive',
];

const DELETE_HOLD_SECONDS = 15;

const DEFAULT_API_URL = 'https://api.usethreadkit.com';

export function SettingsPanel({
  currentUser,
  theme,
  blockedUsers,
  apiUrl = DEFAULT_API_URL,
  onLogin,
  onLogout,
  onUpdateAvatar,
  onUpdateName,
  onUnblock,
  onThemeChange,
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
  const holdIntervalRef = useRef<number | null>(null);
  const hideDeleteModeRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const checkUsernameRef = useRef<number | null>(null);

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

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    setActiveSection(null);
    setEditingName(false);
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

  const handleSaveName = useCallback(() => {
    if (newName.trim() && newName !== currentUser?.name) {
      onUpdateName(newName.trim());
    }
    setEditingName(false);
  }, [newName, currentUser?.name, onUpdateName]);

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

  return (
    <div className="threadkit-settings" ref={containerRef}>
      <button
        className="threadkit-settings-btn"
        onClick={handleToggle}
        aria-label={t('settings')}
        title={t('settings')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
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
                <img
                  src={currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.name}`}
                  alt={currentUser.name}
                  className="threadkit-settings-avatar"
                />
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
                          if (e.key === 'Enter' && usernameAvailable !== false && !usernameError) handleSaveName();
                          if (e.key === 'Escape') setEditingName(false);
                        }}
                      />
                      <button
                        className="threadkit-action-btn"
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
                      {currentUser.name}
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

              {/* Avatar Selection */}
              <div className="threadkit-settings-section">
                <button
                  className="threadkit-settings-item"
                  onClick={() => setActiveSection(activeSection === 'avatar' ? null : 'avatar')}
                >
                  {t('changeAvatar')}
                  <span className="threadkit-settings-arrow">{activeSection === 'avatar' ? '▲' : '▼'}</span>
                </button>
                {activeSection === 'avatar' && (
                  <div className="threadkit-avatar-grid">
                    {AVATAR_SEEDS.map((seed) => (
                      <button
                        key={seed}
                        className="threadkit-avatar-option"
                        onClick={() => {
                          onUpdateAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`);
                          setActiveSection(null);
                        }}
                      >
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`}
                          alt={seed}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Theme Toggle */}
              <div className="threadkit-settings-section">
                <button
                  className="threadkit-settings-item"
                  onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
                >
                  {t('theme')}: {theme}
                  <span className="threadkit-settings-value">{theme === 'light' ? '☀️' : '🌙'}</span>
                </button>
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
                          <span>{user.name}</span>
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
    </div>
  );
}
