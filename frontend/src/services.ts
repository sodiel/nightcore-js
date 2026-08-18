export interface TrackMetadata {
  artist: string;
  title: string;
  artworkUrl: string;
}

export interface TrackResponse {
  success: boolean;
  cached: boolean;
  originalUrl: string;
  nightcoreUrl: string;
  filename: string;
  nightcoreFilename: string;
  metadata: TrackMetadata | null;
}

export async function getNightcore(
  trackQuery: string,
): Promise<TrackResponse | null> {
  const url = "http://localhost:3001/process";
  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ trackQuery }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `HTTP Error: ${response.status}`);
    }
    return (await response.json()) as TrackResponse;
  } catch (error) {
    if (error instanceof Error) console.error(error.message);
    throw error;
  }
  return null;
}
