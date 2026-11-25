interface Props {
  label: string;
  slow: boolean;
  uploadProgress: number | null;
}

export default function ProcessingStatus({ label, slow, uploadProgress }: Props) {
  return (
    <div className="status-slot">
      <div className="status-text" role="status">{label}</div>
      {uploadProgress !== null && <progress className="upload-progress" max={100} value={uploadProgress} aria-label="Upload progress" />}
      {slow && <span className="linear-indicator" aria-hidden="true" />}
    </div>
  );
}
