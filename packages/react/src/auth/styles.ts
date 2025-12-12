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
  background: var(--threadkit-bg, #fff);
  border-radius: var(--threadkit-radius, 4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 320px;
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
  padding: 12px 16px;
  border-bottom: 1px solid var(--threadkit-border, #e5e5e5);
}

.tk-auth-header-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--threadkit-text, #111);
}

[data-theme="dark"] .tk-auth-header-title {
  color: var(--threadkit-text, #fff);
}

[data-theme="dark"] .tk-auth-header {
  border-color: var(--threadkit-border, #333);
}

.tk-auth-back-btn,
.tk-auth-close-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  border-radius: var(--threadkit-radius, 4px);
  color: var(--threadkit-text-secondary, #666);
  transition: background 0.15s, color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tk-auth-back-btn:hover,
.tk-auth-close-btn:hover {
  background: var(--threadkit-bg-hover, #f5f5f5);
  color: var(--threadkit-text, #111);
}

[data-theme="dark"] .tk-auth-back-btn:hover,
[data-theme="dark"] .tk-auth-close-btn:hover {
  background: var(--threadkit-bg-hover, #333);
  color: var(--threadkit-text, #fff);
}

.tk-auth-icon-sm {
  width: 16px;
  height: 16px;
}

.tk-auth-content {
  padding: 16px;
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
  gap: 2px;
}

.tk-auth-method-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px;
  background: none;
  border: none;
  border-radius: var(--threadkit-radius, 4px);
  cursor: pointer;
  font-size: 13px;
  color: var(--threadkit-text, #111);
  transition: background 0.15s;
}

.tk-auth-method-btn:hover {
  background: var(--threadkit-bg-hover, #f5f5f5);
}

[data-theme="dark"] .tk-auth-method-btn {
  color: var(--threadkit-text, #fff);
}

[data-theme="dark"] .tk-auth-method-btn:hover {
  background: var(--threadkit-bg-hover, #333);
}

.tk-auth-method-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.tk-auth-form {
  display: flex;
  flex-direction: column;
}

.tk-auth-input {
  width: 100%;
  padding: 8px 10px;
  font-size: 13px;
  border: 1px solid var(--threadkit-border, #e5e5e5);
  border-radius: var(--threadkit-radius, 4px);
  background: var(--threadkit-bg, #fff);
  color: var(--threadkit-text, #111);
  margin-bottom: 12px;
  outline: none;
  transition: border-color 0.15s;
}

.tk-auth-input:focus {
  border-color: var(--threadkit-primary, #ff4500);
}

[data-theme="dark"] .tk-auth-input {
  background: var(--threadkit-bg-secondary, #2a2a2a);
  border-color: var(--threadkit-border, #444);
  color: var(--threadkit-text, #fff);
}

[data-theme="dark"] .tk-auth-input:focus {
  border-color: var(--threadkit-primary, #ff4500);
}

.tk-auth-otp-input {
  font-family: monospace;
  font-size: 24px;
  letter-spacing: 8px;
  text-align: center;
}

.tk-auth-submit-btn {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #fff !important;
  background: #ff4500 !important;
  border: 1px solid #ff4500 !important;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  font-family: inherit;
  line-height: 1.5;
}

.tk-auth-submit-btn:hover:not(:disabled) {
  background: #cc3700 !important;
  border-color: #cc3700 !important;
}

.tk-auth-submit-btn:disabled {
  background: transparent !important;
  border-color: #e5e5e5 !important;
  color: #999 !important;
  cursor: not-allowed;
}

.tk-auth-error {
  color: var(--threadkit-error, #dc2626);
  font-size: 12px;
  margin: 0 0 12px 0;
}

.tk-auth-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 12px;
  color: var(--threadkit-text-secondary, #666);
}

.tk-auth-spinner {
  width: 14px;
  height: 14px;
  color: var(--threadkit-primary, #ff4500);
  animation: tk-auth-spin 1s linear infinite;
}

@keyframes tk-auth-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

[data-theme="dark"] .tk-auth-loading {
  color: var(--threadkit-text-secondary, #888);
}

/* Wallet-specific styles */
.tk-auth-wallet-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.tk-auth-wallet-address {
  font-size: 12px;
  font-family: monospace;
  color: var(--threadkit-text-secondary, #666);
}

.tk-auth-disconnect-btn {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #999 !important;
  background: transparent !important;
  border: 1px solid #e5e5e5 !important;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  line-height: 1.5;
}

.tk-auth-disconnect-btn:hover {
  color: #fff !important;
  background: #ff4500 !important;
  border-color: #ff4500 !important;
}

[data-theme="dark"] .tk-auth-disconnect-btn {
  border-color: #444 !important;
  color: #888 !important;
}

[data-theme="dark"] .tk-auth-disconnect-btn:hover {
  color: #fff !important;
  background: #ff4500 !important;
  border-color: #ff4500 !important;
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
