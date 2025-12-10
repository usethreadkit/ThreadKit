import type { Meta, StoryObj } from '@storybook/react';
import {
  VideoEmbedRenderer,
  SpotifyEmbedRenderer,
  SoundCloudEmbedRenderer,
  GiphyEmbedRenderer,
  CoubEmbedRenderer,
  ImagePreviewRenderer,
  VideoPreviewRenderer,
  AudioPreviewRenderer,
} from './MediaRenderers';

// ============================================================================
// VideoEmbedRenderer Stories
// ============================================================================

const videoEmbedMeta = {
  title: 'Renderers/VideoEmbedRenderer',
  component: VideoEmbedRenderer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof VideoEmbedRenderer>;

export default videoEmbedMeta;
type VideoEmbedStory = StoryObj<typeof videoEmbedMeta>;

export const YouTubeCollapsed: VideoEmbedStory = {
  args: {
    provider: 'youtube',
    videoId: 'dQw4w9WgXcQ',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    defaultExpanded: false,
  },
};

export const YouTubeExpanded: VideoEmbedStory = {
  args: {
    provider: 'youtube',
    videoId: 'dQw4w9WgXcQ',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    defaultExpanded: true,
  },
};

export const VimeoVideo: VideoEmbedStory = {
  args: {
    provider: 'vimeo',
    videoId: '76979871',
    url: 'https://vimeo.com/76979871',
    defaultExpanded: true,
  },
};

export const TwitchClip: VideoEmbedStory = {
  args: {
    provider: 'twitch',
    videoId: 'EncouragingPluckyGoshawkPRChase',
    url: 'https://clips.twitch.tv/EncouragingPluckyGoshawkPRChase',
    defaultExpanded: true,
  },
};

// ============================================================================
// SpotifyEmbedRenderer Stories
// ============================================================================

const spotifyMeta = {
  title: 'Renderers/SpotifyEmbedRenderer',
  component: SpotifyEmbedRenderer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SpotifyEmbedRenderer>;

type SpotifyStory = StoryObj<typeof spotifyMeta>;

export const SpotifyTrack: SpotifyStory = {
  args: {
    type: 'track',
    id: '3n3Ppam7vgaVa1iaRUc9Lp',
    originalUrl: 'https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp',
    defaultExpanded: true,
  },
};

export const SpotifyAlbum: SpotifyStory = {
  args: {
    type: 'album',
    id: '1DFixLWuPkv3KT3TnV35m3',
    originalUrl: 'https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3',
    defaultExpanded: true,
  },
};

export const SpotifyPlaylist: SpotifyStory = {
  args: {
    type: 'playlist',
    id: '37i9dQZF1DXcBWIGoYBM5M',
    originalUrl: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    defaultExpanded: true,
  },
};

// ============================================================================
// SoundCloudEmbedRenderer Stories
// ============================================================================

const soundcloudMeta = {
  title: 'Renderers/SoundCloudEmbedRenderer',
  component: SoundCloudEmbedRenderer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SoundCloudEmbedRenderer>;

type SoundCloudStory = StoryObj<typeof soundcloudMeta>;

export const SoundCloudTrack: SoundCloudStory = {
  args: {
    url: 'https://soundcloud.com/example/track',
    defaultExpanded: true,
  },
};

export const SoundCloudCollapsed: SoundCloudStory = {
  args: {
    url: 'https://soundcloud.com/example/track',
    defaultExpanded: false,
  },
};

// ============================================================================
// GiphyEmbedRenderer Stories
// ============================================================================

const giphyMeta = {
  title: 'Renderers/GiphyEmbedRenderer',
  component: GiphyEmbedRenderer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof GiphyEmbedRenderer>;

type GiphyStory = StoryObj<typeof giphyMeta>;

export const GiphyGif: GiphyStory = {
  args: {
    id: 'l0HlNQ03J5JxX6lva',
    originalUrl: 'https://giphy.com/gifs/l0HlNQ03J5JxX6lva',
    defaultExpanded: true,
  },
};

// ============================================================================
// CoubEmbedRenderer Stories
// ============================================================================

const coubMeta = {
  title: 'Renderers/CoubEmbedRenderer',
  component: CoubEmbedRenderer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CoubEmbedRenderer>;

type CoubStory = StoryObj<typeof coubMeta>;

export const CoubVideo: CoubStory = {
  args: {
    id: '2pnhkc',
    originalUrl: 'https://coub.com/view/2pnhkc',
    defaultExpanded: true,
  },
};

// ============================================================================
// ImagePreviewRenderer Stories
// ============================================================================

const imageMeta = {
  title: 'Renderers/ImagePreviewRenderer',
  component: ImagePreviewRenderer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ImagePreviewRenderer>;

type ImageStory = StoryObj<typeof imageMeta>;

export const ImageExpanded: ImageStory = {
  args: {
    src: 'https://picsum.photos/800/600',
    defaultExpanded: true,
  },
};

export const ImageCollapsed: ImageStory = {
  args: {
    src: 'https://picsum.photos/800/600',
    defaultExpanded: false,
  },
};

export const ImageLongFilename: ImageStory = {
  args: {
    src: 'https://example.com/very-long-filename-that-should-be-truncated-for-display.jpg',
    defaultExpanded: false,
  },
};

// ============================================================================
// VideoPreviewRenderer Stories
// ============================================================================

const videoMeta = {
  title: 'Renderers/VideoPreviewRenderer',
  component: VideoPreviewRenderer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof VideoPreviewRenderer>;

type VideoStory = StoryObj<typeof videoMeta>;

export const VideoPreview: VideoStory = {
  args: {
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    defaultExpanded: true,
  },
};

export const VideoCollapsed: VideoStory = {
  args: {
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    defaultExpanded: false,
  },
};

// ============================================================================
// AudioPreviewRenderer Stories
// ============================================================================

const audioMeta = {
  title: 'Renderers/AudioPreviewRenderer',
  component: AudioPreviewRenderer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AudioPreviewRenderer>;

type AudioStory = StoryObj<typeof audioMeta>;

export const AudioPreview: AudioStory = {
  args: {
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    defaultExpanded: true,
  },
};

export const AudioCollapsed: AudioStory = {
  args: {
    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    defaultExpanded: false,
  },
};
