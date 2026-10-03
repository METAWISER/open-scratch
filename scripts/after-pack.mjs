import { cp } from 'node:fs/promises';
import { dirname,join } from 'node:path';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
export default async function afterPack(context){
  const resources=context.electronPlatformName==='darwin'
    ?join(context.appOutDir,context.packager.appInfo.productFilename+'.app','Contents','Resources')
    :join(context.appOutDir,'resources');
  // npm vendors its dependency tree. Generic Electron file collection prunes
  // nested node_modules; retain the complete lockfile-installed tree.
  await cp(dirname(require.resolve('npm/package.json')),join(resources,'npm'),{recursive:true,dereference:true});
}
