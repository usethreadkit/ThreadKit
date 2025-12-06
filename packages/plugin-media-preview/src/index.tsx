import React from 'react';
import type { ThreadKitPlugin, PluginSegmentCallback } from '@threadkit/react';

// URL patterns
const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\S*)?/g;
const VIMEO_REGEX = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)(?:\S*)?/g;
const TWITTER_REGEX = /https?:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/g;
const SPOTIFY_REGEX = /https?:\/\/open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/g;
const SOUNDCLOUD_REGEX = /https?:\/\/soundcloud\.com\/[\w-]+\/[\w-]+/g;
const GIPHY_REGEX = /https?:\/\/(?:media\.)?giphy\.com\/(?:gifs|media)\/(?:[\w-]+-)?([a-zA-Z0-9]+)/g;
const COUB_REGEX = /https?:\/\/coub\.com\/view\/([a-zA-Z0-9]+)/g;
const TWITCH_CLIP_REGEX = /https?:\/\/(?:clips\.twitch\.tv|www\.twitch\.tv\/\w+\/clip)\/([a-zA-Z0-9-_]+)/g;

// Match URLs ending in image extensions OR known image services
const IMAGE_REGEX = /https?:\/\/(?:[^\s<>"]+\.(?:jpg|jpeg|png|gif|webp|svg|avif)(?:\?[^\s<>"]*)?|(?:picsum\.photos|i\.imgur\.com|imgur\.com\/\w+|images\.unsplash\.com|pbs\.twimg\.com|media\.tenor\.com|i\.redd\.it|preview\.redd\.it)\/[^\s<>"]+)/gi;

// Video file URLs
const VIDEO_REGEX = /https?:\/\/[^\s<>"]+\.(?:mp4|webm|mov|m4v)(?:\?[^\s<>"]*)?/gi;

// Audio file URLs
const AUDIO_REGEX = /https?:\/\/[^\s<>"]+\.(?:mp3|wav|ogg|m4a|flac)(?:\?[^\s<>"]*)?/gi;

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

interface VideoEmbedProps {
  videoId: string;
  url: string;
  provider: 'youtube' | 'vimeo' | 'twitch';
  defaultExpanded?: boolean;
}

