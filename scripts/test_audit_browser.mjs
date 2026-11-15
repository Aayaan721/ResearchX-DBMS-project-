import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { BASE_URL, loginBrowser } from './test_helpers.mjs';
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/usr/bin/chromium'),
  headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
let passed = 0;
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const auditHeading = 'Project Table Audit History (Trigger Captured)';
  async function logout() {
    const button = await page.evaluateHandle(() => [...document.querySelectorAll('nav button')].find(e => e.textContent === 'Log out'));
    await button.asElement().click();
    await page.waitForFunction(async () => !(await (await fetch('/api/auth/me')).json()).user);
  }
  await page.goto(BASE_URL + '/projects/1', { waitUntil: 'networkidle0' });
  assert.ok(!(await page.$eval('body', e => e.innerText)).includes(auditHeading));
  console.log('PASS anonymous project remains readable without detailed audit UI'); passed++;

  await loginBrowser(page, 'Student');
  await page.goto(BASE_URL + '/projects/1', { waitUntil: 'networkidle0' });
  await page.waitForFunction(text => document.body.innerText.includes(text), {}, auditHeading);
  await logout();
  await page.waitForFunction(text => !document.body.innerText.includes(text), {}, auditHeading);
  assert.equal(new URL(page.url()).pathname, '/projects/1');
  console.log('PASS owner history disappears on logout without leaving public project'); passed++;

  await loginBrowser(page, 'OtherStudent');
  await page.goto(BASE_URL + '/projects/1', { waitUntil: 'networkidle0' });
  assert.ok(!(await page.$eval('body', e => e.innerText)).includes(auditHeading));
  console.log('PASS another Student does not receive or display historical audit values'); passed++;

  await loginBrowser(page, 'Faculty');
  await page.goto(BASE_URL + '/projects/1', { waitUntil: 'networkidle0' });
  await page.waitForFunction(text => document.body.innerText.includes(text), {}, auditHeading);
  console.log('PASS Faculty retains authorized project review/audit workflow'); passed++;

  await loginBrowser(page, 'Admin');
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  const drawer = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find(e => e.textContent.includes('System Architecture & Relational Proof')));
  await drawer.asElement().click();
  await page.waitForFunction(() => document.body.innerText.includes('Table:'));
  await logout();
  await page.waitForFunction(() => !document.body.innerText.includes('Table:'));
  assert.ok((await page.$eval('body', e => e.innerText)).includes('Detailed system audit history is available to administrators.'));
  console.log('PASS Admin global history is removed immediately on logout while statistics remain'); passed++;
  assert.deepEqual(errors, []);
  console.log(`Audit browser: ${passed} passed, 0 failed`);
} finally { await browser.close(); }
