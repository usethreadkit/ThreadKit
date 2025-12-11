#!/usr/bin/env node

/**
 * Test actual comment widget embeds, not marketing pages
 */

import { chromium } from 'playwright';

async function testPage(url: string, name: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const resources: Array<{ url: string; size: number; domain: string }> = [];

  page.on('response', async (response) => {
    try {
      const url = response.url();
      const body = await response.body().catch(() => null);
      if (!body) return;

      const domain = new URL(url).hostname;
      resources.push({ url, size: body.length, domain });
    } catch (e) {}
  });

  console.log(`\nTesting ${name}:`);
  console.log(`URL: ${url}\n`);

  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);

  // Group by domain
  const byDomain = new Map<string, number>();
  resources.forEach(r => {
    byDomain.set(r.domain, (byDomain.get(r.domain) || 0) + r.size);
  });

  const sorted = Array.from(byDomain.entries()).sort((a, b) => b[1] - a[1]);

  console.log('Resources by domain:');
  sorted.forEach(([domain, bytes]) => {
    const kb = (bytes / 1024).toFixed(2);
    const count = resources.filter(r => r.domain === domain).length;
    console.log(`  ${kb}KB (${count} requests) - ${domain}`);
  });

  await browser.close();
}

async function main() {
  // Try different pages that might have actual embeds
  await testPage('https://talk.hyvor.com/docs', 'Hyvor Talk Docs');
  await testPage('https://talk.hyvor.com/docs/comments', 'Hyvor Talk Comments Doc');

  // Try Disqus blog post
  await testPage('https://blog.disqus.com/the-web-is-a-customer-service-medium', 'Disqus Blog Post');
}

main().catch(console.error);
