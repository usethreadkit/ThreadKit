#!/usr/bin/env node

import { chromium } from 'playwright';
import { spawn } from 'child_process';

async function debug() {
  // Start server
  const server = spawn('npx', ['http-server', 'test-pages', '-p', '8767', '--cors'], {
    stdio: 'pipe',
  });

  await new Promise(resolve => setTimeout(resolve, 3000));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const resources: Array<{ url: string; size: number }> = [];

  page.on('response', async (response) => {
    try {
      const url = response.url();
      const body = await response.body().catch(() => null);
      if (!body) return;

      resources.push({ url, size: body.length });
      console.log(`${(body.length / 1024).toFixed(2)}KB - ${url}`);
    } catch (e) {}
  });

  console.log('Loading http://localhost:8767/threadkit.html...\n');
  await page.goto('http://localhost:8767/threadkit.html', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(10000);

  console.log('\n\nTotal resources:', resources.length);
  console.log('Total size:', (resources.reduce((sum, r) => sum + r.size, 0) / 1024).toFixed(2), 'KB');

  await browser.close();
  server.kill();
}

debug().catch(console.error);
