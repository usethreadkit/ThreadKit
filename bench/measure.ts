#!/usr/bin/env node

/**
 * Real-world bundle size benchmark
 * Loads actual pages using different comment systems and measures network traffic
 *
 * IMPORTANT: Only measures resources from the comment system's domains, not the entire page.
 * This ensures fair comparisons between systems.
 */

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

// Domain filters for each comment system - only count resources from these domains
// IMPORTANT: We exclude tracking/analytics domains (Google Analytics, HubSpot, etc.)
// We also exclude user-uploaded media in comments (media.disquscdn.com)
const SYSTEM_DOMAINS = {
  'Disqus': ['c.disquscdn.com', 'disqus.com'], // Exclude media.disquscdn.com (user uploads)
  'Isso': ['isso-comments.de', 'posativ.org'],
  'Remark42': ['remark42.com'],
  'Comentario': ['comentario.com', 'cdn.comentario.com', 'commento.io'],
  'Hyvor Talk': ['talk.hyvor.com/talk/', 'hyvor.com/talk/'], // Only the embed script, not docs site
  'ThreadKit': ['usethreadkit.com', 'threadkit.com', 'cdn.jsdelivr.net/npm/@threadkit'],
};

function shouldCountResource(url: string, systemName: string): boolean {
  const domains = SYSTEM_DOMAINS[systemName];
  if (!domains) return false;

  return domains.some(domain => url.includes(domain));
}

async function measureCommentSystem(url, name, commentSelector) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let totalBytes = 0;
  let jsBytes = 0;
  let cssBytes = 0;
  let requestCount = 0;
  const resources = [];

  page.on('response', async (response) => {
    try {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      const body = await response.body().catch(() => null);

      if (!body) return;

      // FAIRNESS: Only count resources from the comment system's domains
      if (!shouldCountResource(url, name)) {
        return; // Skip host page's CSS, images, fonts, etc.
      }

      const size = body.length;
      totalBytes += size;
      requestCount++;

      const isJS = contentType.includes('javascript') || url.endsWith('.js');
      const isCSS = contentType.includes('css') || url.endsWith('.css');

      if (isJS) jsBytes += size;
      if (isCSS) cssBytes += size;

      resources.push({ url, size, type: isJS ? 'js' : isCSS ? 'css' : 'other' });
    } catch (e) {
      // Ignore
    }
  });

  console.log(`\n📦 Measuring ${name}...`);
  console.log(`   URL: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    if (commentSelector) {
      await page.waitForSelector(commentSelector, { timeout: 10000 });
    }

    // Wait for any lazy-loaded resources
    await page.waitForTimeout(5000);
  } catch (e) {
    console.log(`   ⚠️  ${e.message}`);
  }

  await browser.close();

  return {
    name,
    url,
    totalBytes,
    jsBytes,
    cssBytes,
    requestCount,
  };
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)}KB`;
}

async function main() {
  console.log('🚀 Comment System Bundle Size Benchmark');
  console.log('=========================================\n');
  console.log('Loading real pages and measuring actual network traffic...');
  console.log('⚖️  FAIR COMPARISON: Only counting resources from comment system domains\n');

  const tests = [
    {
      name: 'Isso',
      url: 'https://isso-comments.de/',
      selector: '#isso-thread',
    },
    {
      name: 'Remark42',
      url: 'https://remark42.com/demo/',
      selector: '#remark42',
    },
    // Note: Comentario test page doesn't actually use Comentario
    // {
    //   name: 'Comentario',
    //   url: 'https://deployn.de/en/blog/self-hosted-comment-systems/',
    //   selector: '#commento',
    // },
  ];

  const results = [];

  for (const test of tests) {
    try {
      const result = await measureCommentSystem(test.url, test.name, test.selector);
      results.push(result);
      console.log(`   ✅ Total: ${formatBytes(result.totalBytes)} | JS: ${formatBytes(result.jsBytes)} | CSS: ${formatBytes(result.cssBytes)} | Requests: ${result.requestCount}`);
    } catch (e) {
      console.log(`   ❌ Failed: ${e.message}`);
      results.push({ name: test.name, error: e.message });
    }
  }

  console.log('\n=========================================');
  console.log('📊 Results');
  console.log('=========================================\n');

  console.log('| System | Total Size | JS | CSS | Requests |');
  console.log('|--------|------------|-----|-----|----------|');

  for (const r of results) {
    if (r.error) {
      console.log(`| ${r.name} | ERROR | - | - | - |`);
    } else {
      console.log(
        `| ${r.name} | ${formatBytes(r.totalBytes)} | ${formatBytes(r.jsBytes)} | ${formatBytes(r.cssBytes)} | ${r.requestCount} |`
      );
    }
  }

  console.log('\n');

  // Save JSON results
  writeFileSync(
    './results.json',
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        note: 'Measured from real pages using network traffic analysis. Only counts resources from comment system domains for fair comparison.',
        domainFilters: SYSTEM_DOMAINS,
        results,
      },
      null,
      2
    )
  );

  console.log('Results saved to results.json\n');
}

main().catch(console.error);
