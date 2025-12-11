import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediaUploader } from './MediaUploader';
import { useState } from 'react';
import type { MediaUpload } from '@threadkit/core';

const meta = {
  title: 'Components/MediaUploader',
  component: MediaUploader,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MediaUploader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const IconOnly: Story = {
  args: {
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'demo-project',
    token: 'demo-token',
    type: 'image',
    iconOnly: true,
    maxFiles: 5,
  },
  render: (args) => {
    const [uploads, setUploads] = useState<MediaUpload[]>([]);
    return (
      <div>
        <MediaUploader
          {...args}
          onUploadComplete={(media) => {
            setUploads([...uploads, media]);
            console.log('Upload complete:', media);
          }}
          onUploadError={(error) => console.error('Upload error:', error)}
        />
        {uploads.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h4>Uploaded Media:</h4>
            {uploads.map((media) => (
              <div key={media.mediaId}>
                <img src={media.url} alt="" style={{ maxWidth: '200px' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
};

export const FullUploader: Story = {
  args: {
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'demo-project',
    token: 'demo-token',
    type: 'image',
    iconOnly: false,
    maxFiles: 5,
  },
  render: (args) => {
    const [uploads, setUploads] = useState<MediaUpload[]>([]);
    return (
      <div style={{ maxWidth: '600px' }}>
        <MediaUploader
          {...args}
          onUploadComplete={(media) => {
            setUploads([...uploads, media]);
            console.log('Upload complete:', media);
          }}
          onUploadError={(error) => console.error('Upload error:', error)}
        />
        {uploads.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h4>Uploaded Media:</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {uploads.map((media) => (
                <div key={media.mediaId}>
                  <img
                    src={media.url}
                    alt=""
                    style={{
                      maxWidth: '150px',
                      maxHeight: '150px',
                      borderRadius: '4px',
                    }}
                  />
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    {media.width}x{media.height}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  },
};

export const AvatarUpload: Story = {
  args: {
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'demo-project',
    token: 'demo-token',
    type: 'avatar',
    iconOnly: false,
    maxFiles: 1,
    accept: 'image/*',
  },
  render: (args) => {
    const [avatar, setAvatar] = useState<MediaUpload | null>(null);
    return (
      <div style={{ maxWidth: '600px' }}>
        <h4>Upload Avatar (200x200px)</h4>
        <MediaUploader
          {...args}
          onUploadComplete={(media) => {
            setAvatar(media);
            console.log('Avatar uploaded:', media);
          }}
          onUploadError={(error) => console.error('Upload error:', error)}
        />
        {avatar && (
          <div style={{ marginTop: '1rem' }}>
            <h4>Current Avatar:</h4>
            <img
              src={avatar.url}
              alt="Avatar"
              style={{
                width: '200px',
                height: '200px',
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
          </div>
        )}
      </div>
    );
  },
};
