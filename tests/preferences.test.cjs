const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../preferences.js'),'utf8');
function run(saved={},blocked=false){
 const storage={...saved},nodes=[],elements=[];
 const root={dataset:{}};
 const document={documentElement:root,body:{},addEventListener(){},createTreeWalker(){let i=-1;return {nextNode(){return ++i<nodes.length},get currentNode(){return nodes[i]}}},querySelectorAll(){return elements}};
 const context={document,window:{},NodeFilter:{SHOW_TEXT:4},localStorage:{getItem(k){if(blocked)throw Error();return storage[k]},setItem(k,v){if(blocked)throw Error();storage[k]=v}}};vm.createContext(context);vm.runInContext(source,context);
 return {api:context.window.SkyKefPreferences,root,storage,nodes};
}
let env=run();assert.equal(env.root.lang,'en');assert.equal(env.root.dir,'ltr');assert.equal(env.root.dataset.textSize,'normal');
const label={nodeValue:' Settings ',parentElement:{closest:()=>false}};
const name={nodeValue:'Settings',parentElement:{closest:()=>true}};env.nodes.push(label,name);
env.api.set('language','he');assert.equal(label.nodeValue,' הגדרות ');assert.equal(name.nodeValue,'Settings');assert.equal(env.root.dir,'rtl');
env.api.set('language','en');assert.equal(label.nodeValue,' Settings ');assert.equal(env.root.dir,'ltr');
env.api.set('language','he');label.nodeValue='My Profile';env.api.set('language','he');assert.equal(label.nodeValue,'הפרופיל שלי');env.api.set('language','en');assert.equal(label.nodeValue,'My Profile');
env.api.set('textSize','large');assert.equal(env.root.dataset.textSize,'large');assert.equal(env.storage.skykef_manifest_text_size,'large');
const restored=run(env.storage);assert.equal(restored.root.dataset.textSize,'large');
env.api.set('language','bad');assert.equal(env.root.lang,'en');env.api.set('textSize','bad');assert.equal(env.root.dataset.textSize,'large');
const unavailable=run({},true);unavailable.api.set('language','he');assert.equal(unavailable.root.dir,'rtl');
env.api.set('language','he');assert.equal(env.api.translate('Load 12 · In air'),'לוד 12 · באוויר');assert.equal(env.api.translate('3 logbook entries · newest first'),'3 רשומות ביומן · מהחדש לישן');
for(const file of fs.readdirSync(path.join(__dirname,'..')).filter(f=>f.endsWith('.html'))){const html=fs.readFileSync(path.join(__dirname,'..',file),'utf8');assert(html.indexOf('preferences.js')<html.indexOf('auth.js'));for(const script of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);}
console.log('Passed defaults, storage persistence/failure, input validation, translation round trips, live text changes, data exclusion, RTL, dynamic labels and page scripts.');
