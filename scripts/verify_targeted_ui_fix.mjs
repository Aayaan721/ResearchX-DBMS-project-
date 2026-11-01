import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:3000';

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  console.log('--- Test 1: Direct Navigation to /discover ---');
  await page.goto(`${BASE_URL}/discover`, { waitUntil: 'networkidle0' });
  const discoverInputVal = await page.$eval('input[type="text"]', el => el.value);
  const discoverPlaceholder = await page.$eval('input[type="text"]', el => el.placeholder);
  const paperCardsCount = await page.$$eval('[data-testid="paper-card"]', els => els.length).catch(() => 0);
  const emptyStateText = await page.evaluate(() => document.body.innerText);

  console.log('  Input value:', JSON.stringify(discoverInputVal));
  console.log('  Placeholder:', JSON.stringify(discoverPlaceholder));
  assert.equal(discoverInputVal, '', 'Discover search input must be empty on direct navigation');
  assert.equal(discoverPlaceholder, 'Search research papers by topic, title, or keyword...', 'Placeholder mismatch on /discover');
  assert.ok(emptyStateText.includes('No academic papers displayed'), 'Empty state must be displayed when no query provided');
  console.log('  [PASS] Direct navigation to /discover verified.');

  console.log('\n--- Test 2: Homepage-Initiated Search to /discover ---');
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await page.type('input[placeholder*="Search global papers"]', 'deep residual learning');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  assert.ok(page.url().includes('/discover?q=deep%20residual%20learning'), `URL should have query param: ${page.url()}`);
  const populatedDiscoverVal = await page.$eval('input[type="text"]', el => el.value);
  console.log('  Populated Input value:', JSON.stringify(populatedDiscoverVal));
  assert.equal(populatedDiscoverVal, 'deep residual learning', 'Discover input must be populated from homepage search');

  // Wait for OpenAlex search results to load
  await page.waitForSelector('h3', { timeout: 10000 });
  const discoverResultsText = await page.evaluate(() => document.body.innerText);
  assert.ok(!discoverResultsText.includes('No academic papers displayed'), 'Results must be displayed for query');
  console.log('  [PASS] Homepage-initiated search to /discover verified.');

  console.log('\n--- Test 3: Direct Navigation to /similarity ---');
  await page.goto(`${BASE_URL}/similarity`, { waitUntil: 'networkidle0' });
  const similarityTextVal = await page.$eval('textarea', el => el.value);
  const similarityPlaceholder = await page.$eval('textarea', el => el.placeholder);
  const similarityHasResults = await page.evaluate(() => document.body.innerText.includes('nearest neighbors found'));

  console.log('  Textarea value:', JSON.stringify(similarityTextVal));
  console.log('  Placeholder:', JSON.stringify(similarityPlaceholder));
  assert.equal(similarityTextVal, '', 'Similarity textarea must be empty on direct navigation');
  assert.equal(similarityPlaceholder, 'Describe your research idea or problem statement...', 'Placeholder mismatch on /similarity');
  assert.equal(similarityHasResults, false, 'No automatic similarity search should be executed on direct navigation');
  console.log('  [PASS] Direct navigation to /similarity verified.');

  console.log('\n--- Test 4: Homepage-Initiated Search to /similarity ---');
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  // Switch to similarity mode on homepage hero
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const simBtn = buttons.find(b => b.textContent.includes('Similarity'));
    if (simBtn) simBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.type('input[placeholder*="Enter a project idea"]', 'neural graph collaborative filtering');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  assert.ok(page.url().includes('/similarity?q=neural%20graph%20collaborative%20filtering'), `URL should have query param: ${page.url()}`);
  const populatedSimilarityVal = await page.$eval('textarea', el => el.value);
  console.log('  Populated Textarea value:', JSON.stringify(populatedSimilarityVal));
  assert.equal(populatedSimilarityVal, 'neural graph collaborative filtering', 'Similarity textarea must be populated from homepage search');

  // Wait for pgvector similarity calculation
  await page.waitForFunction(() => document.body.innerText.includes('nearest neighbors found'), { timeout: 15000 });
  console.log('  [PASS] Homepage-initiated search to /similarity verified.');

  assert.deepEqual(consoleErrors, [], `No unexpected browser console errors allowed: ${consoleErrors.join(', ')}`);
  console.log('\n==================================================');
  console.log(' ALL TARGETED UI TESTS PASSED SUCCESSFULLY! [OK]');
  console.log('==================================================');
} finally {
  await browser.close();
}
