import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { uploadAvatar, type MediaUpload } from '@threadkit/core';
import { Avatar } from './Avatar';

interface AvatarUploadModalProps {
  apiUrl: string;
  projectId: string;
  token: string;
  currentAvatar?: string;
  onClose: () => void;
  onUploadComplete: (url: string) => void;
}

export function AvatarUploadModal({
  apiUrl,
  projectId,
  token,
  currentAvatar,
  onClose,
  onUploadComplete,
}: AvatarUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - only safe image formats, no SVG
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setError('Unsupported image format (JPEG, PNG, WebP, GIF allowed - SVG not allowed)');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be smaller than 10MB');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const result: MediaUpload = await uploadAvatar(
        apiUrl,
        projectId,
        token,
        selectedFile,
        (progressPercent: number) => {
          setProgress(progressPercent);
        }
      );

      // Upload complete
      onUploadComplete(result.url);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setUploading(false);
      setProgress(0);
    }
  }, [selectedFile, apiUrl, projectId, token, onUploadComplete, onClose]);

  const handleCancel = useCallback(() => {
    if (!uploading) {
      onClose();
    }
  }, [uploading, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return createPortal(
    <div className="threadkit-root threadkit-user-modal-overlay" onClick={handleCancel}>
      <div className="threadkit-root threadkit-avatar-upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="threadkit-avatar-modal-header">
          <h3>Upload Avatar</h3>
          <button
            className="threadkit-avatar-modal-close"
            onClick={handleCancel}
            disabled={uploading}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="threadkit-avatar-modal-body">
          <div className="threadkit-avatar-preview-section">
            <div className="threadkit-avatar-preview-current">
              <label>Current</label>
              <div className="threadkit-avatar-preview-circle">
                <Avatar
                  src={currentAvatar}
                  alt="Current avatar"
                />
              </div>
            </div>

            {previewUrl && (
              <div className="threadkit-avatar-preview-new">
                <label>New</label>
                <div className="threadkit-avatar-preview-circle">
                  <img
                    src={previewUrl}
                    alt="New avatar"
                    className="threadkit-avatar-preview-image"
                  />
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {!selectedFile && (
            <button
              className="threadkit-submit-btn threadkit-select-file-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Select Image
            </button>
          )}

          {selectedFile && !uploading && (
            <div className="threadkit-selected-file-info">
              <p className="threadkit-file-name">{selectedFile.name}</p>
              <p className="threadkit-file-size">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
              <button
                className="threadkit-cancel-btn threadkit-change-file-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Change Image
              </button>
            </div>
          )}

          {uploading && (
            <div className="threadkit-upload-progress-section">
              <div className="threadkit-progress-bar">
                <div
                  className="threadkit-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="threadkit-progress-text">Uploading... {Math.round(progress)}%</p>
            </div>
          )}

          {error && (
            <div className="threadkit-error-message">
              {error}
            </div>
          )}
        </div>

        <div className="threadkit-avatar-modal-footer">
          <button
            className="threadkit-cancel-btn"
            onClick={handleCancel}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            className="threadkit-submit-btn"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
