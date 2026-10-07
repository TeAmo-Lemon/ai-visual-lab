// Diagram state only. These functions do not approximate CoTracker3 inference.
export const TEACHERS=['CoTracker3 Online','CoTracker3 Offline','CoTracker（代码 CoTracker2）','TAPIR'];
export const TARGETS=[{x:22,y:53},{x:36,y:50},{x:52,y:48},{x:68,y:51},{x:82,y:55}];
export function initialize(query){return TARGETS.map(()=>({x:TARGETS[query].x,y:TARGETS[query].y,c:0,v:0}))}
export function illustrativeTrack(iteration,query=1){
 const fractions=[0,.5,.78,.93,1];
 const initial=initialize(query),fraction=fractions[iteration];
 return initial.map((p,t)=>({x:p.x+(TARGETS[t].x-p.x)*fraction,y:p.y+(TARGETS[t].y-p.y)*fraction}));
}
export function samplingPatch(iteration,query=1,frame=4,scale=0){const center=illustrativeTrack(iteration,query)[frame];return {center,radius:7*2**scale,version:iteration}}
export function patchPairs(queryCell){return Array.from({length:9},(_,trackCell)=>({queryCell,trackCell}))}
export function tokenRelations(mode,time=2,point=1){
 if(mode==='time')return Array.from({length:5},(_,t)=>({time:t,point,type:'real'}));
 return [...Array.from({length:4},(_,p)=>({time,point:p,type:'real'})),...Array.from({length:2},(_,p)=>({time,point:p,type:'proxy'}))];
}
export const PROXY_FLOW=[{from:'real',to:'proxy',operation:'read'},{from:'proxy',to:'proxy',operation:'mix'},{from:'proxy',to:'real',operation:'write'}];
export function onlineWindow(index){const start=index*8;return {start,end:start+15,frames:Array.from({length:16},(_,i)=>i+start),inherited:index?Array.from({length:8},(_,i)=>i+start):[],introduced:Array.from({length:index?8:16},(_,i)=>i+start+(index?8:0))}}
export function teacherForBatch(random=Math.random){return Math.min(3,Math.floor(random()*4))}
