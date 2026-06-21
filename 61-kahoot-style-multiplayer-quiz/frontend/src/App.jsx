import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER=import.meta.env.VITE_SERVER_URL||'http://localhost:4000';
const colors=['red','blue','gold','green'];
const emptyQuestion=()=>({text:'',options:['','','',''],correct:0,duration:20});
const saved=()=>{try{return JSON.parse(sessionStorage.getItem('valquiz-session'))||null}catch{return null}};
const saveSession=x=>{sessionStorage.setItem('valquiz-session',JSON.stringify(x));};

function Button({children,className='',...p}){return <button className={`button ${className}`} {...p}>{children}</button>}
function ErrorBox({error}){return error?<div className="error">{error}</div>:null}
function Leaderboard({items=[],me}){return <div className="leaderboard">{items.map((p,i)=><div className={`rank ${p.id===me?'me':''}`} key={p.id}><b><span>{i<3?['🥇','🥈','🥉'][i]:`#${i+1}`}</span> {p.name}</b><strong>{p.score.toLocaleString()}</strong></div>)}</div>}

export default function App(){
 const [socket]=useState(()=>io(SERVER)); const [screen,setScreen]=useState(saved()?'loading':'home');
 const [session,setSession]=useState(saved()); const [room,setRoom]=useState(null); const [question,setQuestion]=useState(null);
 const [result,setResult]=useState(null); const [leaderboard,setLeaderboard]=useState([]); const [error,setError]=useState(''); const [online,setOnline]=useState(socket.connected);
 const [now,setNow]=useState(Date.now());
 const request=(event,data)=>new Promise(resolve=>socket.emit(event,data,resolve));
 const apply=async res=>{if(!res?.ok){setError(res?.error||'Connection failed');return false}setError('');return true};
 useEffect(()=>{const tick=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(tick)},[]);
 useEffect(()=>{
   const connect=()=>{setOnline(true);const s=saved();if(s)request('room:resume',s).then(r=>{if(r.ok){setRoom(r.room);setQuestion(r.question);setScreen(r.room.status==='ended'?'ended':s.role==='host'?'host':'player')}else{sessionStorage.removeItem('valquiz-session');setSession(null);setScreen('home');setError(r.error)}})};
   const disconnect=()=>setOnline(false); const onState=r=>setRoom(r); const onQuestion=q=>{setQuestion(q);setResult(null);setScreen(saved()?.role==='host'?'host':'player')};
   const onEnded=d=>{setResult(d);setLeaderboard(d.leaderboard);}; const onGameEnd=d=>{setLeaderboard(d.leaderboard);setScreen('ended')};
   socket.on('connect',connect);socket.on('disconnect',disconnect);socket.on('room:state',onState);socket.on('question:started',onQuestion);socket.on('question:ended',onEnded);socket.on('game:ended',onGameEnd);
   if(socket.connected)connect();return()=>{socket.off('connect',connect);socket.off('disconnect',disconnect);socket.off('room:state',onState);socket.off('question:started',onQuestion);socket.off('question:ended',onEnded);socket.off('game:ended',onGameEnd)};
 },[socket]);
 const leave=()=>{sessionStorage.removeItem('valquiz-session');setSession(null);setRoom(null);setQuestion(null);setResult(null);setScreen('home')};
 const seconds=question?Math.max(0,Math.ceil((question.endsAt-now)/1000)):0;
 const myPlayer=room?.players.find(p=>p.id===session?.playerId);
 return <main><header><div className="brand" onClick={leave}>Val<span>Quiz</span></div><div className={`status ${online?'on':''}`}>{online?'● Live':'○ Reconnecting'}</div></header>
   {screen==='loading'&&<section className="center"><div className="spinner"/><h2>Rejoining game…</h2></section>}
   {screen==='home'&&<Home setScreen={setScreen}/>} 
   {screen==='create'&&<Create socket={socket} apply={apply} onCreated={(r,s)=>{setRoom(r);setSession(s);saveSession(s);setScreen('host')}} error={error}/>} 
   {screen==='join'&&<Join socket={socket} apply={apply} onJoined={(r,s)=>{setRoom(r);setSession(s);saveSession(s);setScreen('player')}} error={error}/>} 
   {screen==='host'&&room&&<Host room={room} question={question} result={result} seconds={seconds} session={session} request={request} apply={apply} error={error}/>} 
   {screen==='player'&&room&&<Player room={room} question={question} result={result} seconds={seconds} session={session} me={myPlayer} request={request} apply={apply} error={error}/>} 
   {screen==='ended'&&<End leaderboard={leaderboard.length?leaderboard:(room?.players||[]).sort((a,b)=>b.score-a.score)} me={session?.playerId} leave={leave}/>} 
 </main>
}

