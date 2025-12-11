export function SetupInstructions() {
  return (
    <div
      style={{
        background: '#fffbe6',
        border: '1px solid #ffe58f',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <strong>🚀 Local Server Setup:</strong>
      <ol style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 14 }}>
        <li>
          Start Redis: <code>redis-server</code>
        </li>
        <li>
          Create site (first time only):
          <pre style={{
            margin: '4px 0',
            padding: 8,
            background: '#f5f5f5',
            borderRadius: 4,
            fontSize: 12,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
cargo run --release --bin threadkit-http -- \
  --create-site "My Site" example.com \
  --enable-auth email,google,github,anonymous
          </pre>
        </li>
        <li>
          Start the HTTP server: <code>cd server && cargo run --release --bin threadkit-http</code>
        </li>
        <li>
          Start the WebSocket server: <code>cd server && cargo run --release --bin threadkit-websocket</code>
        </li>
        <li>
          View API docs: <a href="http://localhost:8080/docs" target="_blank" rel="noopener noreferrer">http://localhost:8080/docs</a>
        </li>
      </ol>
    </div>
  );
}
