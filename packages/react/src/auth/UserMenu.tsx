import { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface UserMenuProps {
  onLogin: () => void;
}

export function UserMenu({ onLogin }: UserMenuProps) {
  const { state, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!state.user) {
    return (
      <button className="tk-login-btn" onClick={onLogin}>
        Sign in
      </button>
    );
  }

  const initials = state.user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="tk-user-menu" ref={menuRef}>
      <button
        className="tk-user-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        {state.user.avatar_url ? (
          <img
            src={state.user.avatar_url}
            alt={state.user.name}
            className="tk-user-avatar"
          />
        ) : (
          <div className="tk-user-avatar-placeholder">{initials}</div>
        )}
        <span>{state.user.name}</span>
      </button>

      {isOpen && (
        <div className="tk-user-dropdown">
          <div className="tk-user-dropdown-header">
            <div className="tk-user-dropdown-name">{state.user.name}</div>
            {state.user.email && (
              <div className="tk-user-dropdown-email">{state.user.email}</div>
            )}
          </div>
          <button
            className="tk-user-dropdown-item tk-user-dropdown-item--danger"
            onClick={() => {
              logout();
              setIsOpen(false);
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
