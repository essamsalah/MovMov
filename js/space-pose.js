// Coordinates use MediaPipe's normalized, unmirrored image space.
export const visible = p => !!p && (p.visibility === undefined || p.visibility > .5);
export function readPose(lm, baseline) {
  if (![11,12,23,24].every(i=>visible(lm?.[i]))) return null;
  const shoulderX=(lm[11].x+lm[12].x)/2;
  const shoulderY=(lm[11].y+lm[12].y)/2;
  const hipY=(lm[23].y+lm[24].y)/2;
  const width=Math.max(.08,Math.abs(lm[11].x-lm[12].x));
  const hands=[15,16].filter(i=>visible(lm[i])).map(i=>({x:1-lm[i].x,y:lm[i].y}));
  const both=hands.length===2;
  const boost=both && lm[15].y<shoulderY-.08 && lm[16].y<shoulderY-.08;
  const shield=both && Math.abs(lm[15].x-lm[16].x)>width*2.1 && Math.abs(lm[15].y-shoulderY)<.16 && Math.abs(lm[16].y-shoulderY)<.16 && !boost;
  // Normalize the drop against standing torso size to accommodate camera distance.
  const duck=!!baseline && hipY-baseline.hipY>baseline.torso*.24 && shoulderY-baseline.shoulderY>baseline.torso*.15;
  return {x:1-shoulderX, shoulderY,hipY,torso:Math.max(.12,hipY-shoulderY),hands,boost,shield,duck};
}
export function reachesTarget(hands,target) {
  // Correct for the 4:3 camera preview when measuring circular reach targets.
  return hands.some(p=>Math.hypot((p.x-target.x)*4/3,p.y-target.y)<.17);
}
