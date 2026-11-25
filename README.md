# nightcore-js

Search YouTube by track name or paste a video link. Nightcore raises the tempo and pitch. Daycore lowers both. Open Lyrics while listening to follow the words or jump to a timed line.

## Use your own audio

Choose an MP3, WAV, M4A, FLAC or Ogg file up to 50 MB and 10 minutes. The connected server processes the file and keeps it available to your browser session for 24 hours. Open Lyrics to look up lyrics using the file's artist and title tags.

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

Run `pnpm test` in the backend with FFmpeg and ffprobe installed. The integration tests generate temporary audio and exercise the API on loopback.
