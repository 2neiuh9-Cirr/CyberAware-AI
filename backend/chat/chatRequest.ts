import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { GoogleGenAI, ThinkingLevel, type Part } from '@google/genai';
import { db } from '../database';
import { ApiError } from '../http';
import type { ChatKnowledgeSource } from './chatKnowledge';
import { retrieveChatKnowledge } from './chatSemantic';
import { groundObservedSigns, publicChatSources, sanitizeChatAnswer } from '../../shared/chatAnswer';
import { canTryAnotherModel, modelCandidates } from '../ai/modelFallback';
import { processChatAttachment, selectRelevantDocumentText, type ChatAttachment } from './attachments';
import { instruction } from './chatPrompt';
import { allowance, identity, MAX_CONTEXT_INLINE_BYTES, MAX_CONTEXTS_PER_ACTOR, MAX_CONTEXTS_PER_SESSION, model, owned, reserve, settings, transaction, uuid } from './chatState';

const redact=(s:string)=>s.replace(/((?:otp|mã xác thực|password|mật khẩu|token)\s*[:=]?\s*)[\w-]{4,}/gi,'$1[ĐÃ ẨN]');

// Chấp nhận JSON hoặc multipart; multipart chỉ có một tệp và được chuyển qua bộ xử lý đính kèm.
async function payload(req:Request){
  if(!req.is('multipart/form-data'))return {body:req.body,modelPart:undefined as Part|undefined,attachment:undefined as ChatAttachment|undefined,attachmentText:undefined as string|undefined};
  let form:FormData;
  try{form=await new globalThis.Response(new Uint8Array(req.body),{headers:{'Content-Type':req.get('content-type')!}}).formData()}catch{throw new ApiError(400,'Biểu mẫu đính kèm không hợp lệ.')}
  const uploads=['attachment','image','document'].flatMap(key=>form.getAll(key));
  if(uploads.length>1)throw new ApiError(400,'Mỗi lượt chỉ gửi được một tệp.');
  const file=uploads[0];
  if(file!==undefined&&!(file instanceof Blob))throw new ApiError(400,'Tệp đính kèm không hợp lệ.');
  const processed=file instanceof Blob?await processChatAttachment(file as Blob & {name?:string}):undefined;
  const body:any=Object.fromEntries(form.entries());
  delete body.attachment;delete body.image;delete body.document;
  if(body.history){try{body.history=JSON.parse(body.history)}catch{throw new ApiError(400,'Lịch sử không hợp lệ.')}}
  return {body,modelPart:processed?.modelPart as Part|undefined,attachment:processed?.attachment,attachmentText:processed?.extractedText};
}
export const chatProvider = { models: () => new GoogleGenAI({ apiKey:process.env.GEMINI_API_KEY, httpOptions:{retryOptions:{attempts:1}} }).models };

