import {GAMES,createRound,currentTask,step} from './mini-rules.js';
import {MotionCamera} from './motion-camera.js';
const $=id=>document.getElementById(id),game=document.body.dataset.game,config=GAMES[game];
const canvas=$('gameCanvas'),ctx=canvas.getContext('2d'),W=960,H=540;
const camera=new MotionCamera($('webcam'),$('skeleton'),text=>{$('camStatus').textContent=text;});
let round=createRound(game),state='idle',mode='demo',lastFrame=0,blocked=false,lastCue='',requestId=0;
const keys=new Set(),pointers=new Map();let aim=null,canvasPointer=null,tap=false,active={};
const keyMap={ArrowLeft:'left',ArrowRight:'right',ArrowUp:game==='bubbles'?'up':'boost',ArrowDown:game==='bubbles'?'down':'duck',w:'boost',s:game==='superhero'?'block':'shield',d:'duck',b:'balance',' ':game==='bubbles'?'pop':'punch'};
function clear(){keys.clear();pointers.clear();canvasPointer=null;tap=false;active={};}
function overlay(icon,title,text){$('overlayIcon').textContent=icon;$('overlayTitle').textContent=title;$('overlayText').textContent=text;$('overlay').classList.remove('hidden');}
function hide(){$('overlay').classList.add('hidden');}
function stopCamera(){requestId++;camera.stop();$('camIdle').hidden=false;$('calibrate').hidden=true;$('indicator').textContent='● غير متصلة';}
function start(nextMode){document.activeElement?.blur();clear();aim=null;mode=nextMode;round=createRound(game);state='playing';blocked=false;lastCue='';$('restart').hidden=true;$('pause').disabled=false;$('pause').textContent='⏸ إيقاف مؤقت';hide();hud();}
function finish(){state='over';clear();stopCamera();$('pause').disabled=true;$('restart').hidden=false;overlay('🏅','برافو يا بطل!',`جمعت ${round.score} نقطة ${game==='bubbles'?'وفرقعت '+round.completed+' فقاعة':'ونجحت في '+round.completed+' حركات'}! اختار «مرة كمان» وجرب تحط رقم جديد.`);hud();}
function pause(){if(state==='playing'){state='paused';clear();overlay('⏸','خد وقتك','اضغط «كمّل اللعب» لما تكون جاهز.');$('pause').textContent='▶ كمّل اللعب';}else if(state==='paused'){document.activeElement?.blur();state='playing';hide();$('pause').textContent='⏸ إيقاف مؤقت';}}
async function startCamera(){if(camera.loading)return;state='loading';clear();$('pause').disabled=true;const token=++requestId;$('startCamera').disabled=true;overlay('📷','بنجهّز الكاميرا','اسمح باستخدام الكاميرا وانتظر التحميل. تقدر تختار التجربة بدون كاميرا في أي وقت.');try{const ok=await camera.start();if(ok&&token===requestId){start('camera');$('camIdle').hidden=true;$('calibrate').hidden=false;$('indicator').textContent='● الكاميرا شغالة';}}catch(error){if(token!==requestId)return;stopCamera();state='idle';const text=error.name==='NotAllowedError'?'إذن الكاميرا اترفض. اسمح باستخدامها أو اختار التجربة بدون كاميرا.':'تعذر تشغيل الكاميرا. اتأكد من الإنترنت واستخدم localhost أو HTTPS، أو جرّب الأزرار.';$('camStatus').textContent=text;overlay('📷','نجرّب الأزرار؟',text);}finally{$('startCamera').disabled=false;}}
function hud(){
 $('score').textContent=round.score;$('hearts').textContent=game==='jungle'?'♥'.repeat(round.health)+'♡'.repeat(3-round.health):round.completed;$('time').textContent=Math.ceil(config.duration-round.elapsed);
 const task=currentTask(round),cue=game==='bubbles'?'bubbles':`${round.taskIndex}:${round.done}:${round.success}`;
 if(cue!==lastCue){lastCue=cue;$('missionTitle').textContent=game==='bubbles'?'🫧 المس الفقاعات بإيديك!':round.done?(round.success?'✨ ممتاز! الحركة نجحت +١٠':'💛 ولا يهمك، نجرب الحركة الجاية!'):task[1]+' '+task[2];$('missionHelp').textContent=game==='bubbles'?'العادية = نقطة • المميزة = ٥ نقاط: 🙌 إيديك فوق، 👐 افرد دراعاتك، 🧎 انزل':round.done?'خد نفس واستعد للحركة الجاية.':task[3];}
 $('missionProgress').style.width=game==='bubbles'?round.elapsed/config.duration*100+'%':Math.min(100,round.hold/(game==='animals'?1.5:.65)*100)+'%';
 for(const b of document.querySelectorAll('[data-control]')){const on=!!active[b.dataset.control];b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));}
}
function getInput(){const input={};for(const k of keys)input[k]=true;for(const k of pointers.values())input[k]=true;if(aim&&(canvasPointer!==null||tap))input.cursor={...aim};if(canvasPointer!==null||tap)input.pop=true;if(tap)input.tap=true;return input;}
function tick(dt,now){if(state!=='playing')return;
 let input=getInput();if(mode==='camera'){camera.poll(now);if(!camera.ready(now)){if(!blocked){blocked=true;overlay('📷',camera.baseline?'خلينا نشوفك تاني':'وقفة البداية',camera.baseline?'الوقت واقف لحد ما ترجع. خلي جسمك وإيديك ظاهرين.':'قف مستقيم وإيديك لتحت لمدة ثانيتين.');}return;}
  if(blocked){blocked=false;hide();}const p=camera.pose,lean=p.x-camera.baseline.x;input={...p,x:480+lean*2000,left:lean<-.075,right:lean>.075};
 }
 active=input;step(round,dt,input);tap=false;hud();if(round.over)finish();
}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function text(label,x,y,size=40,color='#fff'){ctx.font=`bold ${size}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(label,x,y);}
function path(points,color,width=8){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.stroke();}
function avatar(x,y){const duck=active.duck,up=active.boost,wide=active.shield,body=duck?30:58;ellipse(x,y+15,34,9,'#0003');path([[x,y],[x-16,y+10]],'#d9edce',9);path([[x,y],[x+16,y+10]],'#d9edce',9);path([[x,y-8],[x,y-body]],'#ffc273',26);ellipse(x,y-body-19,20,21,'#ffdbac');ellipse(x-6,y-body-22,2,3,'#283b3b');ellipse(x+6,y-body-22,2,3,'#283b3b');path([[x-8,y-body+8],[x-(wide?58:up?32:30),y-body+(up?-40:wide?5:35)]],'#ffdbac',9);path([[x+8,y-body+8],[x+(wide?58:up?32:30),y-body+(up?-40:wide?5:35)]],'#ffdbac',9);}
function draw(){const t=round.elapsed;const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,config.colors[0]);bg.addColorStop(1,config.colors[1]);ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 if(game==='jungle')drawJungle(t);if(game==='bubbles')drawBubbles(t);if(game==='superhero')drawHero(t);if(game==='animals')drawAnimals(t);
 for(const p of round.particles){ctx.globalAlpha=Math.min(1,p.life*2);text(p.label,p.x,p.y,30,'#fff4ab');}ctx.globalAlpha=1;
 if(game!=='bubbles'&&state==='playing'&&!round.done){text(round.taskAge<1.5?'استعد…':game==='animals'?'اثبت شوية على الوضعية':'اعمل الحركة المطلوبة',480,38,21,'#eaf7e8');}
}
function drawJungle(t){
 for(let i=0;i<10;i++){const x=i*110-20;ctx.fillStyle='#12382f';ctx.fillRect(x,0,22,440);ellipse(x+10,60,95,100,i%2?'#256248':'#318364');}
 ctx.fillStyle='#b2a172';ctx.beginPath();ctx.moveTo(400,110);ctx.lineTo(560,110);ctx.lineTo(850,H);ctx.lineTo(110,H);ctx.fill();
 for(let i=0;i<9;i++)ellipse(40+i*113,510,40,55,'#4b9762');
 const task=currentTask(round);if(!round.done){const py=100+Math.min(1,round.taskAge/7)*270;
 if(task[0]==='duck'){path([[170,py],[790,py+10]],'#8d6248',28);for(let i=0;i<6;i++)ellipse(220+i*100,py-15,30,12,'#66b674');}
 if(task[0]==='boost'){path([[220,py],[740,py]],'#865a3e',45);path([[250,py-13],[710,py-13]],'#b78659',4);}
 if(task[0]==='shield'){ctx.fillStyle='#164947';ctx.fillRect(180,py-30,600,100);for(let i=0;i<8;i++){ctx.fillStyle='#b49a70';ctx.fillRect(350+i*34,py-25,27,90);}path([[330,py-35],[650,py-35]],'#e0d4b2',5);}}
 for(const f of round.objects)text('🥭',f.x,f.y,40);avatar(round.x,455);
}
function drawBubbles(t){
 for(let i=0;i<9;i++)ellipse((i*137)%W,((i*93-t*12)%H+H)%H,20+i*3,20+i*3,'#ffffff08');
 for(const b of round.objects){const x=b.x*W,y=b.y*H,r=b.r*H;ellipse(x,y,r,r,b.action?'#e7a2ed44':'#9cefff33');ctx.strokeStyle=b.action?'#ffd48e':'#b1eeff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();ellipse(x-r*.3,y-r*.4,r*.2,r*.12,'#ffffff99');if(b.action)text({boost:'🙌',shield:'👐',duck:'🧎'}[b.action],x,y,25);}
 const hands=mode==='camera'?camera.pose?.hands??[]:[round.cursor];for(const h of hands){ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(h.x*W,h.y*H,17,0,Math.PI*2);ctx.stroke();text('✦',h.x*W,h.y*H,16,'#ffe18e');}text(mode==='camera'?'إيديك هي المؤشر ✋':'المس الفقاعة أو وجّه المؤشر بالأسهم + Space',480,500,21,'#e7f2ff');
}
function drawHero(t){
 for(let i=0;i<14;i++){const h=80+(i*67)%150;ctx.fillStyle=i%2?'#181b3d':'#29244b';ctx.fillRect(i*76,450-h,65,h+90);for(let j=0;j<4;j++){ctx.fillStyle='#b9aff544';ctx.fillRect(i*76+16,465-h+j*27,10,10);}}
 const action=currentTask(round)[0],done=round.done;
 for(let i=0;i<5;i++)path([[0,470+i*17],[960,470+i*17]],'#9d7fea22',2);
 if(!done){if(action==='punch'){ellipse(480,220,70,70,'#ffd383');ellipse(480,220,43,43,'#ec8f92');text('🎯',480,220,60);}
 if(action==='block'){ellipse(480,220,65+Math.sin(t*4)*5,65,'#8ae3ff');text('⚡',480,220,55);}
 if(action==='left'||action==='right'){ctx.fillStyle='#ff9cc63d';const hazard=action==='left'?620:200;ctx.fillRect(hazard,100,140,350);text(action==='left'?'↖️':'↗️',480,210,90);}
 if(action==='duck')path([[90,235],[870,235]],'#ffb3ec',18);}
 const px=round.x;ctx.fillStyle='#f58db9';ctx.beginPath();ctx.moveTo(px-25,365);ctx.lineTo(px-70,470);ctx.lineTo(px+70,470);ctx.lineTo(px+25,365);ctx.fill();avatar(px,455);if(active.block){ellipse(px,370,46,46,'#8ae3ff66');text('🛡️',px,370,62);}if(active.punch)text('💥',px,310,60);
}
function drawAnimals(t){
 ellipse(170,150,75,75,'#f9df9955');for(let i=0;i<6;i++)ellipse(i*190,460,160,90,i%2?'#a2b97d':'#7fa275');ctx.fillStyle='#749962';ctx.fillRect(0,460,W,80);
 const task=currentTask(round);ellipse(480,280,145,145,'#ffffff1c');text(task[1],480,255,150);text(task[2],480,390,28,'#fffbe7');
 const icons=['🦒','🦜','🐸','🦩'];for(let i=0;i<4;i++){const x=270+i*140;ellipse(x,475,35,35,i===round.taskIndex%4?'#ffe5a3':'#ffffff22');text(icons[i],x,475,36);}if(round.done&&round.success)text('🌟',650,160,70);
}
$('startCamera').addEventListener('click',startCamera);$('startDemo').addEventListener('click',()=>{stopCamera();start('demo');$('camStatus').textContent='بتلعب بالكيبورد أو أزرار الشاشة.';});$('restart').addEventListener('click',()=>mode==='camera'?startCamera():start('demo'));$('pause').addEventListener('click',pause);$('calibrate').addEventListener('click',()=>{camera.calibrate();blocked=false;});
window.addEventListener('keydown',e=>{if(e.target?.closest?.('[data-control]'))return;const k=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(k&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)&&!(e.key===' '&&['BUTTON','A'].includes(document.activeElement?.tagName))){e.preventDefault();keys.add(k);}if(e.key==='Escape'&&!e.repeat)pause();});window.addEventListener('keyup',e=>{const k=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(k)keys.delete(k);});
for(const b of document.querySelectorAll('[data-control]')){b.setAttribute('aria-pressed','false');b.addEventListener('keydown',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();keys.add(b.dataset.control);}});b.addEventListener('keyup',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();keys.delete(b.dataset.control);}});b.addEventListener('pointerdown',e=>{e.preventDefault();pointers.set(e.pointerId,b.dataset.control);b.setPointerCapture(e.pointerId);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>pointers.delete(e.pointerId));}
function aimAt(e){const r=canvas.getBoundingClientRect();aim={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};}
if(game==='bubbles'){canvas.addEventListener('pointerdown',e=>{e.preventDefault();aimAt(e);tap=true;canvasPointer=e.pointerId;canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(canvasPointer===e.pointerId)aimAt(e);});for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(canvasPointer===e.pointerId)canvasPointer=null;});}
window.addEventListener('blur',()=>{clear();if(state==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});window.addEventListener('pagehide',()=>{requestId++;camera.close();});
function frame(now){const dt=Math.min(.05,(now-lastFrame)/1000||0);lastFrame=now;tick(dt,now);draw();requestAnimationFrame(frame);}hud();requestAnimationFrame(frame);
