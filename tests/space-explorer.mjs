import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url).pathname.replace(/\/$/,'');
const {readPose,reachesTarget,visible}=await import(root+'/js/space-pose.js');
const lm=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));
lm[11]={x:.4,y:.3};lm[12]={x:.6,y:.3};lm[23]={x:.43,y:.6};lm[24]={x:.57,y:.6};lm[15]={x:.42,y:.7};lm[16]={x:.58,y:.7};
const baseline=readPose(lm,null);assert.equal(baseline.boost,false);assert.equal(baseline.duck,false);
lm[15]={x:.35,y:.1};lm[16]={x:.65,y:.1};assert.equal(readPose(lm,baseline).boost,true);
lm[15]={x:.1,y:.3};lm[16]={x:.9,y:.3};assert.equal(readPose(lm,baseline).shield,true);
lm[11].y+=.13;lm[12].y+=.13;lm[23].y+=.15;lm[24].y+=.15;assert.equal(readPose(lm,baseline).duck,true);
lm[23].visibility=.1;assert.equal(readPose(lm,baseline),null);assert.equal(readPose(undefined,baseline),null);
assert.equal(reachesTarget([{x:.25,y:.28}],{x:.25,y:.28}),true);assert.equal(reachesTarget([{x:.8,y:.8}],{x:.25,y:.28}),false);
const listeners={},elements=new Map(),buttons=[];
const noop=()=>{};
const context=new Proxy({createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
function el(id){if(!elements.has(id))elements.set(id,{id,textContent:'',hidden:false,disabled:false,style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop},getContext:()=>context,addEventListener:(event,cb)=>{listeners[id+':'+event]=cb;},setAttribute:noop,blur:noop});return elements.get(id);}
for(const name of ['left','right','boost','shield','duck','repair']){const b=el(name);b.dataset.control=name;buttons.push(b);}
const document={getElementById:el,querySelectorAll:()=>buttons,activeElement:el('body'),addEventListener:noop};
const window={addEventListener:(event,cb)=>{listeners['window:'+event]=cb;}};
const sandbox={document,window,console,performance:{now:()=>1000},requestAnimationFrame:noop,navigator:{},readPose,reachesTarget,visible};
vm.createContext(sandbox);
let source=fs.readFileSync(root+'/js/space-explorer.js','utf8').replace(/^import .*;\n/,'');
source+='\n globalThis.test={start,update,draw,setMission,finish,pause,calibrate,detect,stopCamera, get:()=>({state,score,health,elapsed,x,missionIndex,completed,trackingLost}), set:(v)=>{if(v.mode)mode=v.mode;if(v.pose!==undefined)pose=v.pose;if(v.baseline)baseline=v.baseline;if(v.lastSeen!==undefined)lastSeen=v.lastSeen;if(v.objects)objects=v.objects;if(v.health)health=v.health;}, inputs};';
vm.runInContext(source,sandbox);const t=sandbox.test;
t.start('demo');t.inputs.right=true;t.update(.05,1000);assert.ok(t.get().x>480);t.inputs.right=false;
for(let i=0;i<4;i++){t.start('demo');t.setMission(i);t.inputs[['boost','shield','duck','repair'][i]]=true;for(let j=0;j<58;j++)t.update(.05,1000);t.inputs[['boost','shield','duck','repair'][i]]=false;assert.equal(t.get().completed,1);}
t.start('demo');t.set({objects:[{x:480,y:420,kind:'crystal',spin:0}]});t.update(.01,1000);assert.equal(t.get().score,1);
t.set({objects:[{x:480,y:420,kind:'rock',spin:0}]});t.inputs.shield=true;t.update(.01,1000);assert.equal(t.get().health,3);t.inputs.shield=false;
t.set({objects:[{x:480,y:420,kind:'rock',spin:0}]});t.update(.01,1000);assert.equal(t.get().health,2);
t.pause();const paused=t.get().elapsed;t.update(.5,1000);assert.equal(t.get().elapsed,paused);t.pause();
t.start('camera');t.set({pose:null});t.update(.05,1000);assert.equal(t.get().elapsed,0);assert.equal(t.get().trackingLost,true);
t.start('demo');for(let i=0;i<1201&&t.get().state==='playing';i++){t.inputs.shield=true;t.inputs.boost=true;t.inputs.duck=true;t.inputs.repair=true;t.update(.05,1000);t.draw(i*50);}assert.equal(t.get().state,'over');assert.ok(t.get().elapsed>=59.9);
for(const name of ['index.html','star-motion.html','space-explorer.html']){const html=fs.readFileSync(root+'/'+name,'utf8');for(const [,href]of html.matchAll(/(?:href|src)="([^"]+)"/g)){if(!/^(https?:|#)/.test(href))assert.ok(fs.existsSync(root+'/'+href),name+' missing '+href);}}
console.log('PASS: five pose/reach actions, tracking loss, four mission rewards, steering, crystal scoring, shields, collision damage, pause, full 60-second round, and local navigation/assets.');
