import {extraPose} from './mini-rules.js';
import {visible} from './space-pose.js';
// One camera controller for the four new games. No permission request until start().
export class MotionCamera {
 constructor(video,canvas,onStatus){this.video=video;this.canvas=canvas;this.pen=canvas.getContext('2d');this.onStatus=onStatus;this.token=0;this.tracker=null;this.stream=null;this.pose=null;this.baseline=null;this.samples=[];this.lastSeen=0;this.lastVideo=-1;this.lastDetect=0;this.loading=false;}
 stop(){this.token++;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.srcObject=null;this.pose=null;this.pen.clearRect(0,0,320,240);}
 close(){this.stop();this.tracker?.close();this.tracker=null;}
 calibrate(){this.pose=null;this.baseline=null;this.samples=[];this.lastSeen=0;this.onStatus('قف مستقيم وإيديك لتحت لمدة ثانيتين للمعايرة.');}
 async start(){if(this.loading)return false;this.loading=true;const token=++this.token;
  try{if(!navigator.mediaDevices?.getUserMedia)throw new Error('الكاميرا محتاجة localhost أو HTTPS.');
   const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});if(token!==this.token){stream.getTracks().forEach(t=>t.stop());return false;}this.stream?.getTracks().forEach(t=>t.stop());this.stream=stream;this.video.srcObject=stream;await this.video.play();
   if(!this.tracker){const v=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/+esm');if(token!==this.token)return false;const wasm=await v.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm');const options={baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',delegate:'GPU'},runningMode:'VIDEO',numPoses:1};let tracker;try{tracker=await v.PoseLandmarker.createFromOptions(wasm,options);}catch{options.baseOptions.delegate='CPU';tracker=await v.PoseLandmarker.createFromOptions(wasm,options);}if(token!==this.token){tracker.close();return false;}this.tracker=tracker;}
   if(token!==this.token)return false;this.lastVideo=-1;this.lastDetect=0;this.calibrate();return true;
  }catch(e){if(token!==this.token)return false;this.stop();throw e;}finally{this.loading=false;}
 }
 poll(now){if(!this.stream||!this.tracker||this.video.readyState<2||this.video.currentTime===this.lastVideo||now-this.lastDetect<90)return;this.lastVideo=this.video.currentTime;this.lastDetect=now;
  try{const lm=this.tracker.detectForVideo(this.video,now).landmarks?.[0];const p=extraPose(lm,this.baseline);this.pose=p;this.draw(lm);if(!p){this.samples=[];return;}this.lastSeen=now;
   if(!this.baseline){if(p.boost||p.shield){this.samples=[];return;}this.samples.push({...p,at:now});if(now-this.samples[0].at>=1800){const avg=k=>this.samples.reduce((a,b)=>a+b[k],0)/this.samples.length;if(this.samples.every(p=>Math.abs(p.hipY-avg('hipY'))<.04)){this.baseline={x:avg('x'),hipY:avg('hipY'),shoulderY:avg('shoulderY'),torso:avg('torso')};this.onStatus('✔ جاهز! تابع الحركة المطلوبة.');}else this.samples=[];}}
  }catch(e){this.pose=null;this.onStatus('التتبع اتوقف مؤقتًا. ارجع قدام الكاميرا أو جرّب الأزرار.');console.warn(e);}
 }
 ready(now){return !!(this.baseline&&this.pose&&now-this.lastSeen<650);}
 draw(lm){const p=this.pen;p.clearRect(0,0,320,240);if(!lm)return;p.strokeStyle='#83f6ce';p.lineWidth=3;for(const [a,b]of [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]]){if(!visible(lm[a])||!visible(lm[b]))continue;p.beginPath();p.moveTo(lm[a].x*320,lm[a].y*240);p.lineTo(lm[b].x*320,lm[b].y*240);p.stroke();}p.fillStyle='#ffe18e';for(const i of [15,16])if(visible(lm[i])){p.beginPath();p.arc(lm[i].x*320,lm[i].y*240,7,0,Math.PI*2);p.fill();}}
}
