import assert from 'node:assert/strict';
const base=process.argv[2];
assert.ok(['https://canvas-companion-luke.vercel.app','https://canvas-companion-luke-dev.vercel.app','http://localhost:3000'].includes(base));
for(const [path,options,expected] of [
 ['/',{},200],['/privacy',{},200],['/terms',{},200],['/support',{},200],['/api/session',{},200],
 ['/.well-known/oauth-protected-resource/mcp',{},200],
 ['/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})},401],
 ['/api/connection',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({schoolId:'1',token:'synthetic-invalid-token'})},401],
 ['/api/connection',{method:'POST',headers:{Origin:'https://attacker.example','Content-Type':'application/json'},body:'{}'},403],
 ['/api/maintenance',{},401]
]){
 const response=await fetch(base+path,options);assert.equal(response.status,expected,path);console.log(`${response.status} ${path}`);
 if(path.includes('well-known')){const data=await response.json();assert.equal(data.resource,base+'/mcp');assert.equal(data.authorization_servers.length,1);}
 if(path==='/api/session')assert.deepEqual(await response.json(),{email:null,connection:null});
 if(path==='/mcp')assert.ok(response.headers.get('www-authenticate')?.includes('/.well-known/oauth-protected-resource/mcp'));
}
console.log('HTTP access boundaries and discovery verified.');
