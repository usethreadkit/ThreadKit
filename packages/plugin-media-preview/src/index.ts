import type { ThreadKitPlugin, PluginSegment } from '@threadkit/core';

// URL patterns
const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\S*)?/g;
const VIMEO_REGEX = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)(?:\S*)?/g;
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

export interface MediaPreviewPluginOptions {
  /** Start media expanded instead of collapsed - default false */
  defaultExpanded?: boolean;
  /** Enable YouTube embeds - default true */
  youtube?: boolean;
  /** Enable Vimeo embeds - default true */
  vimeo?: boolean;
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

/**
 * Props for video embed renderer (YouTube, Vimeo, Twitch)
 */
export interface VideoEmbedRenderProps {
  videoId: string;
  url: string;
  provider: 'youtube' | 'vimeo' | 'twitch';
  defaultExpanded: boolean;
}

/**
 * Props for Spotify embed renderer
 */
export interface SpotifyEmbedRenderProps {
  type: string;
  id: string;
  originalUrl: string;
  defaultExpanded: boolean;
}

/**
 * Props for SoundCloud embed renderer
 */
export interface SoundCloudEmbedRenderProps {
  url: string;
  defaultExpanded: boolean;
}

/**
 * Props for Giphy embed renderer
 */
export interface GiphyEmbedRenderProps {
  id: string;
  originalUrl: string;
  defaultExpanded: boolean;
}

/**
 * Props for Coub embed renderer
 */
export interface CoubEmbedRenderProps {
  id: string;
  originalUrl: string;
  defaultExpanded: boolean;
}

/**
 * Props for image preview renderer
 */
export interface ImagePreviewRenderProps {
  src: string;
  defaultExpanded: boolean;
}

/**
 * Props for video file preview renderer
 */
export interface VideoPreviewRenderProps {
  src: string;
  defaultExpanded: boolean;
}

/**
 * Props for audio file preview renderer
 */
export interface AudioPreviewRenderProps {
  src: string;
  defaultExpanded: boolean;
}

export function createMediaPreviewPlugin(options: MediaPreviewPluginOptions = {}): ThreadKitPlugin {
  const {
    defaultExpanded = false,
    youtube = true,
    vimeo = true,
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
    findSegments: (text: string): PluginSegment[] => {
      const segments: PluginSegment[] = [];

      // YouTube videos
      if (youtube) {
        YOUTUBE_REGEX.lastIndex = 0;
        let match;
        while ((match = YOUTUBE_REGEX.exec(text)) !== null) {
          segments.push({
            start: match.index,
            end: match.index + match[0].length,
            instruction: {
              type: 'video-embed',
              props: {
                videoId: match[1],
                url: match[0],
                provider: 'youtube',
                defaultExpanded,
              } satisfies VideoEmbedRenderProps,
            },
          });
        }
      }

      // Vimeo videos
      if (vimeo) {
        VIMEO_REGEX.lastIndex = 0;
        let match;
        while ((match = VIMEO_REGEX.exec(text)) !== null) {
          segments.push({
            start: match.index,
            end: match.index + match[0].length,
            instruction: {
              type: 'video-embed',
              props: {
                videoId: match[1],
                url: match[0],
                provider: 'vimeo',
                defaultExpanded,
              } satisfies VideoEmbedRenderProps,
            },
          });
        }
      }

      // Twitch clips
      if (twitch) {
        TWITCH_CLIP_REGEX.lastIndex = 0;
        let match;
        while ((match = TWITCH_CLIP_REGEX.exec(text)) !== null) {
          segments.push({
            start: match.index,
            end: match.index + match[0].length,
            instruction: {
              type: 'video-embed',
              props: {
                videoId: match[1],
                url: match[0],
                provider: 'twitch',
                defaultExpanded,
              } satisfies VideoEmbedRenderProps,
            },
          });
        }
      }

      // Spotify embeds
      if (spotify) {
        SPOTIFY_REGEX.lastIndex = 0;
        let match;
        while ((match = SPOTIFY_REGEX.exec(text)) !== null) {
          segments.push({
            start: match.index,
            end: match.index + match[0].length,
            instruction: {
              type: 'spotify-embed',
              props: {
                type: match[1],
                id: match[2],
                originalUrl: match[0],
                defaultExpanded,
              } satisfies SpotifyEmbedRenderProps,
            },
          });
        }
      }

      // SoundCloud embeds
      if (soundcloud) {
        SOUNDCLOUD_REGEX.lastIndex = 0;
        let match;
        while ((match = SOUNDCLOUD_REGEX.exec(text)) !== null) {
          segments.push({
            start: match.index,
            end: match.index + match[0].length,
            instruction: {
              type: 'soundcloud-embed',
              props: {
                url: match[0],
                defaultExpanded,
              } satisfies SoundCloudEmbedRenderProps,
            },
          });
        }
      }

      // Giphy embeds
      if (giphy) {
        GIPHY_REGEX.lastIndex = 0;
        let match;
        while ((match = GIPHY_REGEX.exec(text)) !== null) {
          segments.push({
            start: match.index,
            end: match.index + match[0].length,
            instruction: {
              type: 'giphy-embed',
              props: {
                id: match[1],
                originalUrl: match[0],
                defaultExpanded,
              } satisfies GiphyEmbedRenderProps,
            },
          });
        }
      }

      // Coub embeds
      if (coub) {
        COUB_REGEX.lastIndex = 0;
        let match;
        while ((match = COUB_REGEX.exec(text)) !== null) {
          segments.push({
            start: match.index,
            end: match.index + match[0].length,
            instruction: {
              type: 'coub-embed',
              props: {
                id: match[1],
                originalUrl: match[0],
                defaultExpanded,
              } satisfies CoubEmbedRenderProps,
            },
          });
        }
      }

      // Video files
      if (videos) {
        VIDEO_REGEX.lastIndex = 0;
        let match;
        while ((match = VIDEO_REGEX.exec(text)) !== null) {
          segments.push({
            start: match.index,
            end: match.index + match[0].length,
            instruction: {
              type: 'video-preview',
              props: {
                src: match[0],
                defaultExpanded,
              } satisfies VideoPreviewRenderProps,
            },
          });
        }
      }

      // Audio files
      if (audio) {
        AUDIO_REGEX.lastIndex = 0;
        let match;
        while ((match = AUDIO_REGEX.exec(text)) !== null) {
          segments.push({
            start: match.index,
            end: match.index + match[0].length,
            instruction: {
              type: 'audio-preview',
              props: {
                src: match[0],
                defaultExpanded,
              } satisfies AudioPreviewRenderProps,
            },
          });
        }
      }

      // Images (last, as it's the most general)
      if (images) {
        IMAGE_REGEX.lastIndex = 0;
        let match;
        while ((match = IMAGE_REGEX.exec(text)) !== null) {
          // Skip if overlaps with other segments
          const start = match.index;
          const end = match.index + match[0].length;
          const overlaps = segments.some(
            (seg) => start < seg.end && end > seg.start
          );
          if (!overlaps) {
            segments.push({
              start,
              end,
              instruction: {
                type: 'image-preview',
                props: {
                  src: match[0],
                  defaultExpanded,
                } satisfies ImagePreviewRenderProps,
              },
            });
          }
        }
      }

      return segments;
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
