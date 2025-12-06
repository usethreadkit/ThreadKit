import {
  CommentStore,
  WebSocketClient,
  formatTimestamp,
  formatTime,
  escapeHtml,
  renderMarkdownToHtml,
  renderMarkdownLineToHtml,
} from '@threadkit/core';
import '@threadkit/core/styles';

let commentStore = null;
let wsClient = null;
let currentMode = 'comments';
let currentTheme = 'light';
let currentSort = 'newest';
let container = null;

// Markdown rendering options
const markdownOptions = {
  allowLinks: true,
  enableAutoLinks: true,
  enableMentions: true,
};

// Render comment recursively
function renderComment(comment, depth = 0) {
  const score = comment.upvotes.length - comment.downvotes.length;
  const children = depth < 5 && comment.children.length > 0
    ? `<div class="threadkit-replies">${comment.children.map(c => renderComment(c, depth + 1)).join('')}</div>`
    : '';

  return `
    <div class="threadkit-comment" data-comment-id="${comment.id}">
      <div class="threadkit-comment-wrapper">
        <div class="threadkit-vote-column">
          <button class="threadkit-vote-btn threadkit-vote-up" data-id="${comment.id}" data-vote="up">&#9650;</button>
          <button class="threadkit-vote-btn threadkit-vote-down" data-id="${comment.id}" data-vote="down">&#9660;</button>
        </div>
        <div class="threadkit-comment-content">
          <div class="threadkit-comment-header">
            <span class="threadkit-author">${escapeHtml(comment.userName)}</span>
            <span class="threadkit-score">${score} point${score !== 1 ? 's' : ''}</span>
            <span class="threadkit-timestamp">${formatTimestamp(comment.timestamp)}</span>
          </div>
          <div class="threadkit-comment-body">${renderMarkdownToHtml(comment.text, markdownOptions)}</div>
          <div class="threadkit-comment-actions">
            <button class="threadkit-action-btn" data-share="${comment.id}" data-author="${escapeHtml(comment.userName)}" data-text="${escapeHtml(comment.text.slice(0, 100))}">share</button>
            ${depth < 5 ? `<button class="threadkit-action-btn" data-reply="${comment.id}">reply</button>` : ''}
          </div>
          ${children}
        </div>
      </div>
    </div>`;
}

// Render chat message
function renderChatMessage(msg) {
  return `
    <div class="threadkit-chat-message">
      <div class="threadkit-chat-message-line">
        <span class="threadkit-chat-time">${formatTime(msg.timestamp)}</span>
        <span class="threadkit-chat-author">${escapeHtml(msg.userName)}</span>
        <span class="threadkit-chat-text">${renderMarkdownLineToHtml(msg.text, markdownOptions)}</span>
      </div>
    </div>`;
}

// Render UI based on state
function renderUI(state) {
  const root = document.createElement('div');
  root.className = 'threadkit-root';
  root.dataset.theme = currentTheme;

  if (state.loading) {
    root.innerHTML = '<div class="threadkit-loading">Loading comments...</div>';
  } else if (state.error) {
    root.innerHTML = `<div class="threadkit-error"><strong>Failed to load</strong><p>${state.error.message || 'Please try again.'}</p></div>`;
  } else if (currentMode === 'chat') {
    root.innerHTML = `
      <div class="threadkit-chat">
        <form class="threadkit-chat-input" id="chat-form">
          <input type="text" placeholder="Type a message..." />
          <button type="submit" class="threadkit-submit-btn">Send</button>
        </form>
        <div class="threadkit-chat-messages">${state.comments.slice(-100).map(renderChatMessage).join('')}</div>
      </div>
      <div class="threadkit-branding"><a href="https://usethreadkit.com" target="_blank">Powered by ThreadKit</a></div>`;
  } else {
    const sorts = ['votes', 'newest', 'controversial', 'oldest'];
    root.innerHTML = `
      <div class="threadkit-comments">
        <div class="threadkit-toolbar">
          <div class="threadkit-sort">
            <span class="threadkit-sort-label">sorted by:</span>
            ${sorts.map(s => `<button class="threadkit-sort-option${currentSort === s ? ' active' : ''}" data-sort="${s}">${s === 'votes' ? 'top' : s === 'newest' ? 'new' : s === 'oldest' ? 'old' : s}</button>`).join('')}
          </div>
        </div>
        <div class="threadkit-comments-header">
          <form class="threadkit-form" id="comment-form">
            <textarea class="threadkit-textarea" placeholder="Write a comment..." rows="3"></textarea>
            <div class="threadkit-form-actions"><button type="submit" class="threadkit-submit-btn">Post</button></div>
          </form>
        </div>
        ${state.comments.length ? `<div class="threadkit-comment-list">${state.comments.map(c => renderComment(c)).join('')}</div>` : '<div class="threadkit-empty">No comments yet. Be the first!</div>'}
      </div>
      <div class="threadkit-branding"><a href="https://usethreadkit.com" target="_blank">Powered by ThreadKit</a></div>`;
  }

  container.innerHTML = '';
  container.appendChild(root);
  attachListeners();
}

