import { fetchComments } from '@/lib/api';
import { CommentsSection } from './comments-section';

// This is a Server Component - it runs on the server
export default async function Page() {
  const projectId = process.env.THREADKIT_PROJECT_ID || 'tk_pub_your_public_key';
  const pageUrl = '/blog/my-article';

  // Fetch comments on the server for SSR
  const initialComments = await fetchComments(pageUrl);

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h1>ThreadKit SSR Example</h1>
      <p>
        This example demonstrates server-side rendering (SSR) of comments for SEO.
        The comments are fetched on the server and passed to the client component
        as <code>initialComments</code>.
      </p>

      <div
        style={{
          background: '#fffbe6',
          border: '1px solid #ffe58f',
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
        }}
      >
        <strong>Setup:</strong>
        <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
          <li>
            Start Redis: <code>redis-server</code>
          </li>
          <li>
            Create site (first time only):
            <pre style={{ margin: '4px 0', padding: 8, background: '#f5f5f5', borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
cargo run --release --bin threadkit-http -- \
--create-site "My Site" example.com \
--enable-auth email,google,github,anonymous
            </pre>
          </li>
          <li>
            Start the server: <code>cd server && cargo run --release --bin threadkit-http</code>
          </li>
          <li>
            Start Next.js: <code>pnpm dev</code>
          </li>
        </ol>
      </div>

      <article style={{ marginBottom: 40 }}>
        <h2>My Blog Article</h2>
        <p>
          This is a sample blog article. The comments below were rendered on the
          server, which means search engines can see them. Once React hydrates,
          the comments become fully interactive.
        </p>
      </article>

      {/* Pass pre-fetched comments to the client component */}
      <CommentsSection
        projectId={projectId}
        url={pageUrl}
        initialComments={initialComments}
      />

      <footer style={{ marginTop: 40, color: '#666', fontSize: 14 }}>
        <p>
          <strong>How it works:</strong> The server fetches comments via{' '}
          <code>fetchComments()</code> and passes them as{' '}
          <code>initialComments</code> to ThreadKit. This enables:
        </p>
        <ul>
          <li>SEO-friendly comment content in the initial HTML</li>
          <li>Faster perceived load time (no loading spinner)</li>
          <li>Full interactivity after React hydration</li>
        </ul>
        <p style={{ marginTop: 16 }}>
          <strong>Configuration:</strong> Set environment variables in <code>.env.local</code>:
        </p>
        <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, fontSize: 12 }}>
THREADKIT_PROJECT_ID=tk_pub_your_public_key
THREADKIT_API_URL=http://localhost:8080/v1
NEXT_PUBLIC_THREADKIT_API_URL=http://localhost:8080/v1
NEXT_PUBLIC_THREADKIT_WS_URL=ws://localhost:8081
        </pre>
      </footer>
    </main>
  );
}
