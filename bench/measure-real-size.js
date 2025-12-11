#!/usr/bin/env node

/**
 * Measure actual network payload of comment systems
 * This loads real pages and measures total JS transferred
 */

import { chromium } from 'playwright';

async function measurePageWeight(url, name, waitForSelector) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  let totalSize = 0;
  let jsSize = 0;
  let requests = 0;
  let thirdPartyRequests = 0;
  const domain = new URL(url).hostname;

  // Track all network requests
  page.on('response', async (response) => {
    try {
      const responseUrl = response.url();
      const responseDomain = new URL(responseUrl).hostname;
      const contentType = response.headers()['content-type'] || '';
      const body = await response.body().catch(() => Buffer.from([]));
      const size = body.length;

      totalSize += size;
      requests++;

      if (responseDomain !== domain) {
        thirdPartyRequests++;
      }

      if (contentType.includes('javascript') || responseUrl.endsWith('.js')) {
        jsSize += size;
      }
    } catch (e) {
      // Ignore errors from failed requests
    }
  });

  console.log(`\n📊 Measuring ${name}...`);
  console.log(`URL: ${url}`);

  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  if (waitForSelector) {
    try {
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    } catch (e) {
      console.log(`  ⚠️  Selector ${waitForSelector} not found (continuing anyway)`);
    }
  }

  // Wait a bit more for lazy-loaded resources
  await page.waitForTimeout(3000);

  await browser.close();

  return {
    name,
    totalSize,
    jsSize,
    requests,
    thirdPartyRequests,
  };
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)}KB`;
}

async function main() {
  console.log('🚀 Real-World Comment System Bundle Size Benchmark');
  console.log('==================================================\n');
  console.log('Measuring actual network traffic on live pages...\n');

  const measurements = [];

  // Test Disqus on a real site that uses it
  // Using Disqus's own blog as an example
  try {
    const disqus = await measurePageWeight(
      'https://blog.disqus.com/the-web-is-a-customer-service-medium',
      'Disqus',
      '#disqus_thread'
    );
    measurements.push(disqus);
  } catch (e) {
    console.error(`❌ Disqus measurement failed: ${e.message}`);
    measurements.push({
      name: 'Disqus',
      error: e.message,
    });
  }

  // Test a page without comments as baseline
  try {
    const baseline = await measurePageWeight(
      'https://blog.disqus.com/the-web-is-a-customer-service-medium',
      'Baseline (same page, measuring before Disqus loads)',
      null
    );
    // This is a rough baseline - ideally we'd block Disqus scripts
  } catch (e) {
    console.error(`❌ Baseline measurement failed: ${e.message}`);
  }

  console.log('\n==================================================');
  console.log('📊 Results');
  console.log('==================================================\n');

  console.log('| System | Total Size | JS Size | Requests | 3rd Party |');
  console.log('|--------|------------|---------|----------|-----------|');

  for (const m of measurements) {
    if (m.error) {
      console.log(`| ${m.name} | ERROR | - | - | - |`);
    } else {
      console.log(
        `| ${m.name} | ${formatBytes(m.totalSize)} | ${formatBytes(m.jsSize)} | ${m.requests} | ${m.thirdPartyRequests} |`
      );
    }
  }

  console.log('\n');

  // Save results
  const results = {
    timestamp: new Date().toISOString(),
    measurements: measurements.map((m) =>
      m.error
        ? { name: m.name, error: m.error }
        : {
            name: m.name,
            totalSize: m.totalSize,
            jsSize: m.jsSize,
            requests: m.requests,
            thirdPartyRequests: m.thirdPartyRequests,
          }
    ),
  };

  const fs = await import('fs');
  fs.writeFileSync(
    'bench/playwright-results.json',
    JSON.stringify(results, null, 2)
  );

  console.log('Results saved to: bench/playwright-results.json\n');
}

main().catch(console.error);
