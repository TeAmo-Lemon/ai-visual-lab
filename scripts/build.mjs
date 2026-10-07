import {spawnSync} from 'node:child_process';
import {cpSync} from 'node:fs';
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
verify(path.join(root,'dist'));
console.log('All three modules built and internal assets verified.');
