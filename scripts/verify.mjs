import {readdirSync,readFileSync,statSync} from 'node:fs';
import path from 'node:path';
export function verify(root,directory=root) {
  for (const entry of readdirSync(directory)) {
    const file=path.join(directory,entry);
    if(statSync(file).isDirectory())verify(root,file);
    else if(entry.endsWith('.html')) {
      const html=readFileSync(file,'utf8');
      for(const [,url]of html.matchAll(/(?:src|href)="([^"#?]+)"/g)) {
        if(/^(?:[a-z]+:|\/\/)/i.test(url))continue;
        if(url.startsWith('/'))throw Error(`Root-relative URL is incompatible with GitHub project Pages: ${url}`);
        let asset=path.resolve(path.dirname(file),url);
        if(statSync(asset).isDirectory())asset=path.join(asset,'index.html');
        if(!statSync(asset).isFile())throw Error(`Missing internal path: ${url}`);
      }
    }
  }
}
