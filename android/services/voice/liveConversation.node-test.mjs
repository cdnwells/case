import test from 'node:test';
import assert from 'node:assert/strict';
import { LiveConversation, boundedLiveHistory, liveError } from './liveConversation.ts';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(condition) { for(let i=0;i<100;i++) { if(condition()) return; await sleep(2); } assert.fail('condition timed out'); }
function fixture(overrides = {}) {
  const states = [], captions = [], requests = [], closed = [], transports = [], logs = [];
  let levels = { input: 0, output: 0 };
  const makeTransport = async () => {
    const transport = {
      disposed: false, muted: false, sent: [],
      pc: { iceGatheringState: 'complete', localDescription: { sdp: 'v=0\r\noffer' },
        async createOffer() { return { type: 'offer', sdp: 'v=0\r\noffer' }; },
        async setLocalDescription() {},
        async setRemoteDescription() { queueMicrotask(() => emit({ type: 'session.started' }, transport)); },
        async getStats() { return new Map([['in', { id:'in', type:'media-source', kind:'audio', audioLevel:levels.input }], ['out',{ id:'out',type:'inbound-rtp',kind:'audio',audioLevel:levels.output }]]); },
      },
      channel: { readyState: 'open', send(data) {
        const event = JSON.parse(data); transport.sent.push(event);
        if(event.type === 'session.close' && !overrides.noCloseEvent) queueMicrotask(() => emit({ type:'session.closed', reason:'close_requested' }, transport));
      } },
      muteOutput(value) { transport.muted = value; }, silenceInput() { transport.inputSilenced = true; },
      dispose() { transport.disposed = true; },
    };
    transports.push(transport); return transport;
  };
  function emit(event, transport = transports.at(-1)) { transport.channel.onmessage?.({ data: typeof event === 'string' ? event : JSON.stringify(event) }); }
  const conversation = new LiveConversation({
    createTransport: makeTransport,
    async createSession(request) { requests.push(request); return { sessionId:`live_${requests.length}`, sdp:'v=0\r\nanswer', controlToken:'control', model:'gpt-live-1',voice:'marin' }; },
    async closeSession(session, finalized) { closed.push({ ...session, finalized }); },
    async delegate() { return { content:'result' }; },
    onState(state,error) { states.push({state,error}); }, onCaption(caption) { captions.push(caption); },
    log(code) { logs.push(code); }, startupTimeoutMs:100, closeTimeoutMs:10, retryDelayMs:1,
    ...overrides,
  });
  return { conversation, states, captions, requests, closed, transports, emit, levels, logs };
}

