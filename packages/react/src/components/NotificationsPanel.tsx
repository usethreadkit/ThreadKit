import { useState, useCallback, useRef, useEffect } from 'react';

export interface Notification {
  id: string;
  type: 'reply' | 'mention' | 'vote';
  message: string;
  commentId?: string;
  fromUser: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationsPanelProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function NotificationsPanel({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onNotificationClick,
}: NotificationsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      if (!notification.read) {
        onMarkRead(notification.id);
      }
      onNotificationClick?.(notification);
      setIsOpen(false);
    },
    [onMarkRead, onNotificationClick]
  );

  return (
    <div className="threadkit-notifications" ref={containerRef}>
      <button
        className="threadkit-notifications-btn"
        onClick={handleToggle}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        title="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="threadkit-notifications-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="threadkit-notifications-dropdown">
          {/* Mobile header with close button */}
          <div className="threadkit-mobile-header">
            <span className="threadkit-mobile-title">Notifications</span>
            <button
              className="threadkit-mobile-close"
              onClick={handleToggle}
              aria-label="Close"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="threadkit-notifications-header">
            <span className="threadkit-notifications-title">Notifications</span>
            {unreadCount > 0 && (
              <button
                className="threadkit-notifications-mark-all"
                onClick={onMarkAllRead}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="threadkit-notifications-list">
            {notifications.length === 0 ? (
              <div className="threadkit-notifications-empty">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  className={`threadkit-notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="threadkit-notification-icon">
                    {notification.type === 'reply' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    )}
                    {notification.type === 'mention' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
                      </svg>
                    )}
                    {notification.type === 'vote' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 19V5M5 12l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                  <div className="threadkit-notification-content">
                    <span className="threadkit-notification-message">{notification.message}</span>
                    <span className="threadkit-notification-time">{formatTimeAgo(notification.timestamp)}</span>
                  </div>
                  {!notification.read && <span className="threadkit-notification-dot" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
