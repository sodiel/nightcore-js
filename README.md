# Nightcore Generator

 __WIP__

You need to enter song name, it will be searched on YouTube via yt-dlp.

## Installation 

You need to download [yt-dlp](https://github.com/yt-dlp/yt-dlp/releases) into backend/ directory, rename with "yt-dlp"

`git clone https://github.com/sodiel/nightcore-js`

`cd nightcore-js`

`cd frontend && npm install && npm run dev`

`cd ../backend && npm install && npm run dev`

To use YouTube cookies, set `YT_DLP_COOKIES_PATH` in `backend/.env` to the
absolute path of a Netscape-format cookies file. See `backend/.env.example`.
The backend requires Node.js 20.12 or later to load this file.




TODO:
- [ ] add crossplatform post-install script 
- [ ] add uploading track from file