function VideoEmbed({ videoId, url, provider, defaultExpanded }: VideoEmbedProps) {
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

interface SpotifyEmbedProps {
  type: string;
  id: string;
  originalUrl: string;
  defaultExpanded?: boolean;
}

function SpotifyEmbed({ type, id, originalUrl, defaultExpanded }: SpotifyEmbedProps) {
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

interface SoundCloudEmbedProps {
  url: string;
  defaultExpanded?: boolean;
}

function SoundCloudEmbed({ url, defaultExpanded }: SoundCloudEmbedProps) {
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

interface GiphyEmbedProps {
  id: string;
  originalUrl: string;
  defaultExpanded?: boolean;
}

function GiphyEmbed({ id, originalUrl, defaultExpanded }: GiphyEmbedProps) {
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

interface CoubEmbedProps {
  id: string;
  originalUrl: string;
  defaultExpanded?: boolean;
}

function CoubEmbed({ id, originalUrl, defaultExpanded }: CoubEmbedProps) {
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

interface ImagePreviewProps {
  src: string;
  alt?: string;
  defaultExpanded?: boolean;
}

function ImagePreview({ src, alt, defaultExpanded }: ImagePreviewProps) {
  // Extract filename for label
  const filename = src.split('/').pop()?.split('?')[0] || 'Image';
  const shortName = filename.length > 30 ? filename.slice(0, 27) + '...' : filename;

  return (
    <ExpandableMedia type="image" url={src} label={shortName} defaultExpanded={defaultExpanded}>
      <div className="threadkit-image-preview">
        <img src={src} alt={alt || 'Image'} loading="lazy" />
      </div>
    </ExpandableMedia>
  );
}

interface VideoPreviewProps {
  src: string;
  defaultExpanded?: boolean;
}

function VideoPreview({ src, defaultExpanded }: VideoPreviewProps) {
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

interface AudioPreviewProps {
  src: string;
  defaultExpanded?: boolean;
}

function AudioPreview({ src, defaultExpanded }: AudioPreviewProps) {
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

export interface MediaPreviewPluginOptions {
  /** Start media expanded instead of collapsed - default false */
  defaultExpanded?: boolean;
  /** Enable YouTube embeds - default true */
  youtube?: boolean;
  /** Enable Vimeo embeds - default true */
  vimeo?: boolean;
  /** Enable Twitter/X embeds - default true */
  twitter?: boolean;
  /** Enable Spotify embeds - default true */
  spotify?: boolean;
  /** Enable SoundCloud embeds - default true */
  soundcloud?: boolean;
  /** Enable Giphy embeds - default true */
  giphy?: boolean;
  /** Enable Coub embeds - default true */
  coub?: boolean;
  /** Enable Twitch clip embeds - default true */
  twitch?: boolean;
  /** Enable image previews - default true */
  images?: boolean;
  /** Enable video file previews - default true */
  videos?: boolean;
  /** Enable audio file previews - default true */
  audio?: boolean;
  /** Max image width in pixels - default 500 */
  maxImageWidth?: number;
}

export function createMediaPreviewPlugin(options: MediaPreviewPluginOptions = {}): ThreadKitPlugin {
  const {
    defaultExpanded = false,
    youtube = true,
    vimeo = true,
    twitter = true,
    spotify = true,
    soundcloud = true,
    giphy = true,
    coub = true,
    twitch = true,
    images = true,
    videos = true,
    audio = true,
    maxImageWidth = 500,
  } = options;

  return {
    name: 'media-preview',
    renderTokens: (text: string, registerSegment?: PluginSegmentCallback) => {
      let keyIndex = 0;

      // Use new callback-based approach if available
      if (registerSegment) {
        // Register YouTube videos
        if (youtube) {
          YOUTUBE_REGEX.lastIndex = 0;
          let match;
          while ((match = YOUTUBE_REGEX.exec(text)) !== null) {
            registerSegment(
              match.index,
              match.index + match[0].length,
              <VideoEmbed key={`yt-${keyIndex++}`} videoId={match[1]} url={match[0]} provider="youtube" defaultExpanded={defaultExpanded} />
            );
          }
        }

        // Register Vimeo videos
        if (vimeo) {
          VIMEO_REGEX.lastIndex = 0;
          let match;
          while ((match = VIMEO_REGEX.exec(text)) !== null) {
            registerSegment(
              match.index,
              match.index + match[0].length,
              <VideoEmbed key={`vimeo-${keyIndex++}`} videoId={match[1]} url={match[0]} provider="vimeo" defaultExpanded={defaultExpanded} />
            );
          }
        }

        // Register Twitch clips
        if (twitch) {
          TWITCH_CLIP_REGEX.lastIndex = 0;
          let match;
          while ((match = TWITCH_CLIP_REGEX.exec(text)) !== null) {
            registerSegment(
              match.index,
              match.index + match[0].length,
              <VideoEmbed key={`twitch-${keyIndex++}`} videoId={match[1]} url={match[0]} provider="twitch" defaultExpanded={defaultExpanded} />
            );
          }
        }

        // Register Spotify embeds
        if (spotify) {
          SPOTIFY_REGEX.lastIndex = 0;
          let match;
          while ((match = SPOTIFY_REGEX.exec(text)) !== null) {
            registerSegment(
              match.index,
              match.index + match[0].length,
              <SpotifyEmbed key={`spotify-${keyIndex++}`} type={match[1]} id={match[2]} originalUrl={match[0]} defaultExpanded={defaultExpanded} />
            );
          }
        }

        // Register SoundCloud embeds
        if (soundcloud) {
          SOUNDCLOUD_REGEX.lastIndex = 0;
          let match;
          while ((match = SOUNDCLOUD_REGEX.exec(text)) !== null) {
            registerSegment(
              match.index,
              match.index + match[0].length,
              <SoundCloudEmbed key={`sc-${keyIndex++}`} url={match[0]} defaultExpanded={defaultExpanded} />
            );
          }
        }

        // Register Giphy embeds
        if (giphy) {
          GIPHY_REGEX.lastIndex = 0;
          let match;
          while ((match = GIPHY_REGEX.exec(text)) !== null) {
            registerSegment(
              match.index,
              match.index + match[0].length,
              <GiphyEmbed key={`giphy-${keyIndex++}`} id={match[1]} originalUrl={match[0]} defaultExpanded={defaultExpanded} />
            );
          }
        }

        // Register Coub embeds
        if (coub) {
          COUB_REGEX.lastIndex = 0;
          let match;
          while ((match = COUB_REGEX.exec(text)) !== null) {
            registerSegment(
              match.index,
              match.index + match[0].length,
              <CoubEmbed key={`coub-${keyIndex++}`} id={match[1]} originalUrl={match[0]} defaultExpanded={defaultExpanded} />
            );
          }
        }

        // Register video files
        if (videos) {
          VIDEO_REGEX.lastIndex = 0;
          let match;
          while ((match = VIDEO_REGEX.exec(text)) !== null) {
            registerSegment(
              match.index,
              match.index + match[0].length,
              <VideoPreview key={`vid-${keyIndex++}`} src={match[0]} defaultExpanded={defaultExpanded} />
            );
          }
        }

        // Register audio files
        if (audio) {
          AUDIO_REGEX.lastIndex = 0;
          let match;
          while ((match = AUDIO_REGEX.exec(text)) !== null) {
            registerSegment(
              match.index,
              match.index + match[0].length,
              <AudioPreview key={`aud-${keyIndex++}`} src={match[0]} defaultExpanded={defaultExpanded} />
            );
          }
        }

        // Register images (last, as it's the most general)
        if (images) {
          IMAGE_REGEX.lastIndex = 0;
          let match;
          while ((match = IMAGE_REGEX.exec(text)) !== null) {
            registerSegment(
              match.index,
              match.index + match[0].length,
              <ImagePreview key={`img-${keyIndex++}`} src={match[0]} defaultExpanded={defaultExpanded} />
            );
          }
        }

        return null; // Let other plugins and markdown handle the rest
      }

      // Fallback for backwards compatibility (simplified)
      return null;
    },
    styles: `
      /*
       * Media Preview Plugin - CSS + JavaScript Interactivity Example
       *
       * This demonstrates how plugins can combine CSS and JavaScript:
       * - JavaScript toggles the 'expanded' class on click
       * - CSS handles all visual states using that class
       * - Animation/transitions make the UX smooth
       */
      .threadkit-expandable-media {
        /* Inline element - flows with text */
        display: inline;
      }

      /* When expanded, switch to inline-block so block children can render properly */
      .threadkit-expandable-media.expanded {
        display: inline-block;
        vertical-align: top;
        max-width: 100%;
      }

      .threadkit-media-link {
        word-break: break-all;
      }

      /* Content is hidden by default */
      .threadkit-expandable-media .threadkit-media-content {
        display: none;
        margin-top: 8px;
        border: 1px solid var(--threadkit-border, #e5e7eb);
        border-radius: 6px;
        overflow: hidden;
        background: var(--threadkit-bg-secondary, #f9fafb);
        animation: threadkit-media-fadein 0.2s ease;
        width: fit-content;
        max-width: 100%;
      }

      /* Content is shown when parent has 'expanded' class (toggled by JavaScript) */
      .threadkit-expandable-media.expanded .threadkit-media-content {
        display: block;
      }

      @keyframes threadkit-media-fadein {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .threadkit-media-toggle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        padding: 0;
        margin: 0 3px;
        background: var(--threadkit-bg, #ffffff) !important;
        border: 2px solid var(--threadkit-border, #d1d5db) !important;
        border-radius: 4px !important;
        cursor: pointer;
        color: var(--threadkit-text-secondary, #6b7280);
        transition: all 0.15s ease;
        vertical-align: middle;
      }
      .threadkit-media-toggle:hover {
        border-color: var(--threadkit-primary, #3b82f6) !important;
        color: var(--threadkit-primary, #3b82f6);
        background: var(--threadkit-bg-hover, #f3f4f6) !important;
      }

      .threadkit-media-icon {
        width: 12px;
        height: 12px;
        flex-shrink: 0;
        transition: transform 0.15s ease;
      }

      /* Icon rotates when expanded (+ becomes ×) */
      .threadkit-expandable-media.expanded .threadkit-media-icon {
        transform: rotate(45deg);
      }

      .threadkit-expandable-media.expanded .threadkit-media-toggle {
        border-color: var(--threadkit-primary, #3b82f6);
        color: var(--threadkit-primary, #3b82f6);
      }
      .threadkit-video-embed {
        position: relative;
        width: 560px;
        max-width: 100%;
        aspect-ratio: 16 / 9;
      }
      .threadkit-video-embed iframe {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: none;
        border-radius: 6px;
      }
      .threadkit-spotify-embed {
        width: 100%;
        max-width: 400px;
        height: 152px;
        border: none;
        border-radius: 12px;
      }
      .threadkit-soundcloud-embed {
        width: 100%;
        max-width: 500px;
        height: 166px;
        border: none;
      }
      .threadkit-giphy-embed {
        width: 100%;
        max-width: 400px;
        height: 300px;
        border: none;
        border-radius: 6px;
      }
      .threadkit-coub-embed {
        width: 100%;
        max-width: 400px;
        height: 300px;
        border: none;
        border-radius: 6px;
      }
      .threadkit-image-preview img {
        max-width: min(${maxImageWidth}px, 100%);
        max-height: 400px;
        border-radius: 6px;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      .threadkit-image-preview img:hover {
        opacity: 0.9;
      }
      .threadkit-video-preview video {
        max-width: 100%;
        max-height: 400px;
        border-radius: 6px;
      }
      .threadkit-audio-preview audio {
        width: 100%;
        max-width: 400px;
      }

      /* Dark theme */
      [data-theme="dark"] .threadkit-media-toggle {
        background: var(--threadkit-bg-secondary, #374151);
        border-color: var(--threadkit-border, #4b5563);
        color: var(--threadkit-text, #f3f4f6);
      }
      [data-theme="dark"] .threadkit-media-toggle:hover {
        background: var(--threadkit-bg-hover, #4b5563);
      }
      [data-theme="dark"] .threadkit-media-content {
        background: var(--threadkit-bg-secondary, #1f2937);
        border-color: var(--threadkit-border, #4b5563);
      }
    `,
  };
}

// Default export for convenience
export const mediaPreviewPlugin = createMediaPreviewPlugin();
