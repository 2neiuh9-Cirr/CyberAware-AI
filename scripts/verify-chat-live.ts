import 'dotenv/config';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
process.env.AUTH_DATA_DIR=mkdtempSync(path.join(tmpdir(),'cyberaware-chat-live-'));
const {createApp}=await import('../server');
const server=createApp().listen(0,'127.0.0.1');
await new Promise<void>(resolve=>server.once('listening',resolve));
try {
  const res=await fetch('http://127.0.0.1:'+(server.address() as AddressInfo).port+'/api/chat/messages',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({requestId:randomUUID(),message:process.argv[2] || 'Làm sao nhận biết shipper giả mạo?'})});
  const reply=await res.json();
  console.log({status:res.status,hasAnswer:!!reply.assistantMessage?.content,usage:reply.usage,error:reply.error});
  if(!res.ok||!reply.assistantMessage?.content)process.exitCode=1;
}finally{server.close();}
