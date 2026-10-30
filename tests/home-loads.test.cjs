const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
class Element {
  constructor(){this.hidden=false;this.children=[];this.textContent='';this.dataset={};this.classList={add(){},remove(){},toggle(){}};}
  addEventListener(){} append(...items){this.children.push(...items)} appendChild(item){this.children.push(item)}
}
(async()=>{
 for(const role of [null,'jumper']){
  const elements=new Map(),errors=[];
  const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id)};
  const ctx={document:{getElementById:get,createElement:()=>new Element()},Intl,Date,console:{error:e=>errors.push(e)},SkyKefAdminAuth:{getSession:()=>role?{role,jumperKey:'42'}:null,hasWorkerRoles:()=>false,formatDate:x=>x},LoadViewTools:{start(){},success(){},failure(){},fetchJson:async url=>url.includes('/loads.json')?{1:{42:'FUN'},2:{43:'FUN'}}:url.includes('/jumpers.json')?{42:{Uid:42,Name:'Test'},43:{Uid:43,Name:'Other'}}:{date:'2026-10-30',day_start:true,end_of_day:false,in_air_load:1}},loadActivityPriority:()=>0,compareTandemAltitude:()=>0,orderAttachedVideoFlyers:x=>x,highlightPersonalLoad(){},loadSummaryLabel:()=>'',renderLoadManifest(){}};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root,'jumper-manifest-progress.js'),'utf8'),ctx);
  vm.runInContext(script,ctx);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(errors,[]);
  assert.equal(get('loadsList').children.length,2);
  assert.equal(get('todayLoadsLayout').hidden,false);
  assert.equal(get('jumperManifestSummary').hidden,role!=='jumper');
  if(role)assert.match(get('jumperManifestLoads').textContent,/CURRENT: 1/);
 }
 console.log('Home loads render for visitors and jumpers with personal summary.');
})().catch(e=>{console.error(e);process.exitCode=1});
