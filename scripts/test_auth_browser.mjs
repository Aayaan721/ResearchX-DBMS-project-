import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import { BASE_URL, demoAccount, loginBrowser } from './test_helpers.mjs';
const screenshots=process.env.SCREENSHOT_DIR || 'docs/evidence/level3/screenshots';
await mkdir(screenshots,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || (process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':'/usr/bin/chromium'),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
let passed=0;
try{
 const page=await browser.newPage();await page.setViewport({width:1366,height:900});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE_URL+'/projects/new',{waitUntil:'networkidle0'});
 assert.ok((await page.$eval('body',e=>e.innerText)).includes('Log in to continue'));assert.equal(await page.$('form'),null);console.log('PASS anonymous project creation screen');passed++;
 await page.goto(BASE_URL+'/login',{waitUntil:'networkidle0'});
 await page.screenshot({path:screenshots+'/login.png',fullPage:true});
 const account=await demoAccount('Student');await page.type('#username',account.username);await page.type('#password','incorrect-password');await page.click('form button');await page.waitForSelector('[role="alert"]');assert.ok((await page.$eval('[role="alert"]',e=>e.innerText)).includes('Invalid username or password'));console.log('PASS invalid-password UI');passed++;
 await loginBrowser(page,'Student');
 await page.goto(BASE_URL+'/projects/new',{waitUntil:'networkidle0'});assert.ok(await page.$('form'));assert.equal(await page.$('select'),null);assert.ok((await page.$eval('body',e=>e.innerText)).includes('(Student)'));
 await page.screenshot({path:screenshots+'/student-proposal.png',fullPage:true});console.log('PASS logged-in author shown without identity selector');passed++;
 await page.goto(BASE_URL+'/projects/6',{waitUntil:'networkidle0'});assert.equal(await page.$('a[href="/projects/6/edit"]'),null);assert.equal(await page.$('textarea[placeholder*="Enter faculty critique"]'),null);console.log('PASS student cannot see other-owner edit or review controls');passed++;
 await page.goto(BASE_URL+'/projects/6/edit',{waitUntil:'networkidle0'});await page.waitForFunction(()=>document.body.innerText.includes('You can edit only your own projects'));assert.equal(await page.$('form'),null);console.log('PASS direct edit-page restriction');passed++;
 await loginBrowser(page,'Faculty');await page.goto(BASE_URL+'/projects/1',{waitUntil:'networkidle0'});assert.ok(await page.$('textarea[placeholder*="Enter faculty critique"]'));assert.equal(await page.$('a[href="/projects/1/edit"]'),null);await page.screenshot({path:screenshots+'/faculty-review.png',fullPage:true});console.log('PASS faculty review UI and restricted project actions');passed++;
 const logout=await page.evaluateHandle(()=>[...document.querySelectorAll('nav button')].find(e=>e.textContent==='Log out'));await logout.asElement().click();await page.waitForFunction(async()=>!(await (await fetch('/api/auth/me')).json()).user);await page.goto(BASE_URL+'/projects/new',{waitUntil:'networkidle0'});assert.equal(await page.$('form'),null);console.log('PASS browser logout and protected-screen refresh');passed++;
 await loginBrowser(page,'Admin');await page.goto(BASE_URL+'/papers',{waitUntil:'networkidle0'});assert.ok((await page.$$('button[title="Delete Paper"]')).length>0);console.log('PASS Admin shared-library controls');passed++;
 await loginBrowser(page,'Student');await page.goto(BASE_URL+'/papers',{waitUntil:'networkidle0'});assert.equal((await page.$$('button[title="Delete Paper"]')).length,0);console.log('PASS Student shared-library restrictions');passed++;
 await page.evaluate(() => fetch('/api/auth/logout',{method:'POST'}));
 await page.setViewport({width:375,height:812});await page.goto(BASE_URL+'/login',{waitUntil:'networkidle0'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:screenshots+'/login-mobile.png',fullPage:true});assert.deepEqual(errors,[]);console.log('PASS mobile login layout and no page exceptions');passed++;
 console.log(`Authentication browser: ${passed} passed, 0 failed`);
}finally{await browser.close()}
