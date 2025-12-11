#!/usr/bin/env node

import { chromium } from 'playwright';

async function debugHyvorTalk() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const resources: Array<{ url: string; size: number; type: string }> = [];

  page.on('response', async (response) => {
    try {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';
      const body = await response.body().catch(() => null);
      if (!body) return;

      resources.push({
        url,
        size: body.length,
        type: contentType
      });
    } catch (e) {}
  });

  console.log('Loading https://talk.hyvor.com/...\n');
  await page.goto('https://talk.hyvor.com/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);

  // Show all resources sorted by size
  resources.sort((a, b) => b.size - a.size);

  console.log('Top 30 resources by size:\n');
  resources.slice(0, 30).forEach(r => {
    const domain = new URL(r.url).hostname;
    console.log(`${(r.size / 1024).toFixed(2)}KB - ${domain} - ${r.url.substring(0, 100)}`);
  });

  console.log('\n\nAll unique domains:\n');
  const domains = [...new Set(resources.map(r => new URL(r.url).hostname))];
  domains.sort().forEach(d => {
    const domainResources = resources.filter(r => new URL(r.url).hostname === d);
    const totalBytes = domainResources.reduce((sum, r) => sum + r.size, 0);
    console.log(`${d} - ${(totalBytes / 1024).toFixed(2)}KB (${domainResources.length} requests)`);
  });

  await browser.close();
}

debugHyvorTalk().catch(console.error);
