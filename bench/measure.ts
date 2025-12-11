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
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { gzipSync } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Domain filters for each comment system - only count resources from these domains
// IMPORTANT: We exclude tracking/analytics domains (Google Analytics, HubSpot, etc.)
// We also exclude user-uploaded media in comments (media.disquscdn.com)
const SYSTEM_DOMAINS = {
  'Disqus': ['c.disquscdn.com', 'disqus.com'], // Exclude media.disquscdn.com (user uploads)
  'Isso': ['isso-comments.de', 'posativ.org'],
  'Remark42': ['remark42.com'],
  'Comentario': ['comentario.com', 'cdn.comentario.com', 'commento.io', 'demo.comentario.app'],
  'Hyvor Talk': ['talk.hyvor.com'], // Includes embed.js and API calls
  'ThreadKit': ['usethreadkit.com', 'api.usethreadkit.com', 'threadkit.com', 'cdn.jsdelivr.net/npm/@threadkit'],
};

function shouldCountResource(url: string, systemName: string): boolean {
  const domains = SYSTEM_DOMAINS[systemName];
  if (!domains) return false;

  // Exclude Comentario demo page's logo
  if (systemName === 'Comentario' && url.includes('logo-800x200px.png')) {
    return false;
  }

  return domains.some(domain => url.includes(domain));
}

async function measureCommentSystem(url, name, commentSelector) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  let totalBytes = 0;
  let totalGzippedBytes = 0;
  let jsBytes = 0;
  let jsGzippedBytes = 0;
  let cssBytes = 0;
  let cssGzippedBytes = 0;
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
      const gzippedSize = gzipSync(body).length;

      totalBytes += size;
      totalGzippedBytes += gzippedSize;
      requestCount++;

      const isJS = contentType.includes('javascript') || url.endsWith('.js');
      const isCSS = contentType.includes('css') || url.endsWith('.css');

      if (isJS) {
        jsBytes += size;
        jsGzippedBytes += gzippedSize;
      }
      if (isCSS) {
        cssBytes += size;
        cssGzippedBytes += gzippedSize;
      }

      resources.push({ url, size, gzippedSize, type: isJS ? 'js' : isCSS ? 'css' : 'other' });
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
    totalGzippedBytes,
    jsBytes,
    jsGzippedBytes,
    cssBytes,
    cssGzippedBytes,
    requestCount,
  };
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)}KB`;
}

async function startServer(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const server = spawn('npx', ['http-server', 'test-pages', '-p', '8765', '--cors', '-s'], {
      cwd: __dirname,
      stdio: 'pipe',
    });

    let resolved = false;

    server.stdout?.on('data', (data) => {
      const output = data.toString();
      if (!resolved && (output.includes('Available on:') || output.includes('Hit CTRL-C'))) {
        resolved = true;
        console.log('✅ Test server started on http://localhost:8765\n');
        // Wait an extra second for server to be fully ready
        setTimeout(() => resolve(server), 1000);
      }
    });

    server.stderr?.on('data', (data) => {
      const output = data.toString();
      // http-server writes to stderr for npm warnings, ignore those
      if (!output.includes('npm warn')) {
        console.error('Server error:', output);
      }
    });

    // Fallback timeout
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log('✅ Test server started (timeout fallback)\n');
        resolve(server);
      }
    }, 5000);
  });
}

async function main() {
  console.log('🚀 Comment System Bundle Size Benchmark');
  console.log('=========================================\n');
  console.log('Starting local test server...');

  const server = await startServer();

  console.log('Loading pages and measuring actual network traffic...');
  console.log('⚖️  FAIR COMPARISON: Only counting resources from comment system domains\n');

  const tests = [
    {
      name: 'ThreadKit',
      url: 'http://localhost:8765/threadkit.html',
      selector: '#threadkit-root',
    },
    {
      name: 'Disqus',
      url: 'http://localhost:8765/disqus.html',
      selector: '#disqus_thread iframe',
    },
    {
      name: 'Hyvor Talk',
      url: 'http://localhost:8765/hyvor-talk.html',
      selector: 'hyvor-talk-comments',
    },
    {
      name: 'Comentario',
      url: 'https://demo.comentario.app/',
      selector: '#commento',
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
  ];

  const results = [];

  for (const test of tests) {
    try {
      const result = await measureCommentSystem(test.url, test.name, test.selector);
      results.push(result);
      console.log(`   ✅ Total: ${formatBytes(result.totalGzippedBytes)} gzipped (${formatBytes(result.totalBytes)} raw) | JS: ${formatBytes(result.jsGzippedBytes)} | CSS: ${formatBytes(result.cssGzippedBytes)} | Requests: ${result.requestCount}`);
    } catch (e) {
      console.log(`   ❌ Failed: ${e.message}`);
      results.push({ name: test.name, error: e.message });
    }
  }

  console.log('\n=========================================');
  console.log('📊 Results (Gzipped)');
  console.log('=========================================\n');

  console.log('| System | Total (gzipped) | JS | CSS | Requests |');
  console.log('|--------|-----------------|-----|-----|----------|');

  for (const r of results) {
    if (r.error) {
      console.log(`| ${r.name} | ERROR | - | - | - |`);
    } else {
      console.log(
        `| ${r.name} | ${formatBytes(r.totalGzippedBytes)} | ${formatBytes(r.jsGzippedBytes)} | ${formatBytes(r.cssGzippedBytes)} | ${r.requestCount} |`
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

  // Clean up server
  server.kill();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
