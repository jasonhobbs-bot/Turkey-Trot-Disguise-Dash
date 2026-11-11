/* GitHub Pages real-time race rooms backed by Firebase Realtime Database.
   Only first names / nicknames, costume choices and race positions are stored.
   This is a playful client-timed classroom game, not a cheat-proof competition. */
(function(){
'use strict';
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS=8;
const LIFE=6*60*60*1000;
let startup=null;
function enabled(){
 const c=window.TT_FIREBASE_CONFIG;
 return !!(c && c.apiKey && c.projectId && c.databaseURL);
}
async function context(){
 if(!enabled())throw Error('Firebase is not configured. See README.md for classroom multiplayer setup.');
 if(startup)return startup;
 startup=(async()=>{
  const version='10.14.1';
  const [app,auth,database]=await Promise.all([
   import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
   import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),
   import(`https://www.gstatic.com/firebasejs/${version}/firebase-database.js`)
  ]);
  const firebaseApp=app.initializeApp(window.TT_FIREBASE_CONFIG);
  const userAuth=auth.getAuth(firebaseApp);
  if(!userAuth.currentUser){await auth.signInAnonymously(userAuth);}
  const db=database.getDatabase(firebaseApp);
  const uid=userAuth.currentUser.uid;
  let offset=0;
  try{
   const snap=await database.get(database.ref(db,'.info/serverTimeOffset'));
   offset=Number(snap.val())||0;
  }catch(e){}
  return {db,database,uid,offset};
 })().catch(e=>{startup=null;throw e});
 return startup;
}
function scrubName(name){
 return String(name||'Gobble Racer').replace(/[<>\[\]{}]/g,'').replace(/\s+/g,' ').trim().slice(0,16)||'Gobble Racer';
}
function number(n,min,max){return Math.min(max,Math.max(min,Number(n)||0));}
function roomCode(){
 const bytes=new Uint8Array(5);
 crypto.getRandomValues(bytes);
 return Array.from(bytes,b=>ALPHABET[b%ALPHABET.length]).join('');
}
function normalRoom(raw){
 if(!raw)return null;
 return {
  code:raw.code,
  track:Number(raw.track)||0,
  status:raw.status,
  createdAt:raw.createdAt,
  startAt:raw.startAt||0,
  racers:Object.entries(raw.racers||{}).map(([id,p])=>({
   id, name:p.name||'Gobble Racer',
   costume:Number(p.costume)||0,
   host:id===raw.ownerUid,
   ready:!!p.ready,
   distance:Number(p.distance)||0,
   lane:Number(p.lane)||0,
   finishedMs:Number(p.finishedMs)||0
  }))
 };
}
async function readRoom(ctx,code){
 const {db,database}=ctx;
 const snap=await database.get(database.ref(db,`turkeyRooms/${code}`));
 const raw=snap.val();
 if(!raw)throw Error('Room not found. Check the 5-character code.');
 if(Date.now()-Number(raw.createdAt)>LIFE)throw Error('That room has expired. Please create a new one.');
 return raw;
}
function requireMember(raw,uid){
 if(!raw.racers || !raw.racers[uid])throw Error('You are not in this race room.');
}
function reply(ctx,raw,extra={}){
 return {serverNow:Date.now()+ctx.offset, room:normalRoom(raw), ...extra};
}
async function call(method,...args){
 const ctx=await context();
 const {db,database,uid}=ctx;
 const root='turkeyRooms';
 switch(method){
  case 'ttCreateRoom':{
   const [name,costume,track]=args;
   for(let tries=0;tries<12;tries++){
    const code=roomCode();
    const ref=database.ref(db,`${root}/${code}`);
    const racer={name:scrubName(name),costume:Math.floor(number(costume,0,11)),ready:false,distance:0,lane:0,finishedMs:0};
    const raw={code,track:Math.floor(number(track,0,11)),status:'waiting',ownerUid:uid,createdAt:Date.now(),startAt:0,racers:{[uid]:racer}};
    const transaction=await database.runTransaction(ref,current=>current?undefined:raw,{applyLocally:false});
    if(transaction.committed)return reply(ctx,raw,{playerId:uid,token:uid});
   }
   throw Error('Could not create an unused race code. Please try again.');
  }
  case 'ttJoinRoom':{
   const [code,name,costume]=args;
   const safe=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);
   if(safe.length!==5)throw Error('Enter the complete room code.');
   const raw=await readRoom(ctx,safe);
   if(raw.status!=='waiting')throw Error('This race has already started.');
   if(!raw.racers?.[uid] && Object.keys(raw.racers||{}).length>=MAX_PLAYERS)throw Error('This room already has 8 racers.');
   await database.set(database.ref(db,`${root}/${safe}/racers/${uid}`),{
    name:scrubName(name),costume:Math.floor(number(costume,0,11)),ready:false,distance:0,lane:0,finishedMs:0
   });
   const updated=await readRoom(ctx,safe);
   return reply(ctx,updated,{playerId:uid,token:uid});
  }
  case 'ttGetRoom':{
   const [code]=args;
   const raw=await readRoom(ctx,code);
   requireMember(raw,uid);
   return reply(ctx,raw);
  }
  case 'ttSetReady':{
   const [code,id,token,isReady]=args;
   const raw=await readRoom(ctx,code);
   requireMember(raw,uid);
   if(id!==uid || token!==uid)throw Error('Invalid racer session.');
   if(raw.status!=='waiting')throw Error('The race has already started.');
   await database.set(database.ref(db,`${root}/${code}/racers/${uid}/ready`),!!isReady);
   return reply(ctx,await readRoom(ctx,code));
  }
  case 'ttStartRoom':{
   const [code,id,token]=args;
   const raw=await readRoom(ctx,code);
   requireMember(raw,uid);
   if(id!==uid||token!==uid||raw.ownerUid!==uid)throw Error('Only the host can start the race.');
   const players=Object.values(raw.racers||{});
   if(players.length<2)throw Error('At least two students are needed.');
   if(!players.every(r=>r.ready))throw Error('All students must tap Ready first.');
   if(raw.status!=='waiting')throw Error('This race has already started.');
   // startAt first so all students see one shared countdown
   const startAt=Date.now()+ctx.offset+6500;
   await database.set(database.ref(db,`${root}/${code}/startAt`),startAt);
   await database.set(database.ref(db,`${root}/${code}/status`),'racing');
   return reply(ctx,await readRoom(ctx,code));
  }
  case 'ttRaceUpdate':{
   const [code,id,token,up]=args;
   const raw=await readRoom(ctx,code);
   requireMember(raw,uid);
   if(id!==uid||token!==uid)throw Error('Invalid racer session.');
   if(raw.status==='racing'&&up){
    const previous=raw.racers[uid];
   const max=42240*3;
    const distance=Math.max(Number(previous.distance)||0,Math.round(number(up.distance,0,max)));
    const patch={distance,lane:number(up.lane,-1.58,1.58)};
    if(up.finishedMs && !previous.finishedMs)patch.finishedMs=Math.round(number(up.finishedMs,0,3600000));
    await database.update(database.ref(db,`${root}/${code}/racers/${uid}`),patch);
   }
   return reply(ctx,await readRoom(ctx,code));
  }
  case 'ttLeaveRoom':{
   const [code,id,token]=args;
   const raw=await readRoom(ctx,code);
   if(id!==uid||token!==uid)throw Error('Invalid racer session.');
   if(!raw.racers?.[uid])return {ok:true};
   const others=Object.keys(raw.racers).filter(x=>x!==uid);
   if(!others.length && raw.ownerUid===uid){
    await database.remove(database.ref(db,`${root}/${code}`));
   }else{
    if(raw.ownerUid===uid){
     await database.set(database.ref(db,`${root}/${code}/ownerUid`),others[0]);
    }
    await database.remove(database.ref(db,`${root}/${code}/racers/${uid}`));
   }
   return {ok:true};
  }
  default:throw Error('Unknown multiplayer action: '+method);
 }
}
window.ttFirebaseCall=call;
window.ttFirebaseEnabled=enabled;
})();
