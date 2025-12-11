# Bundle Size Benchmark

Real-world bundle size comparison of ThreadKit against other comment systems using Playwright to measure actual network traffic.

## Quick Start

```bash
cd bench
pnpm measure
```

This will:
1. Launch headless Chrome using Playwright
2. Load real pages using different comment systems
3. Measure total network traffic (JS, CSS, images, etc.)
4. Generate comparison results

## Current Results

See [RESULTS.md](./RESULTS.md) for the latest measurements.

**TL;DR: ThreadKit is 50x smaller than Disqus (68KB vs 3.4MB)**

## Methodology

**Fair Comparison Approach:**

- Uses Playwright (headless Chrome) to load actual web pages
- **Only counts resources from the comment system's domains** (see SYSTEM_DOMAINS in measure.ts)
- Filters out the host page's CSS, images, fonts, and other assets
- Includes all resources loaded by the comment system (JS, CSS, fonts, ads, trackers)
- All sizes reflect gzip compression as delivered over HTTP

**Example domain filters:**
- Disqus: `disqus.com`, `disquscdn.com`
- Isso: `isso-comments.de`, `posativ.org`
- ThreadKit: `cdn.jsdelivr.net/npm/@threadkit`

This ensures we're comparing apples-to-apples: only the comment system's resources, not the entire page.

## Requirements

- Node.js 18+
- pnpm
- Playwright (installed automatically via pnpm)

## Adding New Systems

Edit `measure.ts` and:

1. Add domain filters to `SYSTEM_DOMAINS`:
```typescript
const SYSTEM_DOMAINS = {
  'YourSystem': ['yoursystem.com', 'cdn.yoursystem.com'],
  // ...
};
```

2. Add a test case:
```typescript
{
  name: 'YourSystem',
  url: 'https://example.com/page-using-yoursystem',
  selector: '#yoursystem-container', // Optional: wait for this selector
},
```

Then run `pnpm measure` to include it in the benchmark.

## Why This Approach?

Previous approaches that just measured bundle file sizes were misleading:
- Disqus's embed.js is only 26KB, but then loads ~3.4MB of additional resources
- Need to measure what users actually download, not just the initial script
- Real page loads reveal the full cost including ads, tracking, fonts, etc.

## Output

- `results.json` - Raw measurement data
- `RESULTS.md` - Formatted comparison table
