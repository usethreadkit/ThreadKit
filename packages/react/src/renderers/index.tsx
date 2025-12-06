import React from 'react';
import type { PluginRenderInstruction } from '@threadkit/core';
import { LatexRenderer } from './LatexRenderer';
import { CodeBlockRenderer } from './CodeBlockRenderer';
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

// Re-export individual renderers for direct use
export { LatexRenderer } from './LatexRenderer';
export { CodeBlockRenderer } from './CodeBlockRenderer';
export {
  VideoEmbedRenderer,
  SpotifyEmbedRenderer,
  SoundCloudEmbedRenderer,
  GiphyEmbedRenderer,
  CoubEmbedRenderer,
  ImagePreviewRenderer,
  VideoPreviewRenderer,
  AudioPreviewRenderer,
} from './MediaRenderers';

/**
 * Registry of plugin renderers.
 * Maps instruction types to React components.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pluginRenderers: Record<string, React.ComponentType<any>> = {
  // LaTeX plugin
  'latex': LatexRenderer,

  // Syntax highlight plugin
  'code-block': CodeBlockRenderer,

  // Media preview plugin
  'video-embed': VideoEmbedRenderer,
  'spotify-embed': SpotifyEmbedRenderer,
  'soundcloud-embed': SoundCloudEmbedRenderer,
  'giphy-embed': GiphyEmbedRenderer,
  'coub-embed': CoubEmbedRenderer,
  'image-preview': ImagePreviewRenderer,
  'video-preview': VideoPreviewRenderer,
  'audio-preview': AudioPreviewRenderer,
};

/**
 * Render a plugin instruction using the appropriate renderer.
 * Returns null if no renderer is registered for the instruction type.
 */
export function renderPluginInstruction(
  instruction: PluginRenderInstruction,
  key: string | number
): React.ReactNode {
  const Renderer = pluginRenderers[instruction.type];
  if (!Renderer) {
    console.warn(`No renderer registered for plugin instruction type: ${instruction.type}`);
    return null;
  }
  return <Renderer key={key} {...instruction.props} />;
}

/**
 * Register a custom plugin renderer.
 * Use this to add support for custom plugin types.
 */
export function registerPluginRenderer(
  type: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderer: React.ComponentType<any>
): void {
  pluginRenderers[type] = renderer;
}
