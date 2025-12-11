#!/usr/bin/env node

import { chromium } from 'playwright';

async function findDemoLinks() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Loading Hyvor Talk homepage...\n');
  await page.goto('https://talk.hyvor.com/', { waitUntil: 'networkidle' });

  // Find demo links
  const demoLinks = await page.$$eval('a', links =>
    links
      .filter(a => a.textContent?.toLowerCase().includes('demo'))
      .map(a => ({ text: a.textContent, href: a.href }))
  );

  console.log('Demo links found:');
  demoLinks.forEach(link => console.log(`  ${link.text} -> ${link.href}`));

  await page.waitForTimeout(3000);
  await browser.close();
}

findDemoLinks().catch(console.error);
