import type { Plugin } from 'vite';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  timestamp: number;
  upvotes: string[];
  downvotes: string[];
  parentId: string | null;
  children: Comment[];
}

interface CompressedComment {
  i: string;
  u: string;
  n: string;
  a?: string;
  m: string;
  t: number;
  v: string[];
  V: string[];
  p: string | null;
  c: CompressedComment[];
}

let comments: Comment[] = [];
let nextId = 100;

function expandComment(c: CompressedComment): Comment {
  return {
    id: c.i,
    userId: c.u,
    userName: c.n,
    userAvatar: c.a,
    text: c.m,
    timestamp: c.t,
    upvotes: c.v,
    downvotes: c.V,
    parentId: c.p,
    children: c.c.map(expandComment),
  };
}

function adjustTimestamps(comment: Comment, baseOffset: number): Comment {
  const now = Date.now();
  // Convert old timestamp to a relative offset from now
  // Make it within the last few hours
  const randomOffset = baseOffset + Math.floor(Math.random() * 60 * 60 * 1000); // Add up to 1 hour randomness
  return {
    ...comment,
    timestamp: now - randomOffset,
    children: comment.children.map((c, i) => adjustTimestamps(c, randomOffset - (i + 1) * 10 * 60 * 1000)),
  };
}

function loadMockData(): Comment[] {
  const dataPath = resolve(__dirname, 'data.json');
  const data = JSON.parse(readFileSync(dataPath, 'utf-8'));
  const comments = data.c.map(expandComment);
  // Adjust timestamps to be recent (within last few hours)
  return comments.map((c: Comment, i: number) => adjustTimestamps(c, (i + 1) * 30 * 60 * 1000));
}

export function mockApiPlugin(): Plugin {
  return {
    name: 'mock-api',
    configureServer(server) {
      comments = loadMockData();

      server.middlewares.use((req, res, next) => {
        const url = req.url || '';

        // Only handle /api routes
        if (!url.startsWith('/api')) {
          return next();
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        // GET /api/sites/:siteId/comments
        if (req.method === 'GET' && url.match(/^\/api\/sites\/[^/]+\/comments/)) {
          res.statusCode = 200;
          res.end(JSON.stringify({ comments }));
          return;
        }

        // POST /api/sites/:siteId/comments
        if (req.method === 'POST' && url.match(/^\/api\/sites\/[^/]+\/comments/)) {
          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const { text, parentId } = JSON.parse(body);
              const newComment: Comment = {
                id: String(nextId++),
                userId: 'demo-user',
                userName: 'Demo User',
                userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Demo',
                text,
                timestamp: Date.now(),
                upvotes: [],
                downvotes: [],
                parentId: parentId || null,
                children: [],
              };

              if (parentId) {
                const addToParent = (list: Comment[]): boolean => {
                  for (const c of list) {
                    if (c.id === parentId) {
                      c.children.push(newComment);
                      return true;
                    }
                    if (addToParent(c.children)) return true;
                  }
                  return false;
                };
                addToParent(comments);
              } else {
                comments.push(newComment);
              }

              res.statusCode = 201;
              res.end(JSON.stringify(newComment));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid request' }));
            }
          });
          return;
        }

        // POST /api/comments/:id/vote
        if (req.method === 'POST' && url.match(/^\/api\/comments\/[^/]+\/vote/)) {
          const id = url.split('/')[3];
          let body = '';
          req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const { type } = JSON.parse(body);
              const findAndVote = (list: Comment[]): boolean => {
                for (const c of list) {
                  if (c.id === id) {
                    if (type === 'up') c.upvotes.push('demo-user');
                    else c.downvotes.push('demo-user');
                    return true;
                  }
                  if (findAndVote(c.children)) return true;
                }
                return false;
              };
              findAndVote(comments);
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true }));
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid request' }));
            }
          });
          return;
        }

        // DELETE /api/comments/:id
        if (req.method === 'DELETE' && url.match(/^\/api\/comments\/[^/]+$/)) {
          const id = url.split('/')[3];
          const removeFromTree = (list: Comment[]): Comment[] => {
            return list
              .filter(c => c.id !== id)
              .map(c => ({ ...c, children: removeFromTree(c.children) }));
          };
          comments = removeFromTree(comments);
          res.statusCode = 204;
          res.end();
          return;
        }

        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Not found' }));
      });
    },
  };
}
