#!/usr/bin/env node

/**
 * Real-world bundle size benchmark
 * Loads actual pages using different comment systems and measures network traffic
 */

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

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

  const tests = [
    {
      name: 'Disqus',
      url: 'https://blog.disqus.com/the-web-is-a-customer-service-medium',
      selector: '#disqus_thread iframe',
    },
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
    {
      name: 'Comentario',
      url: 'https://deployn.de/en/blog/self-hosted-comment-systems/',
      selector: '#commento',
    },
    {
      name: 'Hyvor Talk',
      url: 'https://talk.hyvor.com/',
      selector: '#hyvor-talk-view',
    },
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
        note: 'Measured from real pages using network traffic analysis',
        results,
      },
      null,
      2
    )
  );

  console.log('Results saved to results.json\n');
}

main().catch(console.error);
