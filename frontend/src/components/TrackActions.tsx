import { useEffect, useRef, useState } from "react";
import { Icon } from "../config/icons.tsx";
import type { Track } from "../services.ts";
import { downloadUrl, publicTrackLink } from "../utils/sharing.ts";
import Overlay from "./Overlay.tsx";

interface Props {
  track: Track;
  lyricsOpen: boolean;
  onToggleLyrics: () => void;
}

export default function TrackActions({ track, lyricsOpen, onToggleLyrics }: Props) {
  const [message, setMessage] = useState("");
  const [dialogMode, setDialogMode] = useState<"link" | "file" | "download">("link");
  const [file, setFile] = useState<File | null>(null);
  const overlay = useRef<HTMLDialogElement>(null);
  const fileRequest = useRef<AbortController>(null);
  const { variant } = track;
  const link = publicTrackLink(track, window.location);
  const download = downloadUrl(variant);
  const title = track.metadata?.title || "Track";

  useEffect(() => () => fileRequest.current?.abort(), []);

  function openDialog(mode: typeof dialogMode) {
    setDialogMode(mode);
    overlay.current?.showModal();
  }

  function closeDialog() {
    if (overlay.current?.open) return;
    fileRequest.current?.abort();
    fileRequest.current = null;
    setFile(null);
  }

  function shareFileOrOfferDownload() {
    const canShareFiles = typeof navigator.share === "function" && navigator.canShare?.({
      files: [new File([], variant.filename, { type: variant.mime })],
    });
    if (!canShareFiles) {
      openDialog("download");
      return;
    }

    const controller = new AbortController();
    fileRequest.current?.abort();
    fileRequest.current = controller;
    setFile(null);
    openDialog("file");
    void fetch(variant.mediaUrl, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Audio unavailable");
      const blob = await response.blob();
      const audio = new File([blob], variant.filename, { type: variant.mime });
      if (!navigator.canShare?.({ files: [audio] })) throw new Error("File sharing unavailable");
      if (!controller.signal.aborted) setFile(audio);
    }).catch(() => {
      if (!controller.signal.aborted) setDialogMode("download");
    });
  }

  async function share() {
    setMessage("");
    if (!link) {
      shareFileOrOfferDownload();
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({ title, url: link });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Link copied");
    } catch {
      openDialog("link");
    }
  }

  async function sendFile() {
    if (!file) return;
    try {
      await navigator.share({ title, files: [file] });
      overlay.current?.close();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setDialogMode("download");
    }
  }

  return (
    <>
      <div className="track-actions">
        <button className="button track-action" type="button" aria-expanded={lyricsOpen}
          aria-controls={lyricsOpen ? "lyrics" : undefined} onClick={onToggleLyrics}>
          <Icon name="lyrics" />Lyrics
        </button>
        <a className="button track-action" href={download} download={variant.filename}>
          <Icon name="download" />Download
        </a>
        <button className="button track-action" type="button" onClick={() => void share()}>
          <Icon name="share" />Share
        </button>
        <span className="share-confirmation" role="status">{message}</span>
      </div>
      <Overlay dialogRef={overlay} id="share-track" title="Share track" onClose={closeDialog}>
        {dialogMode === "link" && (
          <input className="share-link" aria-label="Track link" readOnly
            value={link} onFocus={(event) => event.currentTarget.select()} />
        )}
        {dialogMode === "file" && (
          <>
            {!file && <p className="share-copy" role="status">Preparing the audio file</p>}
            <button type="button" className="button primary share-dialog-action" disabled={!file} onClick={() => void sendFile()}>
              <Icon name="share" />Share file
            </button>
          </>
        )}
        {dialogMode === "download" && (
          <>
            <p className="share-copy">Download the audio file to share it from your device.</p>
            <a className="button primary share-dialog-action" href={download} download={variant.filename}>
              <Icon name="download" />Download file
            </a>
          </>
        )}
      </Overlay>
    </>
  );
}
