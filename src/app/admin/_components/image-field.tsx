"use client";

import { useRef, useState, useTransition } from "react";
import { uploadGalleryImage } from "@/lib/actions";

const INPUT_CLASS =
  "w-full rounded-[10px] border border-hairline bg-elevated px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-muted focus:border-hairline-strong focus:outline-none";

/** Image src editor: paste a URL, or upload to Vercel Blob when configured. */
export function ImageField({
  id,
  value,
  onChange,
  blobEnabled,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  blobEnabled: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, startTransition] = useTransition();

  const handleFile = (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      try {
        const result = await uploadGalleryImage(formData);
        if (result.status === "success") {
          setError(null);
          onChange(result.url);
        } else {
          setError(result.message);
        }
      } catch {
        setError("Upload failed — please try again.");
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://… or upload"
          className={INPUT_CLASS}
        />
        {blobEnabled ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleFile(file);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="kip-press shrink-0 rounded-[10px] border border-hairline bg-surface px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-hairline-strong disabled:opacity-50"
            >
              {isUploading ? "Uploading…" : "Upload"}
            </button>
          </>
        ) : null}
      </div>

      {!blobEnabled ? (
        <p className="text-xs text-ink-muted">
          Paste an image URL. Set BLOB_READ_WRITE_TOKEN to enable direct uploads.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {value ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin preview of arbitrary remote/blob URLs
        <img
          src={value}
          alt=""
          className="h-20 w-auto rounded-[10px] border border-hairline object-cover"
        />
      ) : null}
    </div>
  );
}
