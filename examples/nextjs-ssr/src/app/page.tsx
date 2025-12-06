import { fetchComments } from '@/lib/api';
import { CommentsSection } from './comments-section';

// This is a Server Component - it runs on the server
export default async function Page() {
  const siteId = process.env.THREADKIT_SITE_ID || 'demo-site';
  const pageUrl = '/blog/my-article';

  // Fetch comments on the server for SSR
  const initialComments = await fetchComments(siteId, pageUrl);

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h1>ThreadKit SSR Example</h1>
      <p>
        This example demonstrates server-side rendering (SSR) of comments for SEO.
        The comments are fetched on the server and passed to the client component
        as <code>initialComments</code>.
      </p>

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
        siteId={siteId}
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
      </footer>
    </main>
  );
}
