import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const base = process.env.BASE_URL || 'http://localhost:3000';
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || (process.platform === 'win32'
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : '/usr/bin/chromium'),
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (new URL(response.url()).origin === new URL(base).origin && response.status() >= 400) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });

  for (const width of [375, 640, 700, 768, 1024, 1280, 1366]) {
    await page.setViewport({ width, height: 900 });
    await page.goto(base, { waitUntil: 'networkidle0' });
    const menu = await page.$('button[aria-label="Toggle navigation menu"]');
    if (width < 1280) {
      assert.ok(await menu.isVisible(), `Menu missing at ${width}px`);
      await menu.click();
    }

    const links = await page.evaluate(() => [...document.querySelectorAll('nav a')]
      .filter(link => link.getBoundingClientRect().width && link.getBoundingClientRect().height)
      .map(link => ({ href: link.getAttribute('href'), text: link.textContent.trim() })));
    for (const href of ['/', '/discover', '/projects', '/similarity', '/papers', '/projects/new']) {
      assert.ok(links.some(link => link.href === href), `${href} inaccessible at ${width}px`);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false,
      `Horizontal overflow at ${width}px`);

    if (width < 1280) {
      const navigation = page.waitForNavigation({ waitUntil: 'networkidle0' });
      await page.evaluate(() => [...document.querySelectorAll('nav a')]
        .find(link => link.getAttribute('href') === '/projects' && link.getBoundingClientRect().width).click());
      await navigation;
      assert.equal(new URL(page.url()).pathname, '/projects');
      assert.equal(await page.evaluate(() => [...document.querySelectorAll('nav a')]
        .some(link => link.textContent.trim() === 'Saved Papers' && link.getBoundingClientRect().width)), false,
      'Dropdown must close after navigation');
    }
    console.log(`PASS navigation and layout at ${width}px`);
  }

  const icon = await page.$eval('link[rel="icon"]', element => element.href);
  const response = await fetch(icon);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /image\/svg\+xml/);
  assert.deepEqual(errors, [], 'Browser must have no application errors or failed local resources');
  console.log('PASS favicon and browser resource checks');
} finally {
  await browser.close();
}
