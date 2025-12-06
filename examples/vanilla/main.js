import { render } from '@threadkit/react';
import '@threadkit/react/styles';

let currentInstance = null;

function renderThreadKit() {
  const mode = document.getElementById('mode-select').value;
  const theme = document.getElementById('theme-select').value;
  const container = document.getElementById('threadkit-container');

  // Update container background for dark mode
  container.style.background = theme === 'dark' ? '#1a1a1a' : '#fff';

  // Unmount previous instance
  if (currentInstance) {
    currentInstance.unmount();
  }

  // Render new instance
  currentInstance = render('#threadkit-container', {
    siteId: 'demo',
    url: '/vanilla',
    apiUrl: '/api',
    mode: mode,
    theme: theme,
    sortBy: 'newest',
    showPresence: mode === 'chat',
    showTyping: mode === 'chat',
  });
}

// Initial render
renderThreadKit();

// Re-render on control changes
document.getElementById('mode-select').addEventListener('change', renderThreadKit);
document.getElementById('theme-select').addEventListener('change', renderThreadKit);