// Xử lý một lượt chat: xác thực, truy xuất dữ liệu, gọi model và lưu kết quả.
export async function handleChatMessage(req: Request, res: Response, next: NextFunction) {
  let reserved=false,actor='',id='',spent=0,generated=false,embeddingTokens=0;
  try{
    // 1. Xác thực actor, cấu hình, nội dung câu hỏi và tệp trước khi gọi model.
    const who=identity(req,res);actor=who.actor;
    const config=settings();
    if(!req.is('application/json')&&!req.is('multipart/form-data'))throw new ApiError(415,'Định dạng yêu cầu không hợp lệ.');
    if(!config.enabled||!process.env.GEMINI_API_KEY?.trim())throw new ApiError(503,'Trợ lý AI hiện chưa khả dụng.');
    const parsedPayload=await payload(req);
    const {body,attachment,attachmentText}=parsedPayload;
    let modelPart=parsedPayload.modelPart;
    if(attachment?.kind==='image'&&!config.imagesEnabled)throw new ApiError(400,'Phân tích ảnh đang tắt.');
    id=body?.requestId;
    if(typeof id!=='string'||!uuid.test(id)||typeof body.message!=='string'||body.message.length>2000||(!body.message.trim()&&!attachment))throw new ApiError(400,'Câu hỏi hoặc mã yêu cầu không hợp lệ.');

    // 2. Lấy tối đa sáu tin nhắn cũ; hội thoại thành viên được đọc từ DB, khách gửi lịch sử kèm yêu cầu.
    const message=redact(body.message.trim()) || (attachment?.kind==='image'?'Hãy nhận xét dấu hiệu đáng ngờ trong ảnh.':'Hãy đọc và phân tích nội dung tài liệu đính kèm. Trả lời dựa trên nội dung tệp.');
    let history=body.history ?? [];
    if(!Array.isArray(history)||history.length>6||history.some(h=>!['user','assistant'].includes(h?.role)||typeof h.content!=='string'||h.content.length>6000))throw new ApiError(400,'Lịch sử không hợp lệ.');
    if(who.userId && history.length)throw new ApiError(400,'Lịch sử tài khoản do máy chủ quản lý.');
    const cid=body.conversationId || null;
    if(cid){if(!who.userId||typeof cid!=='string')throw new ApiError(404,'Không tìm thấy hội thoại.');owned(cid,who.userId);
      history=db.prepare('SELECT role,content,sources FROM chat_messages WHERE conversation_id=? ORDER BY seq DESC LIMIT 6').all(cid).reverse();}
    const guestSessionId=body.guestSessionId;
    if(!who.userId&&guestSessionId!==undefined&&(typeof guestSessionId!=='string'||!uuid.test(guestSessionId)))throw new ApiError(400,'Mã phiên chatbot không hợp lệ.');
    const conversationId=who.userId?(cid||randomUUID()):null;
    const contextSessionId=who.userId?conversationId!:String(guestSessionId||randomUUID());
    history=history.map((h:any)=>({role:h.role,content:redact(h.role==='assistant'?sanitizeChatAnswer(h.content,h.sources?JSON.parse(h.sources):[]):h.content)}));

    // Tải lại nội dung tệp cùng phiên còn hạn để xử lý câu hỏi tiếp theo về tài liệu/ảnh cũ.
    const previousContextRows=db.prepare('SELECT name,mime_type AS mimeType,extracted_text AS extractedText,inline_mime_type AS inlineMimeType,inline_data AS inlineData FROM chat_attachment_context WHERE actor=? AND session_id=? AND expires_at>? ORDER BY created_at DESC LIMIT ?').all(actor,contextSessionId,Date.now(),MAX_CONTEXTS_PER_SESSION) as Array<{name:string;mimeType:string;extractedText:string;inlineMimeType:string|null;inlineData:Buffer|null}>;
    const ai={models:chatProvider.models()};
    let source:ChatKnowledgeSource[]=[];

    // Dùng câu hỏi gần đây để chọn đoạn tệp liên quan; dữ liệu nội bộ được truy xuất riêng ở bước sau.
    const retrievalQuery=[...history.filter((h:any)=>h.role==='user').slice(-3).map((h:any)=>h.content),message].join('\n');
    let includedAttachmentText=attachmentText?selectRelevantDocumentText(attachmentText,retrievalQuery):'';
    const previousAttachments=previousContextRows.map(row=>({
      name:row.name,
      mimeType:row.mimeType,
      text:row.extractedText?selectRelevantDocumentText(row.extractedText,retrievalQuery,5000):'',
      inspectDirectly:!!row.inlineData,
      ...(row.inlineData&&row.inlineMimeType?{modelPart:{inlineData:{mimeType:row.inlineMimeType,data:Buffer.from(row.inlineData).toString('base64')}}}:{}),
    }));
    const hasVisualInput=!!modelPart||previousAttachments.some(previous=>!!previous.modelPart);

    // Ngân sách ngữ cảnh và thời gian chờ tăng khi cần đọc ảnh/PDF trực tiếp.
    let cap=modelPart?(attachment?.kind==='image'?11000:20000):previousAttachments.some(previous=>!!previous.modelPart)?20000:attachment?.kind==='document'?15000:6000;
    const abortSignal=AbortSignal.timeout(hasVisualInput?120000:90000);
    const candidates=modelCandidates(model(),'chat');
    let modelIndex=0;
    let selectedModel=candidates[modelIndex];
    const requestSignal=()=>AbortSignal.any([abortSignal,AbortSignal.timeout(hasVisualInput?50000:35000)]);
    const switchModel=(error:any,stage:string)=>{
      if(!canTryAnotherModel(error) || abortSignal.aborted || modelIndex>=candidates.length-1) return false;
      const fallback=candidates[++modelIndex];
      console.warn('Gemini chat model unavailable; trying fallback',{stage,status:error.status,model:selectedModel,fallback});
      selectedModel=fallback;
      return true;
    };

    // 3. Giữ chỗ token trước mọi lệnh tới Gemini, kể cả countTokens và embedding.
    const queryEmbeddingReserve=Math.ceil(message.length/4)+16;
    reserve(actor,id,attachment?.kind==='image',cap+2048+queryEmbeddingReserve,res);reserved=true;
    const count=async(parts:Part[])=>{
      while(true){
        try{
          const r=await ai.models.countTokens({model:selectedModel,contents:[{role:'user',parts}],config:{abortSignal:requestSignal()}});
          if(typeof r.totalTokens!=='number')throw new Error('invalid-model-response');
          return r.totalTokens;
        }catch(error){if(!switchModel(error,'countTokens'))throw error;}
      }
    };

    // 4. Lấy nguồn nội bộ, kiểm tra câu hỏi tối đa 800 token và đóng gói dữ liệu cho model.
    const retrieval=await retrieveChatKnowledge(message,ai.models);
    source=retrieval.sources;
    embeddingTokens=retrieval.embeddingTokens;
    if(await count([{text:message}])>800)throw new ApiError(422,'Câu hỏi vượt 800 token.');
    const parts=():Part[]=>[
      {text:JSON.stringify({question:message,history,sources:source.map(s=>({title:s.title,kind:s.kind,text:s.text})),...(attachment?{attachment:{name:attachment.name,mimeType:attachment.mimeType,text:includedAttachmentText||undefined,inspectDirectly:!!modelPart}}:{}),...(previousAttachments.length?{previousAttachments:previousAttachments.map(({modelPart:_modelPart,...previous})=>previous)}:{})})},
      ...(modelPart?[modelPart]:[]),
      ...previousAttachments.flatMap(previous=>previous.modelPart?[previous.modelPart]:[]),
    ];

    // Nếu quá ngân sách, ưu tiên giữ câu hỏi; giảm lịch sử, nguồn và trích đoạn theo thứ tự.
    let input=await count([{text:instruction},...parts()]);
    if(input>cap&&modelPart&&attachment?.kind==='document'&&attachmentText){
      modelPart=undefined;cap=15000;
      input=await count([{text:instruction},...parts()]);
    }
    while(input>cap&&(history.length||source.length||includedAttachmentText.length>4000||previousAttachments.length)){
      if(history.length)history=history.slice(1);
      else if(source.length)source.pop();
      else if(includedAttachmentText.length>4000)includedAttachmentText=includedAttachmentText.slice(0,Math.max(4000,Math.floor(includedAttachmentText.length*0.8)));
      else {
        const textIndex=previousAttachments.findIndex(previous=>previous.text.length>1600);
        const visualIndex=previousAttachments.findIndex(previous=>!!previous.modelPart);
        if(textIndex>=0)previousAttachments[textIndex].text=previousAttachments[textIndex].text.slice(0,Math.max(1600,Math.floor(previousAttachments[textIndex].text.length*0.7)));
        else if(visualIndex>=0){previousAttachments[visualIndex].modelPart=undefined;previousAttachments[visualIndex].inspectDirectly=false;}
        else previousAttachments.pop();
      }
      input=await count([{text:instruction},...parts()]);
    }
    if(input>cap)throw new ApiError(422,'Nội dung vượt hạn mức ngữ cảnh.');

    // 5. Yêu cầu Gemini trả JSON gồm câu trả lời và tên nguồn đã dùng; thử model dự phòng khi phù hợp.
    generated=true;spent=input+2048+embeddingTokens;
    const generate=()=>ai.models.generateContent({model:selectedModel,contents:[{role:'user',parts:parts()}],config:{abortSignal:requestSignal(),maxOutputTokens:2048,...(/^gemini-3.*flash/i.test(selectedModel)?{thinkingConfig:{thinkingLevel:ThinkingLevel.MINIMAL}}:{}),systemInstruction:instruction,responseMimeType:'application/json',responseJsonSchema:{type:'object',required:['answer','sourceTitles'],properties:{answer:{type:'string'},sourceTitles:{type:'array',items:{type:'string'}}}}}});
    let result;let answer;
    while(true){
      try{
        result=await generate();
        try{answer=JSON.parse(result.text || '');}catch{throw new Error('invalid-model-response');}
        if(typeof answer?.answer!=='string'||!answer.answer.trim()||!Array.isArray(answer.sourceTitles)||answer.sourceTitles.some((title:unknown)=>typeof title!=='string'))throw new Error('invalid-model-response');
        break;
      }catch(err:any){
        if(!switchModel(err,'generateContent'))throw err;
        if(await count([{text:message}])>800)throw new ApiError(422,'Câu hỏi vượt hạn mức model dự phòng.');
        input=await count([{text:instruction},...parts()]);
        if(input>cap)throw new ApiError(422,'Ngữ cảnh vượt hạn mức model dự phòng.');
      }
    }
    spent=(result.usageMetadata?.totalTokenCount ?? input+2048)+embeddingTokens;

    // Chỉ công khai nguồn được model chọn, làm sạch câu trả lời và đối chiếu dấu hiệu với dữ kiện người dùng cung cấp.
    const sources=publicChatSources(source.filter(s=>answer.sourceTitles.includes(s.title)));
    const createdAt=new Date().toISOString();
    const userMessage={id:randomUUID(),role:'user',content:message,createdAt,sources:[],...(attachment?{attachment}:{})};
    const formattedAnswer=sanitizeChatAnswer(redact(answer.answer),source);
    const userContext=[message,...history.filter((entry:any)=>entry.role==='user').map((entry:any)=>entry.content),includedAttachmentText,...previousAttachments.map(previous=>previous.text)].join('\n');
    const assistantMessage={id:randomUUID(),role:'assistant',content:hasVisualInput?formattedAnswer:groundObservedSigns(formattedAnswer,userContext),createdAt,sources};
    const inlineContextData=modelPart?.inlineData?.data?Buffer.from(modelPart.inlineData.data,'base64'):undefined;
    const attachmentContextSaved=!!attachment&&!!(attachmentText?.length||(inlineContextData&&inlineContextData.byteLength<=MAX_CONTEXT_INLINE_BYTES));

    // 6. Lưu tin nhắn thành viên, ngữ cảnh tệp và token thực dùng trong cùng một giao dịch.
    transaction(()=>{
      if(who.userId){
        if(cid)owned(cid,who.userId);
        if(!cid)db.prepare('INSERT INTO chat_conversations VALUES(?,?,?,?)').run(conversationId,who.userId,message.slice(0,60),createdAt);
        else db.prepare('UPDATE chat_conversations SET updated_at=? WHERE id=?').run(createdAt,cid);
        const write=db.prepare('INSERT INTO chat_messages(id,conversation_id,role,content,sources,created_at,attachment) VALUES(?,?,?,?,?,?,?)');
        for(const m of [userMessage,assistantMessage])write.run(m.id,conversationId,m.role,m.content,JSON.stringify(m.sources),createdAt,'attachment' in m?JSON.stringify(m.attachment):null);
      }
      if(attachmentContextSaved&&attachment){
        const retainedInline=inlineContextData&&inlineContextData.byteLength<=MAX_CONTEXT_INLINE_BYTES?inlineContextData:null;
        db.prepare('INSERT INTO chat_attachment_context(attachment_id,actor,session_id,conversation_id,name,mime_type,extracted_text,inline_mime_type,inline_data,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
          .run(randomUUID(),actor,contextSessionId,conversationId,attachment.name,attachment.mimeType,attachmentText||'',retainedInline?modelPart?.inlineData?.mimeType||null:null,retainedInline||null,createdAt,Date.now()+(who.userId?30:1)*86400000);
        db.prepare(`DELETE FROM chat_attachment_context WHERE actor=? AND session_id=? AND attachment_id NOT IN (SELECT attachment_id FROM chat_attachment_context WHERE actor=? AND session_id=? ORDER BY created_at DESC LIMIT ?)`)
          .run(actor,contextSessionId,actor,contextSessionId,MAX_CONTEXTS_PER_SESSION);
        db.prepare(`DELETE FROM chat_attachment_context WHERE rowid IN (SELECT rowid FROM chat_attachment_context WHERE actor=? ORDER BY created_at DESC LIMIT -1 OFFSET ?)`)
          .run(actor,MAX_CONTEXTS_PER_ACTOR);
      }
      db.prepare('UPDATE chat_usage SET pending=0,tokens=? WHERE actor=? AND request_id=?').run(spent,actor,id);
    });reserved=false;
    res.json({conversationId,userMessage,assistantMessage,attachmentContextSaved:attachment?attachmentContextSaved:undefined,usage:{inputTokens:result.usageMetadata?.promptTokenCount??input,outputTokens:result.usageMetadata?.candidatesTokenCount??0,embeddingTokens,remainingTokensToday:allowance(actor).tokensRemainingToday}});
  }catch(e:any){
    // Lỗi từ bước tạo câu trả lời có thể vẫn tốn token; lỗi chuẩn bị sẽ hoàn lại phần giữ chỗ.
    if(reserved){if(generated && ![400,401,403,404,429,503].includes(e?.status))db.prepare('UPDATE chat_usage SET pending=0,tokens=? WHERE actor=? AND request_id=?').run(spent,actor,id);
      else db.prepare('DELETE FROM chat_usage WHERE actor=? AND request_id=?').run(actor,id);}
    if(e instanceof ApiError)return next(e);
    console.warn('Gemini chat request failed',{status:Number(e?.status)||undefined,name:e?.name,reason:e?.cause?.code || e?.cause?.name,stage:generated?'generate':'prepare'});
    if(e?.status===429)res.set('Retry-After','60');
    next(new ApiError(e?.status===429?429:/timeout|abort/i.test(String(e?.name)+' '+String(e?.message))?504:503,'Dịch vụ AI đang bận. Vui lòng thử lại.'));
  }
}
