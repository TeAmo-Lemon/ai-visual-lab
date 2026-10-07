import {spawnSync} from 'node:child_process';
import {cpSync,mkdirSync} from 'node:fs';
import {verify} from './verify.mjs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
for (const name of ['transformer','attention','depth']) {
  const cwd = path.join(root,'modules',name);
  for (const args of [
    [path.join(cwd,'node_modules/typescript/bin/tsc'),'-b'],
    [path.join(cwd,'node_modules/vite/bin/vite.js'),'build','--base','./','--outDir',path.join(root,'dist/modules',name)]
  ]) {
    const result = spawnSync(process.execPath, args, {cwd, stdio:'inherit'});
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
cpSync(path.join(root,'web'),path.join(root,'dist'),{recursive:true});
mkdirSync(path.join(root,'dist/modules/cotracker'),{recursive:true});
for (const name of ['index.html','style.css','app.js','sources.js','state.js','diagrams.js']) {
  cpSync(path.join(root,'modules/cotracker',name),path.join(root,'dist/modules/cotracker',name));
}
verify(path.join(root,'dist'));
console.log('All four modules built and internal assets verified.');
