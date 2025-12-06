FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-built binaries based on architecture
ARG TARGETARCH
COPY docker/${TARGETARCH}/threadkit-http /usr/local/bin/
COPY docker/${TARGETARCH}/threadkit-websocket /usr/local/bin/

RUN chmod +x /usr/local/bin/threadkit-http /usr/local/bin/threadkit-websocket

ENV MODE=standalone
ENV REDIS_URL=redis://localhost:6379
ENV HTTP_PORT=8080
ENV WS_PORT=8081

EXPOSE 8080 8081

# Default to HTTP server - override with command
CMD ["threadkit-http"]
