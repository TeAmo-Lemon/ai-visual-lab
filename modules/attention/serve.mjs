import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403).end();return;}
  let file=path;
  try{if((await stat(file)).isDirectory())file=resolve(file,'index.html')}catch{file=resolve(root,'index.html')}
  res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.writeHead(404).end('Not found')}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'端口 5173 正在使用；已有预览可直接打开。':e.message);process.exitCode=1});
server.listen(5173,'127.0.0.1',()=>console.log('Attention Lab: http://127.0.0.1:5173/'));
