import 'dotenv/config';
import crypto from 'node:crypto';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createClient } from 'redis';
import { Server } from 'socket.io';

const PORT = Number(process.env.PORT || 4000);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const TTL = Number(process.env.ROOM_TTL || 86400);
const db = createClient({ url: process.env.VALKEY_URL || 'redis://localhost:6379' });
db.on('error', e => console.error('[valkey]', e.message));
const key = code => `valquiz:room:${code}`;
const load = async code => { const raw = await db.get(key(String(code).toUpperCase())); return raw ? JSON.parse(raw) : null; };
const save = async room => { room.updatedAt = Date.now(); await db.set(key(room.code), JSON.stringify(room), { EX: TTL }); return room; };
const uid = () => crypto.randomBytes(18).toString('hex');
const roomCode = async () => { for (let i=0;i<20;i++) { const c=String(crypto.randomInt(100000,1000000)); if (!await load(c)) return c; } throw Error('Could not create room'); };
const clean = x => String(x || '').trim().replace(/\s+/g,' ').slice(0,24);
const board = r => Object.values(r.players).sort((a,b)=>b.score-a.score).map((p,i)=>({id:p.id,name:p.name,score:p.score,rank:i+1}));
const publicRoom = r => ({ code:r.code,title:r.title,status:r.status,questionIndex:r.questionIndex,questionCount:r.questions.length,hostConnected:r.hostConnected,players:Object.values(r.players).map(({id,name,score,answered,connected})=>({id,name,score,answered,connected})) });
const question = r => { const q=r.questions[r.questionIndex]; return {index:r.questionIndex,total:r.questions.length,text:q.text,options:q.options,duration:q.duration,endsAt:r.endsAt}; };
const validateQuestions = input => {
  if (!Array.isArray(input) || !input.length || input.length>30) throw Error('Add 1–30 questions');
  return input.map((q,i) => { const text=String(q.text||'').trim().slice(0,240); const options=(q.options||[]).map(x=>String(x).trim().slice(0,100)); const correct=Number(q.correct); const duration=Math.max(5,Math.min(60,Number(q.duration)||20)); if(!text||options.length!==4||options.some(x=>!x)||!Number.isInteger(correct)||correct<0||correct>3) throw Error(`Question ${i+1} is incomplete`); return {text,options,correct,duration}; });
};

const app=express();
app.use(helmet()); app.use(cors({origin:CLIENT_URL})); app.use(express.json({limit:'100kb'}));
app.get('/api/health', async (_q,res)=>{ try { res.json({ok:true,valkey:await db.ping()}); } catch { res.status(503).json({ok:false}); } });
app.get('/api/rooms/:code',async(req,res)=>{const r=await load(req.params.code);r?res.json(publicRoom(r)):res.status(404).json({error:'Room not found'});});
const server=http.createServer(app);
const io=new Server(server,{cors:{origin:CLIENT_URL},transports:['websocket','polling']});
const timers=new Map(); const channel=c=>`room:${c}`;
const ok=(ack,data={})=>typeof ack==='function'&&ack({ok:true,...data});
const bad=(ack,e)=>typeof ack==='function'&&ack({ok:false,error:e.message||'Something went wrong'});
const state=r=>io.to(channel(r.code)).emit('room:state',publicRoom(r));
const host=(r,t)=>{if(!r||r.hostToken!==t)throw Error('Host authorization failed');};

async function endQuestion(code){
  timers.delete(code); const r=await load(code); if(!r||r.status!=='question')return;
  r.status='scoreboard'; await save(r); io.to(channel(code)).emit('question:ended',{correct:r.questions[r.questionIndex].correct,leaderboard:board(r),isLast:r.questionIndex===r.questions.length-1}); state(r);
}
async function startQuestion(r){
  r.status='question'; r.endsAt=Date.now()+r.questions[r.questionIndex].duration*1000; Object.values(r.players).forEach(p=>p.answered=false); await save(r); io.to(channel(r.code)).emit('question:started',question(r)); state(r); clearTimeout(timers.get(r.code)); timers.set(r.code,setTimeout(()=>endQuestion(r.code).catch(console.error),r.endsAt-Date.now()));
}

