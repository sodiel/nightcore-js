ARG NODE_IMAGE=node:24.13.0-trixie-slim
FROM ${NODE_IMAGE} AS dependencies
RUN npm install --global pnpm@11.20.0
WORKDIR /build

FROM dependencies AS web
COPY frontend/package.json frontend/pnpm-lock.yaml ./frontend/
RUN pnpm --dir frontend install --frozen-lockfile
COPY frontend ./frontend
RUN pnpm --dir frontend build

FROM dependencies AS server
COPY backend/package.json backend/pnpm-lock.yaml backend/pnpm-workspace.yaml ./backend/
RUN pnpm --dir backend install --prod --frozen-lockfile
COPY backend/src ./backend/src

FROM ${NODE_IMAGE} AS runtime
ARG TARGETARCH
ARG FFMPEG_VERSION=7:7.1.5-0+deb13u1
ARG YTDLP_VERSION=2026.11.23
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends ca-certificates curl "ffmpeg=${FFMPEG_VERSION}"; \
    case "${TARGETARCH:-$(dpkg --print-architecture)}" in amd64) asset=yt-dlp_linux ;; arm64) asset=yt-dlp_linux_aarch64 ;; *) exit 1 ;; esac; \
    base="https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}"; \
    cd /tmp; \
    curl --fail --silent --show-error --location --retry 3 --remote-name "${base}/SHA2-256SUMS"; \
    curl --fail --silent --show-error --location --retry 3 --remote-name "${base}/${asset}"; \
    awk -v target="${asset}" '$2 == target || $2 == "*" target { print; found=1 } END { if (!found) exit 1 }' SHA2-256SUMS > asset.sha256; \
    sha256sum --check asset.sha256; \
    install -m 0755 "${asset}" /usr/local/bin/yt-dlp; \
    rm "${asset}" SHA2-256SUMS asset.sha256; \
    apt-get purge -y --auto-remove curl; \
    rm -rf /var/lib/apt/lists/*; \
    mkdir -p /data/tracks; \
    chown node:node /data/tracks
WORKDIR /app
COPY --from=server /build/backend /app/backend
COPY --from=web /build/frontend/dist /app/web
ENV HOST=0.0.0.0 PORT=3001 TRACKS_DIR=/data/tracks WEB_DIR=/app/web DEPLOYMENT=container
USER node
WORKDIR /app/backend
EXPOSE 3001
CMD ["node", "src/main.ts"]
