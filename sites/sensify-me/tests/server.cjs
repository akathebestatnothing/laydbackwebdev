const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4174);
const types = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.xml':'application/xml','.txt':'text/plain; charset=utf-8','.json':'application/json' };
const jsonResponse = (res, status, data) => {
  res.writeHead(status, {'Content-Type':'application/json','Cache-Control':'no-store'});
  res.end(JSON.stringify(data));
};
const server = http.createServer((req,res) => {
  let pathname;
  try { pathname=decodeURIComponent(new URL(req.url,'http://local').pathname); } catch { res.writeHead(400); return res.end(); }
  // QA-only same-origin pointer. Private Gist/fallback is never actually used here.
  if (pathname==='/qa-config' && req.method==='GET') return jsonResponse(res,200,process.env.QA_API_BASE || 'http://127.0.0.1:4174');
  if (pathname==='/websites/sensify-me/enquiries' && req.method==='POST') {
    let raw=''; req.on('data',chunk=>{ raw+=chunk; if(raw.length>8192) req.destroy(); });
    return req.on('end',()=>{
      let payload; try { payload=JSON.parse(raw); } catch { if(process.env.RECORD_MOCK==='1') fs.appendFileSync(path.join(__dirname,'api-events.ndjson'),JSON.stringify({event:'parse-error',raw})+'\n'); return jsonResponse(res,400,{success:false}); }
      if(process.env.RECORD_MOCK==='1') fs.appendFileSync(path.join(__dirname,'api-events.ndjson'),JSON.stringify({event:'mock-enquiry',payload})+'\n');
      if(process.env.QA_MODE==='failure') return jsonResponse(res,503,{success:false,error:'Local simulated outage'});
      jsonResponse(res,201,{success:true,received:true,mock:true,id:payload.data?.request_id});
    });
  }
  if(!['GET','HEAD'].includes(req.method)) return jsonResponse(res,405,{error:'Method not allowed'});
  const relative = pathname==='/sites/sensify-me' ? 'index.html' : pathname.startsWith('/sites/sensify-me/') ? pathname.slice('/sites/sensify-me/'.length) || 'index.html' : pathname==='/' ? 'index.html' : pathname.replace(/^\//,'');
  const file = path.resolve(ROOT,relative);
  // Do not expose research, docs, tests or parent directories through preview server.
  if(!file.startsWith(ROOT+path.sep) || /^(research|docs|tests|evidence|\.git)(\/|$)/.test(relative)) { res.writeHead(404); return res.end('Not found'); }
  fs.stat(file,(err,stat)=>{
    if(err || !stat.isFile()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});
    if(req.method==='HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
});
server.listen(port,'127.0.0.1',()=>console.log(`Sensify QA server: http://127.0.0.1:${port}/sites/sensify-me/`));