function Home({setScreen}){return <section className="hero"><div className="eyebrow">REAL-TIME MULTIPLAYER QUIZZES</div><h1>Turn questions into<br/><em>electric moments.</em></h1><p>Create a room, invite your crew, and watch the leaderboard change live.</p><div className="actions"><Button onClick={()=>setScreen('create')}>Create a quiz →</Button><Button className="secondary" onClick={()=>setScreen('join')}>Join with code</Button></div><div className="mini"><span>⚡ Live scoring</span><span>◷ Timed rounds</span><span>♛ Instant podium</span></div></section>}

function Create({socket,apply,onCreated,error}){
 const [title,setTitle]=useState('Friday Trivia');const [questions,setQuestions]=useState([emptyQuestion()]);const [busy,setBusy]=useState(false);
 const update=(i,patch)=>setQuestions(q=>q.map((x,n)=>n===i?{...x,...patch}:x));
 const create=async()=>{setBusy(true);const r=await new Promise(ok=>socket.emit('room:create',{title,questions},ok));setBusy(false);if(await apply(r)){const s={code:r.code,hostToken:r.hostToken,role:'host'};onCreated(r.room,s)}};
 return <section className="page"><button className="back" onClick={()=>history.back()}>← Build your quiz</button><div className="panel"><label>Quiz title<input value={title} onChange={e=>setTitle(e.target.value)} maxLength="80"/></label>{questions.map((q,i)=><div className="editor" key={i}><div className="editor-head"><b>Question {i+1}</b>{questions.length>1&&<button onClick={()=>setQuestions(x=>x.filter((_,n)=>n!==i))}>Remove</button>}</div><input placeholder="Ask something brilliant…" value={q.text} onChange={e=>update(i,{text:e.target.value})}/><div className="option-grid">{q.options.map((o,n)=><label className={`option-input ${colors[n]}`} key={n}><input type="radio" checked={q.correct===n} onChange={()=>update(i,{correct:n})}/><input placeholder={`Answer ${n+1}`} value={o} onChange={e=>{const a=[...q.options];a[n]=e.target.value;update(i,{options:a})}}/></label>)}</div><label className="duration">Time limit <select value={q.duration} onChange={e=>update(i,{duration:+e.target.value})}><option>10</option><option>20</option><option>30</option><option>60</option></select> seconds</label></div>)}<ErrorBox error={error}/><div className="builder-actions"><Button className="secondary" onClick={()=>setQuestions(x=>[...x,emptyQuestion()])}>+ Add question</Button><Button disabled={busy} onClick={create}>{busy?'Creating…':'Create room →'}</Button></div></div></section>
}

function Join({socket,apply,onJoined,error}){const [code,setCode]=useState('');const[name,setName]=useState('');const join=async e=>{e.preventDefault();const r=await new Promise(ok=>socket.emit('room:join',{code,name},ok));if(await apply(r)){const s={code:code.trim(),playerId:r.playerId,role:'player'};onJoined(r.room,s)}};return <section className="center"><div className="join-card"><div className="join-icon">✦</div><h1>Join the game</h1><p>Enter the code shown on the host screen.</p><form onSubmit={join}><label>Room code<input className="code-input" inputMode="numeric" placeholder="000 000" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))}/></label><label>Your name<input placeholder="Quiz legend" maxLength="24" value={name} onChange={e=>setName(e.target.value)}/></label><ErrorBox error={error}/><Button disabled={code.length!==6||!name.trim()}>Enter room →</Button></form></div></section>}

