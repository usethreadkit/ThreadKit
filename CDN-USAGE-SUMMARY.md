# CDN Bundle Summary

## What We Built

✅ **Consistent CDN bundles across all packages** with standardized naming:

```
react/dist/cdn/
├── threadkit.min.js                    # 110KB gzipped (React bundled)
└── threadkit.nonbundled-react.min.js   # 52KB gzipped (external React)

svelte/dist/cdn/
├── threadkit.min.js                    # 42KB gzipped (Svelte bundled)
└── threadkit.nonbundled-svelte.min.js  # 22KB gzipped (external Svelte)

core/dist/cdn/
└── threadkit.min.js                    # 11KB gzipped (framework-agnostic)
```

## Build Commands

```bash
# Build React CDN bundles
pnpm --filter @threadkit/react build:cdn

# Build Svelte CDN bundles
pnpm --filter @threadkit/svelte build:cdn

# Build Core CDN bundle
pnpm --filter @threadkit/core build:cdn

# Build all
pnpm build:cdn  # (add this to root package.json)
```

## Package.json Exports

All packages now export CDN bundles:

```json
{
  "exports": {
    "./cdn": "./dist/cdn/threadkit.min.js",
    "./cdn/standalone": "./dist/cdn/threadkit.min.js",
    "./cdn/nonbundled-{framework}": "./dist/cdn/threadkit.nonbundled-{framework}.min.js"
  }
}
```

## Documentation Created

- **`CDN-USAGE.md`** - Complete usage guide with examples
- **`bench/RESULTS.md`** - Updated with CDN bundle sizes and fair comparisons

## Next Steps

1. Test Svelte and Core CDN builds
2. Add bundle size badges to README
3. Host on CDN (jsDelivr/unpkg work automatically)
4. Document in main README

## Comparison Results

**Self-Hosted (Fair Comparison):**
- ThreadKit: **110KB** (1 request)
- Isso: 123KB (12 requests)
- Remark42: 404KB (11 requests)

**SaaS (Different use case):**
- Hyvor Talk: 2,107KB - privacy-focused but feature-rich
- Disqus: 3,305KB - includes ads/tracking

ThreadKit is the smallest self-hosted option! 🎉
