import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

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

    const response = await fetch(url);
    if (!response.ok) return null;

    const data = (await response.json()) as any;
    if (data.results && data.results.length > 0) {
      const track = data.results[0];
      return {
        artist: track.artistName,
        title: track.trackName,
        // Request a higher resolution artwork (600x600 instead of 100x100)
        artworkUrl: track.artworkUrl100.replace("100x100", "600x600"),
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

  // 2. Check cache. If nightcore version exists, return immediately.
  if (fs.existsSync(nightcoreFilePath)) {
    console.log(`Cache hit for: ${trackQuery}`);
    const metadata = await fetchTrackMetadata(trackQuery);

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
    `ytsearch:${trackQuery}`,
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
    "after_move:title", // Get the video title after successful download
    "--no-warnings",
    "--no-playlist",
  ];

  try {
    // Execute yt-dlp
    const { stdout, stderr } = await execFileAsync("./yt-dlp", ytdlpArgs, {
      maxBuffer: 1024 * 1024 * 10,
    });

    console.log("--- yt-dlp stdout ---:\n", stdout);
    if (stderr) console.log("--- yt-dlp stderr ---:\n", stderr);

    const youtubeTitle = stdout.trim().split("\n")[0];

    // yt-dlp exits with code 0 even if it skipped the video due to duration filter.
    // So we must check if the file was actually created.
    if (!fs.existsSync(originalFilePath)) {
      return res.status(404).json({
        error: "Track not found, or skipped (e.g. duration > 10 min).",
        debug_stdout: stdout,
        debug_stderr: stderr,
      });
    }

    // 4. Fetch metadata from iTunes
    const metadata = await fetchTrackMetadata(youtubeTitle || trackQuery);

    // 5. Prepare ffmpeg arguments for Nightcore effect
    const ffmpegArgs = [
      "-i",
      originalFilePath,
      "-filter:a",
      "asetrate=44100*1.15,aresample=44100,atempo=1.0", // Classic nightcore pitch/speed
      "-b:a",
      "192k", // Good balance of size and quality
      "-y", // Overwrite output file if it exists
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

    // Add output path to ffmpeg arguments
    ffmpegArgs.push(nightcoreFilePath);

    // Execute ffmpeg
    const ffmpegResult = await execFileAsync("ffmpeg", ffmpegArgs);
    console.log("--- ffmpeg stderr ---:\n", ffmpegResult.stderr);

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
