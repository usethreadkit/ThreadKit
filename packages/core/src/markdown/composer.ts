import type { PluginSegment, ThreadKitPlugin } from '../types';

// ============================================================================
// Segment Composition
// ============================================================================

export interface ComposedSegment extends PluginSegment {
  priority: number;
}

/**
 * Compose plugin segments, handling overlaps.
 * Earlier plugins (lower priority number) win when segments overlap.
 */
export function composeSegments(segments: ComposedSegment[]): ComposedSegment[] {
  if (segments.length === 0) return [];

  // Sort by start position, then by priority (earlier plugins win overlaps)
  const sorted = [...segments].sort((a, b) => a.start - b.start || a.priority - b.priority);

  // Remove overlapping segments (keep first/higher priority)
  const nonOverlapping: ComposedSegment[] = [];
  let lastEnd = 0;

  for (const seg of sorted) {
    if (seg.start >= lastEnd) {
      nonOverlapping.push(seg);
      lastEnd = seg.end;
    }
  }

  return nonOverlapping;
}

// ============================================================================
// Text Splitting
// ============================================================================

export type SplitPart =
  | { type: 'text'; content: string }
  | { type: 'segment'; segment: ComposedSegment };

/**
 * Split text into parts based on composed segments.
 * Returns an array of text and segment parts in order.
 */
export function splitBySegments(text: string, segments: ComposedSegment[]): SplitPart[] {
  if (segments.length === 0) {
    return [{ type: 'text', content: text }];
  }

  const parts: SplitPart[] = [];
  let currentPos = 0;

  for (const segment of segments) {
    // Add text before this segment
    if (segment.start > currentPos) {
      parts.push({
        type: 'text',
        content: text.slice(currentPos, segment.start),
      });
    }

    // Add the segment
    parts.push({ type: 'segment', segment });
    currentPos = segment.end;
  }

  // Add remaining text after last segment
  if (currentPos < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(currentPos),
    });
  }

  return parts;
}

// ============================================================================
// Plugin Processing
// ============================================================================

/**
 * Apply text transformations from all plugins
 */
export function applyPluginTransforms(text: string, plugins: ThreadKitPlugin[]): string {
  let result = text;
  for (const plugin of plugins) {
    if (plugin.transformText) {
      result = plugin.transformText(result);
    }
  }
  return result;
}

/**
 * Collect segments from all plugins
 */
export function collectPluginSegments(
  text: string,
  plugins: ThreadKitPlugin[]
): ComposedSegment[] {
  const segments: ComposedSegment[] = [];

  plugins.forEach((plugin, pluginIndex) => {
    if (plugin.findSegments) {
      const pluginSegments = plugin.findSegments(text);
      for (const seg of pluginSegments) {
        segments.push({
          ...seg,
          priority: pluginIndex,
        });
      }
    }
  });

  return composeSegments(segments);
}

/**
 * Process text through all plugins and return split parts
 */
export function processWithPlugins(
  text: string,
  plugins: ThreadKitPlugin[]
): { processedText: string; parts: SplitPart[] } {
  // Apply text transformations
  const processedText = applyPluginTransforms(text, plugins);

  // Collect and compose segments
  const segments = collectPluginSegments(processedText, plugins);

  // Split text by segments
  const parts = splitBySegments(processedText, segments);

  return { processedText, parts };
}
