import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {WebSocket} from 'ws';
import {createApp} from '../server/index.mjs';

async function fixture(t, options={}) {
  const app=createApp({duration:300,countdown:70,tick:10,...options});
  app.server.listen(0,'127.0.0.1');await once(app.server,'listening');
  t.after(()=>app.close());
  const origin=`http://127.0.0.1:${app.server.address().port}`;
  async function player(name) {
    const ws=new WebSocket(origin.replace('http','ws')+'/ws',{origin});
    const messages=[];ws.on('message',data=>messages.push(JSON.parse(data)));
    await once(ws,'open');ws.send(JSON.stringify({type:'join',name}));
    t.after(()=>ws.terminate());
    async function wait(type) {
      const end=Date.now()+2000;
      while(Date.now()<end) {const msg=messages.find(m=>m.type===type);if(msg)return msg;await new Promise(r=>setTimeout(r,10));}
      throw new Error(`Missing ${type}: ${JSON.stringify(messages)}`);
    }
    return {ws,wait,messages};
  }
  return {player,origin};
}
test('two real clients match, share text, receive server-calculated results',async t=>{
  const {player,origin}=await fixture(t);
  assert.equal((await fetch(origin+'/api/health')).status,200);
  const a=await player('Alice');assert.equal((await a.wait('waiting')).type,'waiting');
  const b=await player('Bob');
  const ra=await a.wait('countdown'),rb=await b.wait('countdown');assert.equal(ra.text,rb.text);
  await a.wait('running');a.ws.send(JSON.stringify({type:'input',text:ra.text[0]}));
  const result=await a.wait('done');assert.equal(result.winner,ra.id);
  assert.equal(result.players.find(p=>p.id===ra.id).correct,1);
  assert.equal((await b.wait('done')).winner,ra.id);
});
test('disconnect explicitly cancels opponent race',async t=>{
  const {player}=await fixture(t,{duration:2000});const a=await player('A');const b=await player('B');
  await a.wait('countdown');b.ws.close();assert.match((await a.wait('cancelled')).message,/断开/);
});
test('bulk pasted race input is rejected and cancels the room',async t=>{
  const {player}=await fixture(t,{duration:2000});const a=await player('A'),b=await player('B');await a.wait('running');
  a.ws.send(JSON.stringify({type:'input',text:'slow'}));assert.match((await a.wait('error')).message,/逐字/);await b.wait('cancelled');
});
test('cross-origin websocket requests are denied',async t=>{
  const {origin}=await fixture(t);
  const ws=new WebSocket(origin.replace('http','ws')+'/ws',{origin:'https://evil.example'});
  const [error]=await once(ws,'error');assert.match(error.message,/403/);
});
