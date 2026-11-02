import type {NextConfig} from 'next';
import path from 'node:path';
const config:NextConfig={
 turbopack:{resolveAlias:{'cloudflare:workers':'./lib/vercel-env.ts'}},
 webpack(config,{webpack}){config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^cloudflare:workers$/,path.resolve(process.cwd(),'lib/vercel-env.ts')));config.resolve.alias['cloudflare:workers']=path.resolve(process.cwd(),'lib/vercel-env.ts');return config;},
 experimental:{serverActions:{bodySizeLimit:'4mb'}},
};
export default config;
