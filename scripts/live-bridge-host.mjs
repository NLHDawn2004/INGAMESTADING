import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createLiveBridgeHost} from './live-bridge-runtime.mjs';

const [major,minor]=process.versions.node.split('.').map(Number);
if(major<22||(major===22&&minor<13))throw Error('Live bridge cần Node.js >=22.13.');
const projectRoot=dirname(dirname(fileURLToPath(import.meta.url)));
const host=createLiveBridgeHost({projectRoot,bridgePath:join(projectRoot,'scripts','live-scoreboard-bridge.mjs'),dataRoot:join(projectRoot,'.local-bridge'),nodeArgs:major===22&&minor<18?['--experimental-strip-types']:[]});
host.server.listen(5184,'127.0.0.1',()=>console.log('Overlay Studio local bridge host ready at 127.0.0.1:5184.'));
const shutdown=async()=>{await host.close();process.exit(0);};
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