test('waits for session.started, keeps overlapping captions, and gracefully cleans up', async () => {
  const f=fixture();
  assert.equal(await f.conversation.start({history:[{role:'user',content:'Earlier context'}]}),true);
  assert.equal(f.states.at(-1).state,'listening');
  for(const event of [
    {type:'session.input_transcript.delta',event_id:'a',delta:'Hello ',start_ms:0,end_ms:500},
    {type:'session.output_transcript.delta',event_id:'b',delta:'Hi',start_ms:200,end_ms:600},
    {type:'session.input_transcript.delta',event_id:'c',delta:'again',start_ms:500,end_ms:700},
  ]) f.emit(event);
  f.emit({type:'session.input_transcript.delta',event_id:'c',delta:'again',start_ms:500,end_ms:700});
  assert.equal(f.captions.length,3);
  assert.equal(f.captions[0].id,f.captions[2].id);
  assert.equal(f.captions[2].content,'Hello again');
  assert.equal(f.conversation.getHistory()[0].content,'Earlier context');
  await f.conversation.stop();
  assert.equal(f.transports[0].disposed,true);
  assert.equal(f.transports[0].inputSilenced,true);
  assert.equal(f.closed.length,1);
  assert.equal(f.closed[0].finalized,true);
  assert.equal(f.states.at(-1).state,'idle');
});
test('permission denial does not reconnect', async () => {
  let count=0;
  const f=fixture({createTransport:async()=>{count++; throw Object.assign(new Error('denied'),{name:'NotAllowedError'});}});
  assert.equal(await f.conversation.start(),false);
  assert.equal(f.states.at(-1).state,'error');
  assert.match(f.states.at(-1).error,/Microphone permission/);
  assert.equal(count,1);
  await f.conversation.stop();
});
test('reconnect seeds history and ignores events from the old transport', async () => {
  const f=fixture(); await f.conversation.start();
  f.emit({type:'session.input_transcript.delta',delta:'Remember Friday',start_ms:0,end_ms:800});
  const old=f.transports[0], callback=old.channel.onmessage;
  old.channel.onclose();
  await until(()=>f.requests.length===2);
  assert.equal(f.requests[1].history[0].content,'Remember Friday');
  callback({data:JSON.stringify({type:'session.output_transcript.delta',delta:'stale',start_ms:0,end_ms:1})});
  assert.equal(f.captions.length,1);
  await f.conversation.stop();
});
test('late microphone permission completion is disposed after Stop', async () => {
  let resolve;
  const pending=new Promise(r=>{resolve=r;});
  let disposed=false;
  const f=fixture({createTransport:()=>pending});
  const starting=f.conversation.start(); await sleep(1);
  await f.conversation.stop();
  resolve({dispose(){disposed=true;}});
  assert.equal(await starting,false);
  assert.equal(disposed,true);
  assert.equal(f.requests.length,0);
});
test('stopping while HTTP setup is pending reclaims the late session', async () => {
  let resolve, requested=false;
  const f=fixture({createSession:()=>{requested=true;return new Promise(r=>{resolve=r;});}});
  const starting=f.conversation.start(); await until(()=>requested);
  await f.conversation.stop();
  resolve({sessionId:'late',controlToken:'control',sdp:'v=0'});
  assert.equal(await starting,false);
  assert.equal(f.closed[0].sessionId,'late');
});
test('playback drives speaking and input barge-in suppresses output without muting input', async () => {
  const f=fixture(); f.levels.output=.2;
  await f.conversation.start();
  await until(()=>f.states.at(-1).state==='speaking');
  f.levels.input=.2;
  await until(()=>f.transports[0].muted);
  assert.equal(f.states.at(-1).state,'listening');
  assert.equal(f.transports[0].inputSilenced,undefined);
  await f.conversation.stop();
});
test('close timeout reclaims resources and unexpected events do not crash', async () => {
  const f=fixture({noCloseEvent:true}); await f.conversation.start();
  f.emit('invalid JSON'); f.emit({type:'new.server.event'});
  await f.conversation.stop();
  assert.equal(f.transports[0].disposed,true);
  assert.equal(f.closed[0].finalized,false);
  assert.ok(f.logs.includes('close_timeout'));
});
test('duplicate delegation executes once and late corrected result is not spoken', async () => {
  let resolve, count=0;
  const f=fixture({delegate:()=>{count++;return new Promise(r=>{resolve=r;});}});
  await f.conversation.start();
  const event={type:'session.delegation.created',delegation:{id:'item_1',target:'client'}};
  f.emit(event);f.emit(event);
  f.emit({type:'session.input_transcript.delta',delta:'Actually Thursday',start_ms:10,end_ms:50});
  resolve({content:'Booked Friday'});await sleep(1);
  assert.equal(count,1);
  assert.doesNotMatch(JSON.stringify(f.transports[0].sent),/Booked Friday/);
  await f.conversation.stop();
});
test('history is bounded by UTF-8 bytes and permission errors are classified',()=>{
  const history=boundedLiveHistory(Array.from({length:200},()=>({role:'user',content:'가'.repeat(30)})));
  assert.ok(Buffer.byteLength(JSON.stringify(history))<=5800);
  assert.equal(liveError({name:'NotReadableError'}).retryable,false);
});

test('overlapping starts create only the latest session', async () => {
  const f=fixture();
  const first=f.conversation.start({history:[{role:'user',content:'old'}]});
  const second=f.conversation.start({history:[{role:'user',content:'new'}]});
  assert.equal(await first,false);
  assert.equal(await second,true);
  assert.equal(f.requests.length,1);
  assert.equal(f.requests[0].history[0].content,'new');
  await f.conversation.stop();
});
test('stopping a queued start does not capture the microphone', async () => {
  const f=fixture();
  const starting=f.conversation.start();
  await f.conversation.stop();
  assert.equal(await starting,false);
  assert.equal(f.transports.length,0);
});
test('temporary failures stop after three retries and cannot reconnect after Stop', async () => {
  let attempts=0;
  const f=fixture({createTransport:async()=>{attempts++;throw new Error('offline');}});
  await f.conversation.start();
  await until(()=>f.states.at(-1).state==='error');
  assert.equal(attempts,4);
  await f.conversation.stop();
  await sleep(15);
  assert.equal(attempts,4);
});
test('startup timeout releases the attempt even when microphone permission remains pending', async () => {
  let resolve;
  const f=fixture({startupTimeoutMs:5,createTransport:()=>new Promise(r=>{resolve=r;})});
  assert.equal(await f.conversation.start(),false);
  await f.conversation.stop();
  let disposed=false;
  resolve({dispose(){disposed=true;}});
  await sleep(1);
  assert.equal(disposed,true);
});
