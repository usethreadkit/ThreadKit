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

// Configuration for local development
const LOCAL_PROJECT_ID = 'tk_pub_your_public_key';
const API_URL = 'http://localhost:8080/v1';
const WS_URL = 'ws://localhost:8081';

let commentStore = null;
let wsClient = null;
let currentMode = 'comments';
let currentTheme = 'light';
let currentSort = 'new';
let currentPageId = null;
let container = null;

// Markdown rendering options
const markdownOptions = {
  allowLinks: true,
  enableAutoLinks: true,
  enableMentions: true,
};

// Render comment recursively
function renderComment(comment, depth = 0) {
  const score = comment.upvotes - comment.downvotes;
  const children = depth < 5 && comment.children.length > 0
    ? `<div class="threadkit-replies">${comment.children.map(c => renderComment(c, depth + 1)).join('')}</div>`
    : '';

  return `
    <div class="threadkit-comment" data-comment-id="${comment.id}" id="threadkit-${comment.id}">
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
            <button class="threadkit-action-btn" data-share="${comment.id}">share</button>
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
    const sorts = ['top', 'new', 'controversial', 'old'];
    root.innerHTML = `
      <div class="threadkit-comments">
        <div class="threadkit-toolbar">
          <div class="threadkit-sort">
            <span class="threadkit-sort-label">sorted by:</span>
            ${sorts.map(s => `<button class="threadkit-sort-option${currentSort === s ? ' active' : ''}" data-sort="${s}">${s}</button>`).join('')}
          </div>
        </div>
        <div class="threadkit-comments-header">
          <form class="threadkit-form" id="comment-form">
            <textarea placeholder="What are your thoughts?" rows="3"></textarea>
            <button type="submit" class="threadkit-submit-btn">Post</button>
          </form>
        </div>
        <div class="threadkit-comments-list">${state.comments.map(c => renderComment(c)).join('')}</div>
      </div>
      <div class="threadkit-branding"><a href="https://usethreadkit.com" target="_blank">Powered by ThreadKit</a></div>`;
  }

  container.innerHTML = '';
  container.appendChild(root);
  attachEventListeners();
}

// Attach event listeners
function attachEventListeners() {
  // Comment form
  const form = document.getElementById('comment-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const textarea = form.querySelector('textarea');
      const text = textarea.value.trim();
      if (!text) return;
      try {
        const comment = await commentStore.post(text);
        commentStore.addComment(comment);
        textarea.value = '';
      } catch (err) {
        alert('Failed to post comment: ' + err.message);
      }
    };
  }

  // Chat form
  const chatForm = document.getElementById('chat-form');
  if (chatForm) {
    chatForm.onsubmit = async (e) => {
      e.preventDefault();
      const input = chatForm.querySelector('input');
      const text = input.value.trim();
      if (!text) return;
      try {
        const comment = await commentStore.post(text);
        commentStore.addComment(comment);
        input.value = '';
      } catch (err) {
        alert('Failed to post message: ' + err.message);
      }
    };
  }

  // Votes
  document.querySelectorAll('.threadkit-vote-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const type = btn.dataset.vote;
      try {
        const result = await commentStore.vote(id, type);
        commentStore.updateComment(id, {
          upvotes: result.upvotes,
          downvotes: result.downvotes,
          userVote: result.user_vote ?? null,
        });
      } catch (err) {
        alert('Failed to vote: ' + err.message);
      }
    };
  });

  // Sort
  document.querySelectorAll('.threadkit-sort-option').forEach(btn => {
    btn.onclick = () => {
      currentSort = btn.dataset.sort;
      commentStore.setSortBy(currentSort);
    };
  });

  // Share
  document.querySelectorAll('[data-share]').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.share;
      const url = `${window.location.origin}${window.location.pathname}#threadkit-${id}`;
      if (navigator.share) {
        try {
          await navigator.share({ url });
        } catch (err) {
          if (err.name !== 'AbortError') {
            await navigator.clipboard.writeText(url);
          }
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
    url: '/vanilla',
    apiUrl: API_URL,
    projectId: LOCAL_PROJECT_ID,
    sortBy: currentSort,
    getToken: () => localStorage.getItem('threadkit_token'),
  });

  let hasScrolledToHash = false;
  commentStore.on('stateChange', (state) => {
    renderUI(state);

    // Initialize WebSocket when pageId becomes available
    if (state.pageId && !currentPageId) {
      currentPageId = state.pageId;
      wsClient = new WebSocketClient({
        wsUrl: WS_URL,
        projectId: LOCAL_PROJECT_ID,
        pageId: state.pageId,
        getToken: () => localStorage.getItem('threadkit_token'),
      });

      wsClient.on('commentAdded', ({ comment }) => commentStore.addComment(comment));
      wsClient.on('commentDeleted', ({ commentId }) => commentStore.removeComment(commentId));
      wsClient.connect();
    }

    // Scroll to hash after comments load
    if (!hasScrolledToHash && !state.loading && state.comments.length > 0) {
      const hash = window.location.hash;
      if (hash?.startsWith('#threadkit-')) {
        hasScrolledToHash = true;
        requestAnimationFrame(() => {
          const element = document.getElementById(hash.slice(1));
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('threadkit-highlighted');
          }
        });
      }
    }
  });

  commentStore.fetch();
}

document.addEventListener('DOMContentLoaded', () => {
  container = document.getElementById('threadkit-container');

  // Add setup instructions
  const setupInfo = document.createElement('div');
  setupInfo.style.cssText = 'background: #fffbe6; border: 1px solid #ffe58f; border-radius: 8px; padding: 16px; margin-bottom: 16px;';
  setupInfo.innerHTML = `
    <strong>Setup:</strong>
    <ol style="margin: 8px 0 0; padding-left: 20px;">
      <li>Start Redis: <code>redis-server</code></li>
      <li>Create site (first time): <code>cargo run --release --bin threadkit-http -- --create-site "My Site" example.com --enable-auth email,google,github,anonymous</code></li>
      <li>Start server: <code>cd server && cargo run --release --bin threadkit-http</code></li>
    </ol>
  `;
  document.querySelector('.controls').insertAdjacentElement('beforebegin', setupInfo);

  init();
  document.getElementById('mode-select').onchange = init;
  document.getElementById('theme-select').onchange = init;
});