// Attach event listeners
function attachListeners() {
  document.getElementById('comment-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const textarea = e.target.querySelector('textarea');
    if (textarea.value.trim()) {
      const comment = await commentStore.post(textarea.value.trim());
      commentStore.addComment(comment);
      textarea.value = '';
    }
  });

  document.getElementById('chat-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = e.target.querySelector('input');
    if (input.value.trim()) {
      const comment = await commentStore.post(input.value.trim());
      commentStore.addComment(comment);
      input.value = '';
    }
  });

  document.querySelectorAll('[data-sort]').forEach(btn => {
    btn.onclick = () => { currentSort = btn.dataset.sort; commentStore.setSortBy(currentSort); };
  });

  document.querySelectorAll('[data-vote]').forEach(btn => {
    btn.onclick = () => commentStore.vote(btn.dataset.id, btn.dataset.vote);
  });

  document.querySelectorAll('[data-reply]').forEach(btn => {
    btn.onclick = () => {
      const text = prompt('Write your reply:');
      if (text?.trim()) {
        commentStore.post(text.trim(), btn.dataset.reply).then(c => commentStore.addComment(c));
      }
    };
  });

  document.querySelectorAll('[data-share]').forEach(btn => {
    btn.onclick = async () => {
      const url = `${window.location.origin}${window.location.pathname}#threadkit-${btn.dataset.share}`;
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Comment by ${btn.dataset.author}`,
            text: btn.dataset.text + (btn.dataset.text.length >= 100 ? '...' : ''),
            url,
          });
        } catch {
          // User cancelled or share failed
        }
      } else {
        await navigator.clipboard.writeText(url);
      }
    };
  });
}

// Initialize
function init() {
  currentMode = document.getElementById('mode-select').value;
  currentTheme = document.getElementById('theme-select').value;
  container.style.background = currentTheme === 'dark' ? '#1a1a1a' : '#fff';

  commentStore?.destroy();
  wsClient?.destroy();

  commentStore = new CommentStore({
    siteId: 'demo',
    url: '/vanilla',
    apiUrl: '/api',
    sortBy: currentSort,
    getToken: () => localStorage.getItem('threadkit_token'),
  });

  wsClient = new WebSocketClient({
    siteId: 'demo',
    url: '/vanilla',
    apiUrl: '/api',
    getToken: () => localStorage.getItem('threadkit_token'),
  });

  commentStore.on('stateChange', renderUI);
  wsClient.on('commentAdded', c => commentStore.addComment(c));
  wsClient.on('commentDeleted', ({ commentId }) => commentStore.removeComment(commentId));

  commentStore.fetch();
  wsClient.connect();
}

document.addEventListener('DOMContentLoaded', () => {
  container = document.getElementById('threadkit-container');
  init();
  document.getElementById('mode-select').onchange = init;
  document.getElementById('theme-select').onchange = init;
});
