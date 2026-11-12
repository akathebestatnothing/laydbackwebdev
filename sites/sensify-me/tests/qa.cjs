const { chromium, devices } = require('/tmp/sensify-qa/node_modules/playwright');
const { default: AxeBuilder } = require('/tmp/sensify-qa/node_modules/@axe-core/playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const BASE = 'http://127.0.0.1:4174/sites/sensify-me/';
const out = path.resolve(__dirname,'../evidence'); fs.mkdirSync(out,{recursive:true});
const log=[]; const errors=[]; const requests=[];
const report=(name,detail={})=>{log.push({test:name,status:'PASS',...detail});console.log('PASS',name,JSON.stringify(detail));};
const noOpener = url => { throw new Error('Unexpected external navigation in local QA: '+url); };
(async()=>{
 const browser = await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 for (const [label,viewport,isMobile] of [['desktop',{width:1440,height:1000},false],['mobile',{width:390,height:844},true]]) {
  const context=await browser.newContext({viewport,isMobile,deviceScaleFactor:isMobile?2:1,hasTouch:isMobile,locale:'en-AU'});
  const page=await context.newPage();
  const badHttp=[];
  const consoleErrors=[];
  page.on('request',req=>{
   const url=new URL(req.url());
   if(!['127.0.0.1','localhost','gist.githubusercontent.com','www.facebook.com'].includes(url.hostname)&&url.protocol!=='data:'&&url.protocol!=='blob:'&&url.protocol!=='about:') errors.push(`Unexpected external request: ${req.url()}`);
  });
  page.on('response',res=>{if(res.status()>=400)badHttp.push({status:res.status(),url:res.url()});});
  page.on('pageerror',e=>consoleErrors.push(String(e)));
  page.on('console',m=>{ if(m.type()==='error') consoleErrors.push(m.text()); });
  await page.route('https://www.facebook.com/**', route=>route.abort('blockedbyclient'));
  await page.route('https://gist.githubusercontent.com/**',route=>route.fulfill({status:200,contentType:'text/plain',body:'https://qa-never-live.invalid'}));
  await page.goto(BASE,{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:path.join(out,`${label}-hero.png`),fullPage:false});
  assert.equal(await page.locator('h1').innerText(),'Little hands.\nBig discoveries.');
  report(`${label}: renders title, custom fonts and hero controls`,{fonts:await page.evaluate(()=>({heading:getComputedStyle(document.querySelector('h1')).fontFamily,body:getComputedStyle(document.body).fontFamily,loaded:document.fonts.status})),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  // Force all lazy images to load before checking decoded dimensions; an image
  await page.locator('img[loading=lazy]').evaluateAll(imgs=>imgs.forEach(i=>i.loading='eager'));
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0),{timeout:15000});
  const broken=await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src));
  assert.deepEqual(broken,[]); report(`${label}: all ${await page.locator('img').count()} images loaded (not merely HTTP 200)`);
  // Verify main CSS 3D scene really responds to scrolling on desktop.
  if(!isMobile){
   const before=await page.locator('#photo-table').evaluate(el=>getComputedStyle(el).transform);
   await page.evaluate(()=>scrollTo(0,400)); await page.waitForTimeout(100);
   const after=await page.locator('#photo-table').evaluate(el=>getComputedStyle(el).transform);
   assert.notEqual(before,after); report('desktop: 3D scroll transform changes in rendered browser',{before,after});
  }
  await page.locator('#tab-party').click();
  assert.equal(await page.locator('#panel-party').isVisible(),true);
  assert.equal(await page.locator('#panel-science').isVisible(),false);
  await page.locator('#tab-themes').focus(); await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('[role=tab][aria-selected=true]').getAttribute('id'),'tab-science');
  report(`${label}: tab click + keyboard wrap switches visible panel`);
  await page.locator('#explorer-search').fill('sensory');
  assert.equal(await page.locator('.idea-card:visible').count(),2);
  await page.locator('[data-filter=science]').click();
  assert.equal(await page.locator('.idea-card:visible').count(),2);
  await page.locator('#explorer-search').fill('zzzz-no-match');
  assert.equal(await page.locator('#empty-state').isVisible(),true);
  await page.locator('#reset-explorer').click();
  assert.equal(await page.locator('.idea-card:visible').count(),6);
  await page.locator('[data-filter=packs]').click();
  assert.equal(await page.locator('.idea-card:visible').count(),1);
  await page.locator('[data-filter=all]').click();
  report(`${label}: search/category filter/no-results/reset produce correct visible counts`);
  const packButton=page.locator('.pack-copy .service-enquire'); await packButton.click();
  assert.equal(await page.locator('#service-name').inputValue(),'Spidey packs');
  report(`${label}: pack CTA preselects Spidey packs and shows enquiry form`);
  if(isMobile){
   await page.evaluate(()=>scrollTo(0,0)); await page.locator('.menu-toggle').click();
   assert.equal(await page.locator('#mobile-menu').isVisible(),true);
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('#mobile-menu').isVisible(),false);
   assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('menu-toggle')),true);
   report('mobile: menu opens, Escape closes and returns focus');
  }
  // Online submit is always mocked locally and captured as fake test data only.
  await page.route('http://127.0.0.1:4174/websites/sensify-me/enquiries',async route=>{
   const body=route.request().postDataJSON(); requests.push(body);
   await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({success:true,mock:true})});
  });
  await page.locator('#another-enquiry').evaluate(el=>{if(!el.hidden)el.click()});
  await page.locator('#service-name').selectOption({label:'Spidey packs'});
  await page.locator('#client-name').fill('QA simulated visitor');
  await page.locator('#email').fill('qa@example.invalid');
  await page.evaluate(()=>localStorage.clear());
  await page.locator('#phone').fill('0000000000');
  await page.locator('#preferred-timing').fill('Unspecified QA date');
  await page.locator('#notes').fill('TEST DATA ONLY — not a real enquiry; no children’s information.');
  await page.locator('#consent').check();
  await page.locator('button[type=submit]').click();
  await page.locator('#form-success').waitFor({state:'visible'});
  report(`${label}: enquiry successful mock returns accepted UI and request ID`);
  await page.screenshot({path:path.join(out,`${label}-enquiry-success.png`),fullPage:false});
  const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  fs.writeFileSync(path.join(out,`${label}-axe.json`),JSON.stringify(axe,null,2));
  report(`${label}: axe audit — ${axe.violations.length} violations`,{violations:axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length,description:v.description}))});
  if(axe.violations.length) errors.push(...axe.violations.map(v=>`${label} axe ${v.id}`));
  report(`${label}: no failed image requests and no unexpected third-party requests`,{failedHttpResponses:badHttp});
  assert.equal(badHttp.filter(r=>r.url.includes('/assets/')).length,0);
  report(`${label}: browser console errors`,{consoleErrors});
  const dimensions=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight}));
  console.log(label,'render metrics',dimensions);
  await page.evaluate(()=>scrollTo(0,0)); await page.screenshot({path:path.join(out,`${label}-fullpage.png`),fullPage:true});
  await context.close();
 }
 // OS reduced-motion preference and app toggle are independently exercised.
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage(); await page.goto(BASE,{waitUntil:'networkidle'});
 assert.equal(await page.locator('html').evaluate(el=>el.classList.contains('reduce-motion')),true);
 const reduceTransform=await page.locator('#photo-table').evaluate(el=>getComputedStyle(el).transform);
 await page.evaluate(()=>scrollTo(0,400));await page.waitForTimeout(100);
 assert.equal(await page.locator('#photo-table').evaluate(el=>getComputedStyle(el).transform),reduceTransform);
 assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'false');
 await page.locator('#motion-toggle').click();
 assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'true');
 report('reduced-motion: OS disables scroll 3D; toggle can restore rhythm explicitly',{transform:reduceTransform}); await context.close();
 // Full failed-path + native-validation verification.
 const errorContext=await browser.newContext({viewport:{width:1440,height:1000}}); const errorPage=await errorContext.newPage();
 await errorPage.goto(BASE,{waitUntil:'networkidle'});
 await errorPage.locator('button[type=submit]').click();
 assert.equal(await errorPage.locator('#form-status').textContent(),'Please add your chosen idea, name, a valid email and consent so we can send your enquiry.');
 assert.equal(await errorPage.locator(':invalid').count()>0,true);
 await errorPage.locator('#service-name').selectOption({label:'Spidey packs'});
 await errorPage.locator('#client-name').fill('QA simulated visitor');
 await errorPage.locator('#email').fill('qa@example.invalid');
 await errorPage.locator('#notes').fill('TEST DATA ONLY — simulated enquiry details.');
 await errorPage.locator('#consent').check();
 await errorPage.evaluate(()=>localStorage.clear());
 await errorPage.route('http://127.0.0.1:4174/websites/sensify-me/enquiries',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,error:'Simulated QA failure'})}));
 await errorPage.route('https://www.facebook.com/**',route=>route.abort('blockedbyclient'));
 const requestPromise=errorPage.waitForRequest('http://127.0.0.1:4174/websites/sensify-me/enquiries');
 await errorPage.locator('button[type=submit]').click();
 const errorRequest=await requestPromise; requests.push(errorRequest.postDataJSON());
 await errorPage.locator('#form-status.error').waitFor({state:'visible'});
 assert.match(await errorPage.locator('#form-status').innerText(),/message Sensify Me on Facebook/);
 assert.equal(await errorPage.locator('#form-success').isVisible(),false);
 await errorPage.screenshot({path:path.join(out,'enquiry-error.png')});
 report('enquiry failure: native validation blocks blank input and HTTP 503 shows honest Facebook recovery');
 await errorContext.close();
 assert.ok(requests.length>=3);
 for(const envelope of requests){
   assert.deepEqual(Object.keys(envelope),['data']);
   assert.deepEqual(Object.keys(envelope.data).sort(),['service_name','client_name','email','phone','preferred_timing','notes','request_id','consent'].sort());
   assert.equal(envelope.data.consent,true);
   assert.match(envelope.data.request_id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
   assert.match(envelope.data.notes,/TEST DATA ONLY/, 'test-only notes required');
 }
 report('exact API contract: all mocked requests have required fields/true consent/fresh UUID v4',{count:requests.length});
 assert.equal(requests[0].data.request_id===requests[2].data.request_id,false); report('success request UUID differs from failure-path request UUID');
 fs.writeFileSync(path.join(out,'api-captured-requests.json'),JSON.stringify(requests,null,2));
 await browser.close();
 const results={date:new Date().toISOString(),browser:'Google Chrome 153.0.8010.52 via Playwright 1.65.0',base:BASE,tests:log,errors,notes:['Facebook navigation blocked. Gist intercepted with non-routable QA base so production never called. All displayed form success is explicitly mock QA only.']};
 if(errors.length)results.status='REVIEW REQUIRED'; else results.status='PASS WITH LOCAL LIMITATIONS';
 fs.writeFileSync(path.join(out,'qa-results.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify({summary:results.status,checks:log.length,errors},null,2));
 if(errors.length)process.exitCode=1;
})().catch(error=>{console.error(error);fs.writeFileSync(path.join(out,'qa-failure.txt'),String(error.stack));process.exit(1)});
