import assert from 'node:assert/strict';
import {fetchMatchStats} from '../lib/matchstats.ts';
const original=globalThis.fetch;
let calls=0;
globalThis.fetch=async (_url,options)=>{
 calls++;
 assert.equal(options.redirect,'manual');
 return new Response('',{status:302,headers:{Location:'https://example.com'}});
};
try {
 await assert.rejects(()=>fetchMatchStats('2109343903444019200'),/chuyển hướng/);
 assert.equal(calls,1);
 console.log('PASS: Workers-compatible manual redirect and explicit rejection of redirect responses.');
} finally {globalThis.fetch=original;}
