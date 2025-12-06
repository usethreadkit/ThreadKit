import { describe, it, expect } from 'vitest';
import { createMediaPreviewPlugin, mediaPreviewPlugin } from '../src/index';

describe('createMediaPreviewPlugin', () => {
  describe('plugin structure', () => {
    it('returns a plugin with correct name', () => {
      const plugin = createMediaPreviewPlugin();
      expect(plugin.name).toBe('media-preview');
    });

    it('has findSegments function', () => {
      const plugin = createMediaPreviewPlugin();
      expect(typeof plugin.findSegments).toBe('function');
    });

    it('has styles', () => {
      const plugin = createMediaPreviewPlugin();
      expect(plugin.styles).toBeDefined();
      expect(plugin.styles).toContain('threadkit-video-embed');
    });
  });

  describe('YouTube detection', () => {
    it('finds youtube.com/watch?v= URLs', () => {
      const plugin = createMediaPreviewPlugin();
      const text = 'Check out https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.type).toBe('video-embed');
      expect(segments[0].instruction.props.provider).toBe('youtube');
      expect(segments[0].instruction.props.videoId).toBe('dQw4w9WgXcQ');
    });

    it('finds youtu.be URLs', () => {
      const plugin = createMediaPreviewPlugin();
      const text = 'Check out https://youtu.be/dQw4w9WgXcQ';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.props.provider).toBe('youtube');
      expect(segments[0].instruction.props.videoId).toBe('dQw4w9WgXcQ');
    });

    it('can be disabled via options', () => {
      const plugin = createMediaPreviewPlugin({ youtube: false });
      const text = 'Check out https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(0);
    });
  });

  describe('Vimeo detection', () => {
    it('finds vimeo.com URLs', () => {
      const plugin = createMediaPreviewPlugin();
      const text = 'Watch https://vimeo.com/123456789';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.type).toBe('video-embed');
      expect(segments[0].instruction.props.provider).toBe('vimeo');
      expect(segments[0].instruction.props.videoId).toBe('123456789');
    });

    it('can be disabled via options', () => {
      const plugin = createMediaPreviewPlugin({ vimeo: false });
      const text = 'Watch https://vimeo.com/123456789';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(0);
    });
  });

  describe('Spotify detection', () => {
    it('finds Spotify track URLs', () => {
      const plugin = createMediaPreviewPlugin();
      const text = 'Listen to https://open.spotify.com/track/abc123def456';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.type).toBe('spotify-embed');
      expect(segments[0].instruction.props.type).toBe('track');
      expect(segments[0].instruction.props.id).toBe('abc123def456');
    });

    it('finds Spotify album URLs', () => {
      const plugin = createMediaPreviewPlugin();
      const text = 'Album: https://open.spotify.com/album/abc123';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.props.type).toBe('album');
    });

    it('finds Spotify playlist URLs', () => {
      const plugin = createMediaPreviewPlugin();
      const text = 'Playlist: https://open.spotify.com/playlist/xyz789';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.props.type).toBe('playlist');
    });

    it('can be disabled via options', () => {
      const plugin = createMediaPreviewPlugin({ spotify: false });
      const text = 'Listen to https://open.spotify.com/track/abc123';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(0);
    });
  });

  describe('SoundCloud detection', () => {
    it('finds SoundCloud URLs', () => {
      const plugin = createMediaPreviewPlugin();
      const text = 'Listen to https://soundcloud.com/artist-name/track-name';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.type).toBe('soundcloud-embed');
    });

    it('can be disabled via options', () => {
      const plugin = createMediaPreviewPlugin({ soundcloud: false });
      const text = 'Listen to https://soundcloud.com/artist/track';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(0);
    });
  });

  describe('Giphy detection', () => {
    it('finds Giphy URLs', () => {
      const plugin = createMediaPreviewPlugin();
      const text = 'LOL https://giphy.com/gifs/funny-abc123xyz';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.type).toBe('giphy-embed');
      expect(segments[0].instruction.props.id).toBe('abc123xyz');
    });

    it('finds media.giphy.com URLs', () => {
      const plugin = createMediaPreviewPlugin();
      const text = 'GIF: https://media.giphy.com/media/abc123xyz/giphy.gif';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.type).toBe('giphy-embed');
    });

    it('can be disabled via options', () => {
      const plugin = createMediaPreviewPlugin({ giphy: false });
      const text = 'LOL https://giphy.com/gifs/abc123';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(0);
    });
  });

  describe('Twitch detection', () => {
    it('finds clips.twitch.tv URLs', () => {
      const plugin = createMediaPreviewPlugin();
      const text = 'Check https://clips.twitch.tv/AmazingClip123';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.type).toBe('video-embed');
      expect(segments[0].instruction.props.provider).toBe('twitch');
      expect(segments[0].instruction.props.videoId).toBe('AmazingClip123');
    });

    it('can be disabled via options', () => {
      const plugin = createMediaPreviewPlugin({ twitch: false });
      const text = 'Check https://clips.twitch.tv/AmazingClip123';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(0);
    });
  });

  describe('image detection', () => {
    it('finds .jpg URLs', () => {
      const plugin = createMediaPreviewPlugin();
      const text = 'Image: https://example.com/photo.jpg';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.type).toBe('image-preview');
      expect(segments[0].instruction.props.src).toBe('https://example.com/photo.jpg');
    });

    it('finds .png URLs', () => {
      const plugin = createMediaPreviewPlugin();
      const text = 'Image: https://example.com/image.png';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.type).toBe('image-preview');
    });

    it('finds .gif URLs', () => {
      const plugin = createMediaPreviewPlugin();
      const text = 'GIF: https://example.com/animation.gif';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.type).toBe('image-preview');
    });

    it('finds .webp URLs', () => {
      const plugin = createMediaPreviewPlugin();
      const text = 'Image: https://example.com/image.webp';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.type).toBe('image-preview');
    });

    it('can be disabled via options', () => {
      const plugin = createMediaPreviewPlugin({ images: false });
      const text = 'Image: https://example.com/photo.jpg';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(0);
    });
  });

  describe('video file detection', () => {
    it('finds .mp4 URLs', () => {
      const plugin = createMediaPreviewPlugin();
      const text = 'Video: https://example.com/video.mp4';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.type).toBe('video-preview');
    });

    it('finds .webm URLs', () => {
      const plugin = createMediaPreviewPlugin();
      const text = 'Video: https://example.com/video.webm';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.type).toBe('video-preview');
    });

    it('can be disabled via options', () => {
      const plugin = createMediaPreviewPlugin({ videos: false });
      const text = 'Video: https://example.com/video.mp4';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(0);
    });
  });

  describe('audio file detection', () => {
    it('finds .mp3 URLs', () => {
      const plugin = createMediaPreviewPlugin();
      const text = 'Audio: https://example.com/song.mp3';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.type).toBe('audio-preview');
    });

    it('finds .wav URLs', () => {
      const plugin = createMediaPreviewPlugin();
      const text = 'Audio: https://example.com/sound.wav';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(1);
      expect(segments[0].instruction.type).toBe('audio-preview');
    });

    it('can be disabled via options', () => {
      const plugin = createMediaPreviewPlugin({ audio: false });
      const text = 'Audio: https://example.com/song.mp3';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(0);
    });
  });

  describe('options', () => {
    it('uses defaultExpanded option', () => {
      const plugin = createMediaPreviewPlugin({ defaultExpanded: true });
      const text = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const segments = plugin.findSegments!(text);

      expect(segments[0].instruction.props.defaultExpanded).toBe(true);
    });

    it('defaults to collapsed', () => {
      const plugin = createMediaPreviewPlugin();
      const text = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const segments = plugin.findSegments!(text);

      expect(segments[0].instruction.props.defaultExpanded).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for text without media', () => {
      const plugin = createMediaPreviewPlugin();
      const text = 'Just plain text without any media links';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(0);
    });

    it('handles empty string', () => {
      const plugin = createMediaPreviewPlugin();
      const segments = plugin.findSegments!('');

      expect(segments).toHaveLength(0);
    });

    it('finds multiple media links', () => {
      const plugin = createMediaPreviewPlugin();
      const text = 'YouTube: https://youtu.be/dQw4w9WgXcQ Vimeo: https://vimeo.com/123';
      const segments = plugin.findSegments!(text);

      expect(segments).toHaveLength(2);
    });
  });
});

describe('mediaPreviewPlugin', () => {
  it('is a pre-configured plugin instance', () => {
    expect(mediaPreviewPlugin.name).toBe('media-preview');
    expect(typeof mediaPreviewPlugin.findSegments).toBe('function');
  });
});
