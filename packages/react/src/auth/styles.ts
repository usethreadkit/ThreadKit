// Auth styles injected into document head
export const AUTH_STYLES = `
.tk-auth-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.tk-auth-modal {
  background: var(--tk-bg, #fff);
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow: auto;
}

[data-theme="dark"] .tk-auth-modal {
  background: var(--tk-bg, #1a1a1a);
}

.tk-auth-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--tk-border, #e5e5e5);
}

[data-theme="dark"] .tk-auth-header {
  border-color: var(--tk-border, #333);
}

.tk-auth-back-btn,
.tk-auth-close-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  border-radius: 8px;
  color: var(--tk-text-secondary, #666);
  transition: background 0.15s, color 0.15s;
}

.tk-auth-back-btn:hover,
.tk-auth-close-btn:hover {
  background: var(--tk-hover, #f5f5f5);
  color: var(--tk-text, #111);
}

[data-theme="dark"] .tk-auth-back-btn:hover,
[data-theme="dark"] .tk-auth-close-btn:hover {
  background: var(--tk-hover, #333);
  color: var(--tk-text, #fff);
}

.tk-auth-icon-sm {
  width: 20px;
  height: 20px;
}

.tk-auth-content {
  padding: 24px;
}

.tk-auth-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--tk-text, #111);
}

[data-theme="dark"] .tk-auth-title {
  color: var(--tk-text, #fff);
}

.tk-auth-subtitle {
  font-size: 14px;
  color: var(--tk-text-secondary, #666);
  margin: 0 0 24px 0;
}

.tk-auth-method-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tk-auth-method-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  background: var(--tk-bg-secondary, #f5f5f5);
  border: 1px solid var(--tk-border, #e5e5e5);
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  color: var(--tk-text, #111);
  transition: background 0.15s, border-color 0.15s;
}

.tk-auth-method-btn:hover {
  background: var(--tk-hover, #eee);
  border-color: var(--tk-border-hover, #ccc);
}

[data-theme="dark"] .tk-auth-method-btn {
  background: var(--tk-bg-secondary, #2a2a2a);
  border-color: var(--tk-border, #444);
  color: var(--tk-text, #fff);
}

[data-theme="dark"] .tk-auth-method-btn:hover {
  background: var(--tk-hover, #333);
  border-color: var(--tk-border-hover, #555);
}

.tk-auth-method-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.tk-auth-form {
  display: flex;
  flex-direction: column;
}

.tk-auth-input {
  width: 100%;
  padding: 14px 16px;
  font-size: 16px;
  border: 1px solid var(--tk-border, #e5e5e5);
  border-radius: 8px;
  background: var(--tk-bg, #fff);
  color: var(--tk-text, #111);
  margin-bottom: 16px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.tk-auth-input:focus {
  border-color: var(--tk-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

[data-theme="dark"] .tk-auth-input {
  background: var(--tk-bg-secondary, #2a2a2a);
  border-color: var(--tk-border, #444);
  color: var(--tk-text, #fff);
}

[data-theme="dark"] .tk-auth-input:focus {
  border-color: var(--tk-primary, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.tk-auth-otp-input {
  font-family: monospace;
  font-size: 24px;
  letter-spacing: 8px;
  text-align: center;
}

.tk-auth-submit-btn {
  width: 100%;
  padding: 14px 16px;
  font-size: 15px;
  font-weight: 500;
  color: #fff;
  background: var(--tk-primary, #2563eb);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
}

.tk-auth-submit-btn:hover:not(:disabled) {
  background: var(--tk-primary-hover, #1d4ed8);
}

.tk-auth-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tk-auth-error {
  color: var(--tk-error, #dc2626);
  font-size: 14px;
  margin: 0 0 16px 0;
}

.tk-auth-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}

.tk-auth-spinner {
  width: 40px;
  height: 40px;
  margin-bottom: 16px;
  color: var(--tk-primary, #2563eb);
}

.tk-auth-loading p {
  margin: 0;
  color: var(--tk-text, #111);
}

[data-theme="dark"] .tk-auth-loading p {
  color: var(--tk-text, #fff);
}

/* Login button styles */
.tk-login-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  background: var(--tk-primary, #2563eb);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.tk-login-btn:hover {
  background: var(--tk-primary-hover, #1d4ed8);
}

/* User menu styles */
.tk-user-menu {
  position: relative;
}

.tk-user-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: none;
  border: 1px solid var(--tk-border, #e5e5e5);
  border-radius: 20px;
  cursor: pointer;
  color: var(--tk-text, #111);
  transition: background 0.15s;
}

.tk-user-btn:hover {
  background: var(--tk-hover, #f5f5f5);
}

[data-theme="dark"] .tk-user-btn {
  border-color: var(--tk-border, #444);
  color: var(--tk-text, #fff);
}

[data-theme="dark"] .tk-user-btn:hover {
  background: var(--tk-hover, #333);
}

.tk-user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.tk-user-avatar-placeholder {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--tk-primary, #2563eb);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.tk-user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: var(--tk-bg, #fff);
  border: 1px solid var(--tk-border, #e5e5e5);
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  z-index: 100;
}

[data-theme="dark"] .tk-user-dropdown {
  background: var(--tk-bg, #1a1a1a);
  border-color: var(--tk-border, #333);
}

.tk-user-dropdown-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--tk-border, #e5e5e5);
}

[data-theme="dark"] .tk-user-dropdown-header {
  border-color: var(--tk-border, #333);
}

.tk-user-dropdown-name {
  font-weight: 500;
  color: var(--tk-text, #111);
}

[data-theme="dark"] .tk-user-dropdown-name {
  color: var(--tk-text, #fff);
}

.tk-user-dropdown-email {
  font-size: 13px;
  color: var(--tk-text-secondary, #666);
}

.tk-user-dropdown-item {
  display: block;
  width: 100%;
  padding: 10px 16px;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--tk-text, #111);
  font-size: 14px;
  transition: background 0.15s;
}

.tk-user-dropdown-item:hover {
  background: var(--tk-hover, #f5f5f5);
}

[data-theme="dark"] .tk-user-dropdown-item {
  color: var(--tk-text, #fff);
}

[data-theme="dark"] .tk-user-dropdown-item:hover {
  background: var(--tk-hover, #333);
}

.tk-user-dropdown-item--danger {
  color: var(--tk-error, #dc2626);
}

.tk-user-dropdown-item--danger:hover {
  background: rgba(220, 38, 38, 0.1);
}
`;

// Inject styles into document
let stylesInjected = false;

export function injectAuthStyles() {
  if (stylesInjected || typeof document === 'undefined') {
    return;
  }

  const style = document.createElement('style');
  style.setAttribute('data-threadkit-auth', 'true');
  style.textContent = AUTH_STYLES;
  document.head.appendChild(style);
  stylesInjected = true;
}
