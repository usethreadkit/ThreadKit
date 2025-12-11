import React, { useCallback, useRef, useState } from 'react';
import type { MediaUpload, UploadProgress } from '@threadkit/core';
import { uploadAvatar, uploadImage } from '@threadkit/core';
import { ImagePlusIcon } from '../icons/ui';

export interface MediaUploaderProps {
  apiUrl: string;
  projectId: string;
  token: string;
  onUploadComplete: (media: MediaUpload) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  accept?: string;
  type: 'avatar' | 'image';
  className?: string;
  iconOnly?: boolean;
}

export function MediaUploader({
  apiUrl,
  projectId,
  token,
  onUploadComplete,
  onUploadError,
  maxFiles = 5,
  accept = 'image/*,video/*,audio/*',
  type,
  className = '',
  iconOnly = false,
}: MediaUploaderProps) {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files).slice(0, maxFiles);

      for (const file of fileArray) {
        const mediaId = crypto.randomUUID();

        setUploads((prev) => [
          ...prev,
          {
            mediaId,
            progress: 0,
            status: 'uploading',
          },
        ]);

        try {
          const uploadFn = type === 'avatar' ? uploadAvatar : uploadImage;
          const result = await uploadFn(apiUrl, projectId, token, file, (progress: number) => {
            setUploads((prev) =>
              prev.map((u) =>
                u.mediaId === mediaId ? { ...u, progress } : u
              )
            );
          });

          setUploads((prev) =>
            prev.map((u) =>
              u.mediaId === mediaId
                ? { ...u, status: 'complete' as const, progress: 100 }
                : u
            )
          );

          onUploadComplete(result);

          // Clear completed after 2s
          setTimeout(() => {
            setUploads((prev) => prev.filter((u) => u.mediaId !== mediaId));
          }, 2000);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setUploads((prev) =>
            prev.map((u) =>
              u.mediaId === mediaId
                ? { ...u, status: 'error' as const, error: errorMessage }
                : u
            )
          );
          onUploadError?.(errorMessage);

          // Clear error after 3s to allow retry
          setTimeout(() => {
            setUploads((prev) => prev.filter((u) => u.mediaId !== mediaId));
          }, 3000);
        }
      }
    },
    [apiUrl, projectId, token, maxFiles, type, onUploadComplete, onUploadError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const files = items
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null);

      if (files.length > 0) {
        const dt = new DataTransfer();
        files.forEach((f) => dt.items.add(f));
        handleFiles(dt.files);
      }
    },
    [handleFiles]
  );

  if (iconOnly) {
    return (
      <div className={`threadkit-attach-wrapper ${className}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={(e) => {
            if (e.target.files) {
              handleFiles(e.target.files);
              e.target.value = ''; // Reset input to allow re-upload of same file
            }
          }}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="threadkit-attach-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Attach media"
          aria-label="Attach media"
          disabled={uploads.length > 0}
        >
          <ImagePlusIcon />
        </button>
        {uploads.length > 0 && (
          <div className="threadkit-upload-progress-inline">
            {uploads.map((upload) => (
              <div key={upload.mediaId} className="threadkit-upload-status-inline">
                {upload.status === 'uploading' && <span>Uploading {upload.progress}%...</span>}
                {upload.status === 'processing' && <span>Processing...</span>}
                {upload.status === 'complete' && <span>✓ Uploaded</span>}
                {upload.status === 'error' && <span className="threadkit-upload-error">✗ {upload.error}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`threadkit-uploader ${isDragging ? 'threadkit-uploader-dragging' : ''} ${className}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onPaste={handlePaste}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={maxFiles > 1}
        onChange={(e) => {
          if (e.target.files) {
            handleFiles(e.target.files);
            e.target.value = ''; // Reset input to allow re-upload of same file
          }
        }}
        style={{ display: 'none' }}
      />

      <button
        type="button"
        className="threadkit-upload-btn"
        onClick={() => fileInputRef.current?.click()}
      >
        📎 Attach Media
      </button>

      {uploads.length > 0 && (
        <div className="threadkit-upload-progress">
          {uploads.map((upload) => (
            <div key={upload.mediaId} className="threadkit-upload-item">
              <div className="threadkit-progress-bar">
                <div
                  className="threadkit-progress-fill"
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
              <span className="threadkit-upload-status">{upload.status}</span>
              {upload.error && <span className="threadkit-upload-error">{upload.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
