import {readPose,visible} from './space-pose.js';
export const GAMES={
 jungle:{name:'مغامرة الغابة',icon:'🌴',duration:60,colors:['#123e3d','#366c51'],intro:'اجمع الفاكهة، وانزل تحت الفروع، وارفع إيديك لتعدّي الجذوع، وافرد دراعاتك لعبور الجسر.',controls:'← → للحركة • W إيديك فوق • S افرد دراعاتك • ↓ انزل',tasks:[['duck','🌿','فرع واطي! انزل تحته','انزل بجسمك بهدوء • أو اضغط ↓'],['boost','🪵','جذع في الطريق! ارفع إيديك','ارفع إيديك لتعدّيه • أو اضغط W — مفيش قفز حقيقي'],['shield','🌉','جسر رفيع! افرد دراعاتك','افرد دراعاتك على الجنب • أو اضغط S']]},
 bubbles:{name:'فرقعة الفقاعات',icon:'🫧',duration:45,colors:['#164d70','#68548e'],intro:'المس الفقاعات بإيديك! فقاعات مميزة بتحتاج إيديك فوق، أو دراعات مفرودة، أو النزول. مفيش خسارة فرص.',controls:'حرّك المؤشر بالأسهم واضغط Space • أو المس الفقاعات • W إيديك فوق • S افرد دراعاتك • D انزل'},
 superhero:{name:'تدريب الأبطال',icon:'🦸',duration:60,colors:['#212450','#563a79'],intro:'كسّر الأهداف الخيالية بمد إيدك، اصدّ كرات الطاقة، وميّل جسمك أو انزل لتفاديها. تدريب من غير خسارة فرص.',controls:'← → ميل • Space مد إيدك • S صدّ • ↓ انزل',tasks:[['punch','💥','كسّر الهدف! مد إيدك لقدام','مد إيد واحدة لقدام ورجّعها • أو اضغط Space'],['block','🛡️','كرة طاقة! إيديك قدام وشك','ارفع إيديك قدام وشك للصدّ • أو اضغط S'],['left','↖️','تفادى الشعاع! ميّل شمال','ميّل جسمك للشمال • أو اضغط ←'],['right','↗️','تفادى الشعاع! ميّل يمين','ميّل جسمك لليمين • أو اضغط →'],['duck','⚡','الشعاع فوق! انزل بهدوء','انزل بجسمك • أو اضغط ↓']]},
 animals:{name:'حركات الحيوانات',icon:'🐾',duration:60,colors:['#344e43','#879361'],intro:'قلّد الحيوانات واثبت على كل وضعية شوية: زرافة طويلة، طائر، ضفدع، وفلامنجو. مفيش خسارة فرص.',controls:'W زرافة • S طائر • ↓ ضفدع • B فلامنجو',tasks:[['boost','🦒','خليك طويل زي الزرافة!','ارفع إيديك الاتنين فوق • أو اضغط W'],['shield','🦜','افرد جناحاتك زي الطائر!','افرد دراعاتك على الجنب • أو اضغط S'],['duck','🐸','انزل بهدوء زي الضفدع!','اثني رجليك وانزل شوية • أو اضغط ↓'],['balance','🦩','ارفع ركبة زي الفلامنجو!','ارفع ركبة واحدة براحتك • أو اضغط B']]}
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function extraPose(lm,baseline){
 const p=readPose(lm,baseline);if(!p)return null;
 const shoulderY=(lm[11].y+lm[12].y)/2;
 p.block=[15,16].every(i=>visible(lm[i])&&lm[i].y<shoulderY+.07&&lm[i].y>shoulderY-.22&&Math.abs(lm[i].x-(1-p.x))<.16)&&Math.abs(lm[15].x-lm[16].x)<.25&&!p.shield;
 p.punch=[[15,11],[16,12]].some(([w,s])=>visible(lm[w])&&Number.isFinite(lm[w].z)&&Number.isFinite(lm[s].z)&&lm[w].z<lm[s].z-.2&&lm[w].y< p.hipY-.05)&&!p.block&&!p.boost&&!p.shield;
 p.balance=[25,26].every(i=>visible(lm[i]))&&Math.abs(lm[25].y-lm[26].y)>p.torso*.4&&!p.duck;
 return p;
}
export function createRound(game){if(!GAMES[game])throw new Error('Unknown game');const s={game,elapsed:0,score:0,health:3,completed:0,x:480,cursor:{x:.5,y:.5},objects:[],particles:[],spawn:0,taskIndex:0,taskAge:0,hold:0,done:false,success:false,celebrate:0,over:false};if(game==='bubbles')for(let i=0;i<6;i++)addBubble(s);return s;}
function addBubble(s){const action=[null,null,null,'boost','shield','duck'][Math.floor(Math.random()*6)];let x=.12+Math.random()*.76,y=.2+Math.random()*.56;if(action==='boost')y=.16;if(action==='shield'){x=Math.random()<.5?.16:.84;y=.38;}if(action==='duck')y=.78;s.objects.push({x,y,r:.055+Math.random()*.015,action,hold:0,phase:Math.random()*6,life:0});}
export function currentTask(s){return GAMES[s.game].tasks?.[s.taskIndex%GAMES[s.game].tasks.length]??null;}
export function step(s,dt,input={}){
 if(s.over)return;dt=clamp(dt,0,.05);s.elapsed=Math.min(GAMES[s.game].duration,s.elapsed+dt);if(s.elapsed>=GAMES[s.game].duration){s.over=true;return;}
 s.x=input.x!==undefined?clamp(input.x,65,895):clamp(s.x+((input.right?1:0)-(input.left?1:0))*420*dt,65,895);
 if(input.cursor)s.cursor={x:clamp(input.cursor.x,.04,.96),y:clamp(input.cursor.y,.08,.92)};
 else{s.cursor.x=clamp(s.cursor.x+((input.right?1:0)-(input.left?1:0))*.6*dt,.04,.96);s.cursor.y=clamp(s.cursor.y+((input.down?1:0)-(input.up?1:0))*.6*dt,.08,.92);}
 if(s.game==='bubbles'){
  const hands=input.hands??(input.pop?[s.cursor]:[]);
  for(const b of s.objects){b.life+=dt;const hit=hands.some(h=>Math.hypot((h.x-b.x)*960,(h.y-b.y)*540)<b.r*540+25);b.hold=hit&&(!b.action||input[b.action])?b.hold+dt:0;
   if((hit&&input.tap&&!b.action)||b.hold>=(b.action ? .35 : .09)){b.dead=true;s.score+=b.action?5:1;s.completed++;s.particles.push({x:b.x*960,y:b.y*540,life:.65,label:b.action?'+5':'+1'});}}
  s.objects=s.objects.filter(b=>!b.dead&&b.life<14);while(s.objects.length<6)addBubble(s);
 }else{
  s.taskAge+=dt;const task=currentTask(s),need=s.game==='animals'?1.5:.65;
  if(!s.done&&s.taskAge>=1.5){s.hold=input[task[0]]?s.hold+dt:Math.max(0,s.hold-dt*2);
   if(s.hold>=need){s.done=true;s.success=true;s.completed++;s.score+=10;s.particles.push({x:480,y:200,life:1,label:'✨ +10'});}
   else if(s.taskAge>=(s.game==='superhero'?5:7)){s.done=true;s.success=false;if(s.game==='jungle'){s.health--;if(s.health<=0)s.over=true;}}}
  if(s.done)s.celebrate+=dt;
  if(s.celebrate>1.25){s.taskIndex++;s.taskAge=0;s.hold=0;s.done=false;s.success=false;s.celebrate=0;}
  if(s.game==='jungle'){s.spawn-=dt;if(s.spawn<=0){s.objects.push({x:85+Math.random()*790,y:-30});s.spawn=.9;}
   for(const fruit of s.objects){fruit.y+=170*dt;if(Math.hypot(fruit.x-s.x,fruit.y-440)<55){fruit.dead=true;s.score+=2;s.particles.push({x:fruit.x,y:fruit.y,life:.65,label:'+2'});}}s.objects=s.objects.filter(f=>!f.dead&&f.y<570);}
 }
 for(const p of s.particles){p.life-=dt;p.y-=35*dt;}s.particles=s.particles.filter(p=>p.life>0);
}
