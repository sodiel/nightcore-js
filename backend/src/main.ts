import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

if (fs.existsSync(".env")) {
  process.loadEnvFile(".env");
}

const execFileAsync = promisify(execFile);

const cookiesPath = process.env.YT_DLP_COOKIES_PATH?.trim();
const cookiesBrowser = process.env.YT_DLP_COOKIES_FROM_BROWSER?.trim();
const userAgent = process.env.YT_DLP_USER_AGENT?.trim();
if (cookiesPath && cookiesBrowser) {
  throw new Error("Set only one of YT_DLP_COOKIES_PATH and YT_DLP_COOKIES_FROM_BROWSER");
}

const app: Express = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static("tracks"));

// Ensure the tracks directory exists
const tracksDir = path.resolve("./tracks");
if (!fs.existsSync(tracksDir)) {
  fs.mkdirSync(tracksDir, { recursive: true });
}

type Metadata = { artist: string; title: string; artworkUrl: string };
let nextMusicBrainzRequest = 0;

async function musicBrainz(query: string): Promise<Metadata | null> {
  try {
    const now = Date.now();
    const slot = Math.max(now, nextMusicBrainzRequest);
    nextMusicBrainzRequest = slot + 1100;
    await new Promise((resolve) => setTimeout(resolve, slot - now));
    const params = new URLSearchParams({ query, fmt: "json", limit: "1", dismax: "true" });
    const response = await fetch(`https://musicbrainz.org/ws/2/recording?${params}`, {
      headers: { "User-Agent": "nightcore-js/1.0 (https://github.com/sodiel/nightcore-js)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const data = await response.json() as any;
    const recording = data.recordings?.[0];
    if (!recording?.title) return null;
    const releaseId = recording.releases?.[0]?.id;
    return {
      title: recording.title,
      artist: recording["artist-credit"]?.map((credit: any) => `${credit.name ?? credit.artist?.name ?? ""}${credit.joinphrase ?? ""}`).join("") ?? "",
      artworkUrl: releaseId ? `https://coverartarchive.org/release/${encodeURIComponent(releaseId)}/front-500` : "",
    };
  } catch (error) {
    console.error("MusicBrainz metadata error:", error);
    return null;
  }
}

function sourceMetadata(info: any): Metadata | null {
  if (!info || typeof info !== "object") return null;
  const title = info.track || info.title;
  if (typeof title !== "string" || !title.trim()) return null;
  return {
    title,
    artist: typeof (info.artist || info.creator || info.uploader) === "string" ? (info.artist || info.creator || info.uploader) : "",
    artworkUrl: typeof info.thumbnail === "string" ? info.thumbnail : "",
  };
}

async function resolveMetadata(info: any, query: string): Promise<Metadata | null> {
  const source = sourceMetadata(info);
  if (source) return source;
  // A URL is not a useful search term for catalog APIs.
  if (/^https?:\/\//i.test(query)) return null;
  return await fetchTrackMetadata(query) ?? await musicBrainz(query);
}

/**
 * Fetches track metadata (artist, title, artwork) from iTunes API
 */
async function fetchTrackMetadata(query: string) {
  try {
    // Clean the query to improve iTunes search results
    const cleanQuery = query
      .replace(/(nightcore|lyrics|official video|hd|\[.*?\]|\(.*?\))/gi, "")
      .trim();
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=song&limit=1`;

    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;

    const data = (await response.json()) as any;
    if (data.results && data.results.length > 0) {
      const track = data.results[0];
      return {
        artist: track.artistName,
        title: track.trackName,
        // Request a higher resolution artwork (600x600 instead of 100x100)
        artworkUrl: track.artworkUrl100?.replace("100x100", "600x600") ?? "",
      };
    }
  } catch (error) {
    console.error("Metadata fetch error:", error);
  }
  return null;
}

/**
 * Downloads the cover art to disk for later embedding by ffmpeg
 */
async function downloadCover(url: string, dest: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Failed to fetch cover: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(dest, buffer);
    return true;
  } catch (error) {
    console.error("Cover download error:", error);
    return false;
  }
}

app.post("/process", async (req: Request, res: Response) => {
  const trackQuery = req.body.trackQuery;

  if (!trackQuery || typeof trackQuery !== "string") {
    return res
      .status(400)
      .json({ error: "trackQuery is required and must be a string" });
  }

  // 1. Generate MD5 hash of the query for caching and filename
  const queryHash = crypto.createHash("md5").update(trackQuery).digest("hex");
  const originalFilePath = path.join(tracksDir, `${queryHash}.mp3`);
  const nightcoreFilePath = path.join(tracksDir, `${queryHash}_nightcore.mp3`);
  const coverFilePath = path.join(tracksDir, `${queryHash}_cover.jpg`);
  const metadataPath = path.join(tracksDir, `${queryHash}_metadata.json`);
  const input = /^https?:\/\//i.test(trackQuery.trim()) ? trackQuery.trim() : `ytsearch:${trackQuery}`;
  const authArgs = cookiesPath ? ["--cookies", cookiesPath] : cookiesBrowser ? ["--cookies-from-browser", cookiesBrowser] : [];
  if (userAgent) authArgs.push("--user-agent", userAgent);

  // 2. Check cache. If nightcore version exists, return immediately.
  if (fs.existsSync(nightcoreFilePath)) {
    console.log(`Cache hit for: ${trackQuery}`);
    let metadata: Metadata | null = null;
    try {
      metadata = JSON.parse(await fs.promises.readFile(metadataPath, "utf8"));
    } catch {
      try {
        const result = await execFileAsync("./yt-dlp", ["--skip-download", "--no-playlist", "--print", "%()j", ...authArgs, "--", input], { maxBuffer: 10 * 1024 * 1024 });
        metadata = await resolveMetadata(JSON.parse(result.stdout.trim()), trackQuery);
      } catch (error) {
        console.error("Cached track metadata lookup error:", error);
        metadata = await resolveMetadata(null, trackQuery);
      }
      if (metadata) await fs.promises.writeFile(metadataPath, JSON.stringify(metadata)).catch(console.error);
    }

    return res.json({
      success: true,
      cached: true,
      originalUrl: `http://localhost:${port}/${encodeURIComponent(path.basename(originalFilePath))}`,
      nightcoreUrl: `http://localhost:${port}/${encodeURIComponent(path.basename(nightcoreFilePath))}`,
      filename: path.basename(originalFilePath),
      nightcoreFilename: path.basename(nightcoreFilePath),
      metadata: metadata,
    });
  }

  // 3. Prepare yt-dlp arguments (Array format prevents Command Injection)
  const ytdlpArgs = [
    input,
    "-x",
    "--audio-format",
    "mp3",
    "--audio-quality",
    "0", // Best MP3 quality
    "-P",
    tracksDir,
    "-o",
    `${queryHash}.%(ext)s`, // Force filename to match our hash
    "--match-filter",
    "duration < 600", // Skip videos longer than 10 minutes
    "--print",
    "after_move:%()j", // Print the extracted metadata as JSON
    "--no-warnings",
    "--no-playlist",
  ];
  ytdlpArgs.push(...authArgs);

  try {
    // Execute yt-dlp
    let download;
    try {
      download = await execFileAsync("./yt-dlp", ytdlpArgs, {
        maxBuffer: 1024 * 1024 * 10,
      });
    } catch (error: any) {
      if (/HTTP Error 403\b/i.test(String(error.stderr ?? error.message))) {
        return res.status(502).json({
          error: "The source returned HTTP 403. Check browser cookies and user-agent, complete any browser challenge, and use the same network as the backend.",
          code: "SOURCE_HTTP_403",
        });
      }
      throw error;
    }
    const { stdout, stderr } = download;

    if (stderr) console.log("--- yt-dlp stderr ---:\n", stderr);

    let sourceInfo: unknown = null;
    try {
      sourceInfo = JSON.parse(stdout.trim());
    } catch {
      console.error("Could not parse yt-dlp metadata");
    }

    // yt-dlp exits with code 0 even if it skipped the video due to duration filter.
    // So we must check if the file was actually created.
    if (!fs.existsSync(originalFilePath)) {
      return res.status(404).json({
        error: "Track not found, or skipped (e.g. duration > 10 min).",
        debug_stderr: stderr,
      });
    }

    // 4. Fetch metadata from iTunes
    const metadata = await resolveMetadata(sourceInfo, trackQuery);

    // 5. Prepare ffmpeg arguments for Nightcore effect
    const ffmpegArgs = [
      "-i",
      originalFilePath,
    ];

    // 6. If we have artwork, download it and tell ffmpeg to embed it
    let coverEmbedded = false;
    if (metadata?.artworkUrl) {
      coverEmbedded = await downloadCover(metadata.artworkUrl, coverFilePath);

      if (coverEmbedded) {
        ffmpegArgs.push("-i", coverFilePath);
        ffmpegArgs.push("-map", "0:a", "-map", "1:v"); // Map audio from input 0, video (cover) from input 1
        ffmpegArgs.push("-c:v", "mjpeg");
        ffmpegArgs.push("-disposition:v:0", "attached_pic"); // Mark as ID3 cover art
      }
    }

    // Output options must follow all inputs.
    ffmpegArgs.push(
      "-filter:a",
      "asetrate=44100*1.15,aresample=44100,atempo=1.0",
      "-b:a",
      "192k",
      "-y",
      nightcoreFilePath,
    );

    // Execute ffmpeg
    const ffmpegResult = await execFileAsync("ffmpeg", ffmpegArgs);
    console.log("--- ffmpeg stderr ---:\n", ffmpegResult.stderr);
    if (metadata) await fs.promises.writeFile(metadataPath, JSON.stringify(metadata)).catch(console.error);

    // Clean up the downloaded cover image to save disk space
    if (coverEmbedded && fs.existsSync(coverFilePath)) {
      fs.unlinkSync(coverFilePath);
    }

    // 7. Send success response
    res.json({
      success: true,
      cached: false,
      originalUrl: `http://localhost:${port}/${encodeURIComponent(path.basename(originalFilePath))}`,
      nightcoreUrl: `http://localhost:${port}/${encodeURIComponent(path.basename(nightcoreFilePath))}`,
      filename: path.basename(originalFilePath),
      nightcoreFilename: path.basename(nightcoreFilePath),
      metadata: metadata,
    });
  } catch (error: any) {
    // Catch actual process crashes (exit code != 0)
    console.error("Processing error:", error);

    res.status(500).json({
      error: "Internal server error during processing",
      errorMessage: error.message,
      stderr: error.stderr || "No stderr provided",
      stdout: error.stdout || "No stdout provided",
    });
  }
});

app.listen(port, () => {
  console.log(`Nightcore API listening on port ${port}`);
});