function Lobby({room,host}){return <><div className="room-code"><small>JOIN AT VALQUIZ</small><div>{room.code}</div><p>Share this six-digit room code</p></div><div className="player-box"><h3>{room.players.length} player{room.players.length!==1?'s':''} joined</h3><div className="chips">{room.players.map(p=><span key={p.id} className={!p.connected?'away':''}>● {p.name}</span>)}{!room.players.length&&<p>Waiting for the first brave contestant…</p>}</div></div>{host&&<p className="hint">Start whenever everyone is in.</p>}</>}

function Host({room,question,result,seconds,session,request,apply,error}){const act=async event=>apply(await request(event,{code:room.code,hostToken:session.hostToken}));if(room.status==='lobby')return <section className="page game"><div className="host-title"><div><span className="tag">HOST CONTROL</span><h1>{room.title}</h1></div><Button disabled={!room.players.length} onClick={()=>act('game:start')}>Start quiz →</Button></div><Lobby room={room} host/><ErrorBox error={error}/></section>;if(room.status==='question'&&question)return <QuestionView question={question} seconds={seconds}><div className="host-progress">{room.players.filter(p=>p.answered).length} / {room.players.length} answered</div></QuestionView>;if(room.status==='scoreboard'&&result)return <section className="page score"><span className="tag">ROUND {room.questionIndex+1} RESULTS</span><h1>Live standings</h1><Leaderboard items={result.leaderboard}/><Button onClick={()=>act('game:next')}>{result.isLast?'Reveal final podium →':'Next question →'}</Button><ErrorBox error={error}/></section>;return <section className="center"><div className="spinner"/></section>}

function QuestionView({question,seconds,children,onAnswer,selected}){return <section className="question-page"><div className="question-top"><span>QUESTION {question.index+1} / {question.total}</span><div className={`timer ${seconds<6?'danger':''}`}>{seconds}</div><span>VALQUIZ</span></div><h1>{question.text}</h1><div className="answers">{question.options.map((o,i)=><button disabled={!onAnswer||selected!==null} className={`${colors[i]} ${selected===i?'selected':''}`} key={i} onClick={()=>onAnswer?.(i)}><span>{['▲','◆','●','■'][i]}</span>{o}</button>)}</div>{children}</section>}
}

function Player({room,question,result,seconds,session,me,request,apply,error}){const[selected,setSelected]=useState(null);useEffect(()=>setSelected(null),[question?.index]);const answer=async i=>{setSelected(i);const r=await request('answer:submit',{code:room.code,playerId:session.playerId,answer:i});apply(r)};if(room.status==='lobby')return <section className="page game"><div className="waiting"><span className="tag">YOU'RE IN</span><h1>Hey, {me?.name}!</h1><p>Look sharp. The host will start soon.</p></div><Lobby room={room}/></section>;if(room.status==='question'&&question)return <QuestionView question={question} seconds={seconds} onAnswer={answer} selected={selected}>{selected!==null&&<div className="locked">Answer locked in · {me?.score.toLocaleString()} points</div>}<ErrorBox error={error}/></QuestionView>;if(room.status==='scoreboard'&&result)return <section className="page score"><span className="tag">SCOREBOARD</span><h1>{result.leaderboard.find(x=>x.id===session.playerId)?.rank===1?'You’re leading!':'Keep climbing.'}</h1><Leaderboard items={result.leaderboard} me={session.playerId}/><p className="hint">Waiting for the host…</p></section>;return <section className="center"><div className="spinner"/></section>}

function End({leaderboard,me,leave}){const winner=leaderboard[0];return <section className="end"><div className="confetti">✦　·　✦　·　✦</div><span className="tag">GAME COMPLETE</span><h1>And the crown goes to…</h1>{winner&&<div className="winner"><div>♛</div><h2>{winner.name}</h2><strong>{winner.score.toLocaleString()} pts</strong></div>}<div className="final-board"><Leaderboard items={leaderboard} me={me}/></div><Button onClick={leave}>Back to ValQuiz</Button></section>}
