// Deterministic teaching data, never a model prediction or a tracking algorithm.
export const TEACHERS=['CoTracker3 Online','CoTracker3 Offline','CoTracker2','TAPIR'];
export const FRAMES=6;
export const TARGETS=Array.from({length:FRAMES},(_,t)=>({x:70+t*74,y:[110,105,108,114,111,104][t]}));
export const POINTS=['A','B','C'];
export const OCCLUDED=[2,3];
const OFFSETS=[{x:0,y:0},{x:23,y:8},{x:49,y:-4}];
export function targetAt(frame,point=0){return {x:TARGETS[frame].x+OFFSETS[point].x,y:TARGETS[frame].y+OFFSETS[point].y};}
export function initialize(query=0,point=0){return TARGETS.map(()=>({...targetAt(query,point),c:0,v:0}));}
export function illustrativeTrack(iteration,query=0,point=0){
  const fraction=[0,.44,.72,.93,1][iteration];
  if(fraction===undefined)throw new RangeError('Teaching iteration must be 0–4');
  const origin=targetAt(query,point);
  return TARGETS.map((_,t)=>{const p=targetAt(t,point);return {x:origin.x+(p.x-origin.x)*fraction,y:origin.y+(p.y-origin.y)*fraction};});
}
export function samplingPatch(iteration,query=0,frame=5,scale=0,point=0){return {center:illustrativeTrack(iteration,query,point)[frame],radius:18*2**scale,version:iteration};}
export function patchPairs(queryCell){return Array.from({length:9},(_,trackCell)=>({queryCell,trackCell}));}
export function pairIndices(queryCell,trackCell){return {uq:queryCell%3,vq:Math.floor(queryCell/3),ut:trackCell%3,vt:Math.floor(trackCell/3)};}
export function tokenRelations(mode,time=2,point=1){
  if(mode==='time')return Array.from({length:FRAMES},(_,t)=>({time:t,point,type:'real'}));
  return [...POINTS.map((_,p)=>({time,point:p,type:'real'})),...Array.from({length:2},(_,p)=>({time,point:p,type:'proxy'}))];
}
export const PROXY_FLOW=[{from:'real',to:'proxy',operation:'read'},{from:'proxy',to:'proxy',operation:'mix'},{from:'proxy',to:'real',operation:'write'}];
export function onlineWindow(index){const start=index*8;return {start,end:start+15,frames:Array.from({length:16},(_,i)=>i+start),inherited:index?Array.from({length:8},(_,i)=>i+start):[],introduced:Array.from({length:index?8:16},(_,i)=>i+start+(index?8:0))};}
export function teacherForBatch(random=Math.random){return Math.min(3,Math.floor(random()*4));}
export function tokenDimensions(){return {correlation:4*256,motion:4*(1+2*10),status:2,input:1110,hidden:384};}
export function safeChapter(hash,chapters){const aliases={evidence:'recap'};const key=aliases[hash]||hash;return chapters.includes(key)?key:'task';}