io.on('connection',socket=>{
  socket.on('room:create',async(d,ack)=>{try{const code=await roomCode(),hostToken=uid();const r={code,hostToken,title:clean(d?.title)||'ValQuiz Game',status:'lobby',questionIndex:-1,endsAt:null,hostConnected:true,hostSocket:socket.id,players:{},questions:validateQuestions(d?.questions),createdAt:Date.now()};await save(r);socket.join(channel(code));socket.data={code,role:'host',hostToken};ok(ack,{code,hostToken,room:publicRoom(r)});}catch(e){bad(ack,e);}});
  socket.on('room:join',async(d,ack)=>{try{const code=String(d?.code||'').toUpperCase(),name=clean(d?.name),r=await load(code);if(!r)throw Error('Room not found');if(r.status!=='lobby')throw Error('Game already started');if(!name)throw Error('Enter your name');if(Object.values(r.players).some(p=>p.name.toLowerCase()===name.toLowerCase()))throw Error('Name already taken');const playerId=uid();r.players[playerId]={id:playerId,name,score:0,answered:false,connected:true,socketId:socket.id};await save(r);socket.join(channel(code));socket.data={code,role:'player',playerId};ok(ack,{playerId,room:publicRoom(r)});state(r);}catch(e){bad(ack,e);}});
  socket.on('room:resume',async(d,ack)=>{try{const code=String(d?.code||''),r=await load(code);if(!r)throw Error('Room expired');if(d.hostToken===r.hostToken){r.hostConnected=true;r.hostSocket=socket.id;socket.data={code,role:'host',hostToken:d.hostToken};}else if(r.players[d.playerId]){r.players[d.playerId].connected=true;r.players[d.playerId].socketId=socket.id;socket.data={code,role:'player',playerId:d.playerId};}else throw Error('Session invalid');await save(r);socket.join(channel(code));if(r.status==='question'&&!timers.has(code))timers.set(code,setTimeout(()=>endQuestion(code).catch(console.error),Math.max(0,r.endsAt-Date.now())));ok(ack,{room:publicRoom(r),question:r.status==='question'?question(r):null});state(r);}catch(e){bad(ack,e);}});
  socket.on('game:start',async(d,ack)=>{try{const r=await load(d.code);host(r,d.hostToken);if(r.status!=='lobby')throw Error('Already started');if(!Object.keys(r.players).length)throw Error('Wait for a player');r.questionIndex=0;await startQuestion(r);ok(ack);}catch(e){bad(ack,e);}});
  socket.on('answer:submit',async(d,ack)=>{try{const r=await load(d.code),p=r?.players[d.playerId];if(!p)throw Error('Player not found');if(r.status!=='question'||p.answered||Date.now()>r.endsAt)throw Error('Answer closed');const a=Number(d.answer);if(!Number.isInteger(a)||a<0||a>3)throw Error('Invalid answer');p.answered=true;const correct=a===r.questions[r.questionIndex].correct;if(correct){const total=r.questions[r.questionIndex].duration*1000,remaining=Math.max(0,r.endsAt-Date.now());p.score+=500+Math.round(500*remaining/total);}await save(r);ok(ack,{correct});state(r);if(Object.values(r.players).filter(x=>x.connected).every(x=>x.answered)){clearTimeout(timers.get(r.code));timers.set(r.code,setTimeout(()=>endQuestion(r.code).catch(console.error),500));}}catch(e){bad(ack,e);}});
  socket.on('game:next',async(d,ack)=>{try{const r=await load(d.code);host(r,d.hostToken);if(r.status!=='scoreboard')throw Error('Question still active');if(r.questionIndex===r.questions.length-1){r.status='ended';await save(r);io.to(channel(r.code)).emit('game:ended',{leaderboard:board(r)});state(r);}else{r.questionIndex++;await startQuestion(r);}ok(ack);}catch(e){bad(ack,e);}});
  socket.on('disconnect',async()=>{const{code,role,playerId}=socket.data||{};if(!code)return;const r=await load(code);if(!r)return;if(role==='host'&&r.hostSocket===socket.id)r.hostConnected=false;if(role==='player'&&r.players[playerId]?.socketId===socket.id)r.players[playerId].connected=false;await save(r);state(r);});
});

await db.connect(); server.listen(PORT,'0.0.0.0',()=>console.log(`ValQuiz server on http://localhost:${PORT}`));
const shutdown=async()=>{timers.forEach(clearTimeout);io.close();server.close();await db.quit();process.exit(0);}; process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
