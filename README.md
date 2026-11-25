# nightcore-js

Search YouTube by track name or paste a video link. Nightcore raises the tempo and pitch. Daycore lowers both.

## Run with Docker

Run `docker compose up --build` and open `http://localhost:3001`. The container serves the player and its API on the same origin. The named volume keeps the track cache between restarts.

The Dockerfile pins Node, pnpm, FFmpeg and yt-dlp. The standalone yt-dlp release includes the EJS scripts and is checked against the release checksum. Update the FFmpeg and yt-dlp build arguments when updating the tool versions. See [yt-dlp's EJS guide](https://github.com/yt-dlp/yt-dlp/wiki/EJS).

## Develop natively

Install Node 24 or newer, pnpm, FFmpeg and ffprobe, and a current yt-dlp with bundled EJS or the `yt-dlp[default]` package. Keep the executables on PATH. Use `backend/.env.example` to configure custom paths or a different port.

In separate terminals:

```sh
cd backend
pnpm install --frozen-lockfile
pnpm dev
```

```sh
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Open the Vite URL shown in the terminal. Vite proxies the API to `127.0.0.1:3001`. When changing the backend port, set `VITE_API_TARGET` for Vite, for example `VITE_API_TARGET=http://127.0.0.1:3010`.
