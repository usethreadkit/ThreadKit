import React from 'react';
import type {
  VideoEmbedRenderProps,
  SpotifyEmbedRenderProps,
  SoundCloudEmbedRenderProps,
  GiphyEmbedRenderProps,
  CoubEmbedRenderProps,
  ImagePreviewRenderProps,
  VideoPreviewRenderProps,
  AudioPreviewRenderProps,
} from '@threadkit/plugin-media-preview';

// ============================================================================
// ExpandableMedia - Common wrapper for all media types
// ============================================================================

interface ExpandableMediaProps {
  type: 'image' | 'video' | 'audio' | 'embed';
  url: string;
  label: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

/**
 * ExpandableMedia demonstrates how plugins can add interactivity with vanilla JavaScript and CSS.
 * - Shows the URL as a clickable link
 * - The button uses onClick to toggle the 'expanded' class on the container
 * - CSS handles the visual state changes (icon rotation, content visibility)
 * - No React state needed - just DOM manipulation and CSS!
 */
function ExpandableMedia({ type, url, label, children, defaultExpanded = false }: ExpandableMediaProps) {
  // Vanilla JS handler that toggles a class on the parent element
  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const container = e.currentTarget.closest('.threadkit-expandable-media');
    if (container) {
      container.classList.toggle('expanded');
    }
  };

  return (
    <span className={`threadkit-expandable-media ${defaultExpanded ? 'expanded' : ''}`}>
      <a href={url} target="_blank" rel="noopener noreferrer" className="threadkit-media-link">{url}</a>
      <button
        className="threadkit-media-toggle"
        onClick={handleToggle}
        type="button"
        aria-label={`Expand ${type}: ${label}`}
        title={`Click to ${defaultExpanded ? 'collapse' : 'expand'} preview`}
      >
        <svg className="threadkit-media-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      <span className="threadkit-media-content">
        {children}
      </span>
    </span>
  );
}

// ============================================================================
// Video Embed Renderer (YouTube, Vimeo, Twitch)
// ============================================================================

export function VideoEmbedRenderer({ videoId, url, provider, defaultExpanded }: VideoEmbedRenderProps) {
  const srcMap = {
    youtube: `https://www.youtube-nocookie.com/embed/${videoId}`,
    vimeo: `https://player.vimeo.com/video/${videoId}`,
    twitch: `https://clips.twitch.tv/embed?clip=${videoId}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}`,
  };

  const labelMap = {
    youtube: 'YouTube',
    vimeo: 'Vimeo',
    twitch: 'Twitch Clip',
  };

  return (
    <ExpandableMedia
      type="embed"
      url={url}
      label={labelMap[provider]}
      defaultExpanded={defaultExpanded}
    >
      <div className="threadkit-video-embed">
        <iframe
          src={srcMap[provider]}
          title={`${provider} video`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </ExpandableMedia>
  );
}

// ============================================================================
// Spotify Embed Renderer
// ============================================================================

export function SpotifyEmbedRenderer({ type, id, originalUrl, defaultExpanded }: SpotifyEmbedRenderProps) {
  const src = `https://open.spotify.com/embed/${type}/${id}`;
  return (
    <ExpandableMedia type="audio" url={originalUrl} label={`Spotify ${type}`} defaultExpanded={defaultExpanded}>
      <iframe
        className="threadkit-spotify-embed"
        src={src}
        title="Spotify embed"
        allow="encrypted-media"
      />
    </ExpandableMedia>
  );
}

// ============================================================================
// SoundCloud Embed Renderer
// ============================================================================

export function SoundCloudEmbedRenderer({ url, defaultExpanded }: SoundCloudEmbedRenderProps) {
  const src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`;
  return (
    <ExpandableMedia type="audio" url={url} label="SoundCloud" defaultExpanded={defaultExpanded}>
      <iframe
        className="threadkit-soundcloud-embed"
        src={src}
        title="SoundCloud embed"
      />
    </ExpandableMedia>
  );
}

// ============================================================================
// Giphy Embed Renderer
// ============================================================================

export function GiphyEmbedRenderer({ id, originalUrl, defaultExpanded }: GiphyEmbedRenderProps) {
  const src = `https://giphy.com/embed/${id}`;
  return (
    <ExpandableMedia type="image" url={originalUrl} label="Giphy" defaultExpanded={defaultExpanded}>
      <iframe
        className="threadkit-giphy-embed"
        src={src}
        title="Giphy embed"
        allowFullScreen
      />
    </ExpandableMedia>
  );
}

// ============================================================================
// Coub Embed Renderer
// ============================================================================

export function CoubEmbedRenderer({ id, originalUrl, defaultExpanded }: CoubEmbedRenderProps) {
  const src = `https://coub.com/embed/${id}?muted=false&autostart=false&originalSize=false&startWithHD=true`;
  return (
    <ExpandableMedia type="video" url={originalUrl} label="Coub" defaultExpanded={defaultExpanded}>
      <iframe
        className="threadkit-coub-embed"
        src={src}
        title="Coub embed"
        allowFullScreen
      />
    </ExpandableMedia>
  );
}

// ============================================================================
// Image Preview Renderer
// ============================================================================

export function ImagePreviewRenderer({ src, defaultExpanded }: ImagePreviewRenderProps) {
  // Extract filename for label
  const filename = src.split('/').pop()?.split('?')[0] || 'Image';
  const shortName = filename.length > 30 ? filename.slice(0, 27) + '...' : filename;

  return (
    <ExpandableMedia type="image" url={src} label={shortName} defaultExpanded={defaultExpanded}>
      <div className="threadkit-image-preview">
        <img src={src} alt="Image" loading="lazy" />
      </div>
    </ExpandableMedia>
  );
}

// ============================================================================
// Video Preview Renderer
// ============================================================================

export function VideoPreviewRenderer({ src, defaultExpanded }: VideoPreviewRenderProps) {
  const filename = src.split('/').pop()?.split('?')[0] || 'Video';
  const shortName = filename.length > 30 ? filename.slice(0, 27) + '...' : filename;

  return (
    <ExpandableMedia type="video" url={src} label={shortName} defaultExpanded={defaultExpanded}>
      <div className="threadkit-video-preview">
        <video controls preload="metadata">
          <source src={src} />
          Your browser does not support video playback.
        </video>
      </div>
    </ExpandableMedia>
  );
}

// ============================================================================
// Audio Preview Renderer
// ============================================================================

export function AudioPreviewRenderer({ src, defaultExpanded }: AudioPreviewRenderProps) {
  const filename = src.split('/').pop()?.split('?')[0] || 'Audio';
  const shortName = filename.length > 30 ? filename.slice(0, 27) + '...' : filename;

  return (
    <ExpandableMedia type="audio" url={src} label={shortName} defaultExpanded={defaultExpanded}>
      <div className="threadkit-audio-preview">
        <audio controls preload="metadata">
          <source src={src} />
          Your browser does not support audio playback.
        </audio>
      </div>
    </ExpandableMedia>
  );
}
