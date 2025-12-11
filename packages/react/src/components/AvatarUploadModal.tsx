import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { uploadAvatar, type MediaUpload } from '@threadkit/core';
import { Avatar } from './Avatar';
import { useTranslation } from '../i18n';

interface AvatarUploadModalProps {
  apiUrl: string;
  projectId: string;
  token: string;
  currentAvatar?: string;
  theme?: 'light' | 'dark' | 'system';
  onClose: () => void;
  onUploadComplete: (url: string) => void;
}

export function AvatarUploadModal({
  apiUrl,
  projectId,
  token,
  currentAvatar,
  theme = 'light',
  onClose,
  onUploadComplete,
}: AvatarUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslation();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - only safe image formats, no SVG
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setError(t('fileFormatNotAllowed'));
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError(t('fileTooLarge'));
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
  }, [t]);

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
      const serverError = err instanceof Error ? err.message : String(err);

      // Log the server error for debugging
      console.error('[AvatarUploadModal] Upload error:', serverError);

      // Show user-friendly translated error message
      let userError = t('uploadFailed');

      // Check if server returned a specific error we can translate
      if (serverError.toLowerCase().includes('format') || serverError.toLowerCase().includes('svg')) {
        userError = t('fileFormatNotAllowed');
      } else if (serverError.toLowerCase().includes('size') || serverError.toLowerCase().includes('10mb')) {
        userError = t('fileTooLarge');
      }

      setError(userError);
      setUploading(false);
      setProgress(0);
    }
  }, [selectedFile, apiUrl, projectId, token, onUploadComplete, onClose, t]);

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

  // Resolve system theme to light/dark
  const resolvedTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  return createPortal(
    <div className="threadkit-root threadkit-user-modal-overlay" data-theme={resolvedTheme} onClick={handleCancel}>
      <div className="threadkit-root threadkit-avatar-upload-modal" data-theme={resolvedTheme} onClick={(e) => e.stopPropagation()}>
        <div className="threadkit-avatar-modal-header">
          <h3>{t('uploadAvatar')}</h3>
          <button
            className="threadkit-avatar-modal-close"
            onClick={handleCancel}
            disabled={uploading}
            aria-label={t('close')}
          >
            ×
          </button>
        </div>

        <div className="threadkit-avatar-modal-body">
          <div className="threadkit-avatar-preview-section">
            <div className="threadkit-avatar-preview-current">
              <label>{t('current')}</label>
              <div className="threadkit-avatar-preview-circle">
                <Avatar
                  src={currentAvatar}
                  alt="Current avatar"
                />
              </div>
            </div>

            {previewUrl && (
              <div className="threadkit-avatar-preview-new">
                <label>{t('new')}</label>
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
              {t('selectImage')}
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
                {t('changeImage')}
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
              <p className="threadkit-progress-text">{t('uploading')} {Math.round(progress)}%</p>
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
            {t('cancel')}
          </button>
          <button
            className="threadkit-submit-btn"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
          >
            {uploading ? t('uploading') : t('upload')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
