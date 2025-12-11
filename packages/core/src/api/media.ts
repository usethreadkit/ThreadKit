import type { MediaUpload } from '../types.js';

/**
 * Upload an avatar image
 *
 * @param apiUrl - API base URL
 * @param projectId - Project ID
 * @param token - JWT token
 * @param file - File to upload
 * @param onProgress - Optional progress callback (0-100)
 * @returns Upload response with media ID and URL
 */
export async function uploadAvatar(
  apiUrl: string,
  projectId: string,
  token: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<MediaUpload> {
  return uploadFile(`${apiUrl}/upload/avatar`, projectId, token, file, onProgress);
}

/**
 * Upload generic media (images, videos, audio)
 *
 * @param apiUrl - API base URL
 * @param projectId - Project ID
 * @param token - JWT token
 * @param file - File to upload
 * @param onProgress - Optional progress callback (0-100)
 * @returns Upload response with media ID and URL
 */
export async function uploadImage(
  apiUrl: string,
  projectId: string,
  token: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<MediaUpload> {
  return uploadFile(`${apiUrl}/upload/image`, projectId, token, file, onProgress);
}

/**
 * Delete a media file
 *
 * @param apiUrl - API base URL
 * @param projectId - Project ID
 * @param token - JWT token
 * @param mediaId - Media ID to delete
 */
export async function deleteMedia(
  apiUrl: string,
  projectId: string,
  token: string,
  mediaId: string
): Promise<void> {
  const response = await fetch(`${apiUrl}/media/${mediaId}`, {
    method: 'DELETE',
    headers: {
      'projectid': projectId,
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to delete media');
  }
}

/**
 * Upload a file using XMLHttpRequest for progress tracking
 */
function uploadFile(
  url: string,
  projectId: string,
  token: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<MediaUpload> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = (e.loaded / e.total) * 100;
        onProgress(progress);
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText) as MediaUpload;
          resolve(response);
        } catch (e) {
          console.error('[Media Upload] Invalid response from server:', xhr.responseText);
          reject(new Error('Invalid response from server'));
        }
      } else {
        const errorMsg = xhr.responseText || `Upload failed with status ${xhr.status}`;
        console.error('[Media Upload] Upload failed:', {
          status: xhr.status,
          statusText: xhr.statusText,
          response: xhr.responseText
        });
        reject(new Error(errorMsg));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    // Send request
    xhr.open('POST', url);
    xhr.setRequestHeader('projectid', projectId);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}
