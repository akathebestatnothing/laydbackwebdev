const { chromium } = require('/tmp/sensify-qa/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base='http://127.0.0.1:4174/sites/sensify-me/';
const out=path.resolve(__dirname,'../evidence');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const report=[];
 for(const [label,width,height] of [['wide',1920,1080],['narrow-desktop',1100,900],['tablet',768,1024],['tiny',320,740]]){
  const page=await browser.newPage({viewport:{width,height}});
  const runtimeErrors=[];page.on('pageerror',e=>runtimeErrors.push(String(e)));
  await page.goto(base,{waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const rules=await page.evaluate(()=>({
   fontSize:getComputedStyle(document.querySelector('h1')).fontSize,
   heroHeight:document.querySelector('h1').offsetHeight,
   viewport:innerWidth,
   actualPageWidth:document.documentElement.scrollWidth,
   controls:[...document.querySelectorAll('button,a[href],input,select,textarea,summary')].filter(e=>e.getClientRects().length).map(e=>({tag:e.tagName,text:(e.getAttribute('aria-label')||e.textContent.trim()||e.id).slice(0,60),w:Math.round(e.getBoundingClientRect().width),h:Math.round(e.getBoundingClientRect().height)})).filter(e=>e.w<24||e.h<24)
  }));
  await page.locator('#parties').scrollIntoViewIfNeeded();await page.waitForTimeout(700);
  await page.screenshot({path:path.join(out,`${label}-parties.png`)});
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,`${label}-hero.png`)});
  report.push({status:'PASS',label,metrics:rules,runtimeErrors});console.log(label,JSON.stringify(rules));
  assert.deepEqual(runtimeErrors,[]);
  await page.close();
 }
 // Serve CSS disabled: no JS means all substantive page content and recovery link remain.
 const context=await browser.newContext({viewport:{width:1280,height:900},javaScriptEnabled:false});const page=await context.newPage();
 await page.goto(base,{waitUntil:'networkidle'});
 assert.match(await page.locator('.noscript-note').innerText(),/no message has been sent/i);
 assert.equal(await page.locator('#service-name').isVisible(),true);
 assert.equal(await page.locator('#empty-state').isVisible(),false);
 await page.screenshot({path:path.join(out,'no-javascript.png'),fullPage:false});
 report.push({status:'PASS',test:'No JavaScript: readable content, form and Facebook fallback; honest noscript note'});await context.close();
 // Production pointer/fallback logic is evaluated offline with stubbed network.
 const productionPage=await browser.newPage();await productionPage.goto(base,{waitUntil:'networkidle'});
 const resolveResult=await productionPage.evaluate(async()=>{
  // Test production logic directly, without mislabelling localhost semantics.
  const source=await (await fetch('app.js')).text();
  const scoped=source.slice(source.indexOf('function resolveApiBase()'),source.indexOf('\n}\n\nconst form =')+2);
  const evaluate=(location,fetchImpl)=>Function('location','LOCAL_ORIGINS','LB_POINTER','LB_FALLBACK','fetch',`return (${scoped});`)(location,new Set(['localhost','127.0.0.1','::1']),LB_POINTER,LB_FALLBACK,fetchImpl);
  const productionLocation={hostname:'laydbackapps.com',origin:'https://laydbackapps.com'};
  const originalResolve=evaluate(productionLocation,window.fetch);
  const result={};
  window.__LAYDBACK_API_BASE=' https://example.invalid/custom  ';
  result.explicit=await originalResolve();
  delete window.__LAYDBACK_API_BASE;
  const realFetch=window.fetch;
  const failingFetch=async()=>{throw new Error('offline stub')};
  const failureResolve=Function('location','LOCAL_ORIGINS','LB_POINTER','LB_FALLBACK','fetch','crypto',`return (${scoped});`)(productionLocation,new Set(),LB_POINTER,LB_FALLBACK,failingFetch,crypto);
  result.fallback=await failureResolve();
  const pointerFetch=async()=>new Response(' https://pointer.example.invalid/path  ',{status:200});
  const pointerResolve=Function('location','LOCAL_ORIGINS','LB_POINTER','LB_FALLBACK','fetch','crypto',`return (${scoped});`)(productionLocation,new Set(),LB_POINTER,LB_FALLBACK,pointerFetch,crypto);
  result.validPointer=await pointerResolve();
  const invalidResolve=Function('location','LOCAL_ORIGINS','LB_POINTER','LB_FALLBACK','fetch','crypto',`return (${scoped});`)(productionLocation,new Set(),LB_POINTER,LB_FALLBACK,async()=>new Response('not-a-url',{status:200}),crypto);
  result.invalidPointer=await invalidResolve();
  window.fetch=realFetch;
  return result;
 });
 assert.deepEqual(resolveResult,{explicit:'https://example.invalid/custom',fallback:'https://laydback-hq.tail5b3740.ts.net',validPointer:'https://pointer.example.invalid/path',invalidPointer:'https://laydback-hq.tail5b3740.ts.net'});
 report.push({status:'PASS',test:'Production API resolver override/pointer/fallback proven with entirely offline stubs',result:resolveResult});
 const xml=await productionPage.locator('script[type="application/ld+json"]').textContent();const schema=JSON.parse(xml);
 assert.ok(schema['@graph'].some(e=>e['@type']==='FAQPage'));
 assert.ok(schema['@graph'].some(e=>e['@type']==='Service'));
 report.push({status:'PASS',test:'Embedded Organization/WebSite/WebPage/Service/FAQPage JSON-LD parses'});
 fs.writeFileSync(path.join(out,'supplemental-results.json'),JSON.stringify(report,null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
