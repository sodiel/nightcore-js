# Nightcore Generator

 __WIP__

You need to enter song name, it will be searched on YouTube via yt-dlp.

## Installation 

You need to download [yt-dlp](https://github.com/yt-dlp/yt-dlp/releases) into backend/ directory, rename with "yt-dlp"

`git clone https://github.com/sodiel/nightcore-js`

`cd nightcore-js`

`cd frontend && npm install && npm run dev`

`cd ../backend && npm install && npm run dev`

To use cookies, copy `backend/.env.example` to `backend/.env` and choose one:

- Set `YT_DLP_COOKIES_FROM_BROWSER` to a yt-dlp browser specification, for
  example `firefox:/home/user/.floorp/profile-name` for a Floorp profile.
  Use the absolute path to the actual profile directory, not `~`.
- Or set `YT_DLP_COOKIES_PATH` to the absolute path of a Netscape-format
  cookies file. yt-dlp may update this file.

Restart the backend after changing the configuration. The backend process must
be able to read the browser profile, and browser database locks or encryption
may prevent extraction. Protect cookies files: they contain login credentials.
See `backend/.env.example`. Node.js 20.12 or later is required to load it.

For an HTTP 403 challenge, open the site in the browser and complete its
challenge, then use that browser's cookies and set `YT_DLP_USER_AGENT` to its
exact User-Agent. The browser and backend may also need the same public IP.
These steps do not resolve every 403. See the [yt-dlp FAQ](https://github.com/yt-dlp/yt-dlp/wiki/FAQ).




TODO:
- [ ] add crossplatform post-install script 
- [ ] add uploading track from file
