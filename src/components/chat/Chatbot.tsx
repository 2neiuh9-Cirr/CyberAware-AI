import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot, ChevronLeft, CircleHelp, FileText, ImagePlus, Info, LogOut, Maximize2,
  MessageSquare, Minus, Paperclip, Plus, Send, Settings, ShieldAlert, Sparkles,
  TriangleAlert, Truck, X,
} from 'lucide-react';

import { api, HttpError, json } from '../../api';
import { useAppStore } from '../../store/useAppStore';
import type { ChatAttachment, ChatMessage, ChatConversation, ChatCapabilities } from '../../types';
import { OPEN_CHAT_FULL_EVENT } from './chatEvents';
import { ChatAnswer } from './ChatAnswer';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { notify } from '../common/toast';

type ChatMode = 'closed' | 'compact' | 'full';
type Conversation = ChatConversation;

// Tin nhắn được xếp hàng cùng ID tạm để giao diện hiện ngay trước khi API trả lời.
type QueuedChatRequest = { conversationKey: string; message: string; file: File | null; isMember: boolean; userMessageId: string; responseId: string };

// Dựa vào phần mở rộng để hiển thị tệp ngay cả khi trình duyệt không cung cấp MIME.
const allowedExtensions = new Set(['png','jpg','jpeg','webp','pdf','docx','xlsx']);
const mimeByExtension: Record<string,string> = {
  png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', webp:'image/webp', pdf:'application/pdf',
  docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
function attachmentForFile(file: File, preview?: string): ChatAttachment {
  const extension=file.name.split('.').pop()?.toLowerCase() || '';
  const mimeType=mimeByExtension[extension] || file.type || 'application/octet-stream';
  return {kind:mimeType.startsWith('image/')?'image':'document',name:file.name,mimeType,...(preview?{preview}:{})};
}
function fileAttachmentKind(file: File | null): ChatAttachment['kind'] {
  return file ? attachmentForFile(file).kind : 'document';
}

// Các câu hỏi gợi ý được đưa vào ô nhập; người dùng vẫn quyết định lúc nào gửi.
const suggestions = [
  { title: 'Tư vấn thủ đoạn giao hàng', detail: 'Cách nhận biết shipper giả mạo', icon: Truck, prompt: 'Làm sao nhận biết thủ đoạn giả mạo nhân viên giao hàng?' },
  { title: 'Phân tích ảnh chụp', detail: 'Chuẩn bị ảnh tin nhắn để kiểm tra', icon: ImagePlus, prompt: 'Tôi muốn kiểm tra ảnh chụp một tin nhắn đáng ngờ.' },
  { title: 'Hướng dẫn tố cáo', detail: 'Các bước xử lý sau khi bị lừa', icon: TriangleAlert, prompt: 'Tôi cần làm gì nếu đã chuyển tiền cho người lạ?' },
  { title: 'Tìm hiểu CyberAware', detail: 'Nền tảng hỗ trợ những gì?', icon: Info, prompt: 'CyberAware AI có thể giúp tôi những gì?' },
];

const timeLabel = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export const Chatbot: React.FC = () => {

  // Trạng thái giao diện, hội thoại hiện tại, tệp chọn và hạn mức từ backend.
  const navigate = useNavigate();
  const [mode, setMode] = useState<ChatMode>('closed');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [file,setFile] = useState<File | null>(null);
  const attachmentName = file?.name || '';
  const member = useAppStore(s=>s.currentUser?.id);
  const [caps,setCaps] = useState<ChatCapabilities | null>(null);
  const [busy,setBusy] = useState(false);
  const [processing,setProcessing] = useState(false);
  const [queuedCount,setQueuedCount] = useState(0);
  const [showDelivery,setShowDelivery] = useState(false);
  const [notice,setNotice] = useState('');
  const [listCursor,setListCursor] = useState<string|null>(null);
  const [pendingDelete,setPendingDelete] = useState<Conversation | null>(null);
  const opened = mode !== 'closed';

  // Nhận yêu cầu mở toàn màn hình từ các trang khác qua chatEvents.ts.
  useEffect(() => {
    const openFullScreen = () => setMode('full');
    window.addEventListener(OPEN_CHAT_FULL_EVENT, openFullScreen);
    return () => window.removeEventListener(OPEN_CHAT_FULL_EVENT, openFullScreen);
  }, []);

  // Khi mở chatbot, lấy khả năng/hạn mức; thành viên còn tải danh sách hội thoại đã lưu.
  useEffect(()=>{
    if(!opened)return;
    let alive=true;
    api<ChatCapabilities>('/chat/capabilities').then(v=>{if(alive)setCaps(v)}).catch(e=>{if(alive)setNotice(e.message)});
    if(member) api('/chat/conversations').then(v=>{if(alive){setListCursor(v.nextCursor);updateConversations(rows=>[...v.items.map((c:Conversation)=>({...c,messages:rows.find(r=>r.id===c.id)?.messages || []})),...rows.filter(r=>!v.items.some((c:Conversation)=>c.id===r.id))])}}).catch(e=>{if(alive)setNotice(e.message)});
    return ()=>{alive=false};
  },[opened,member]);
  const [showNotice, setShowNotice] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);

  // Refs giữ trạng thái mới nhất cho hàng đợi bất đồng bộ, tránh dùng giá trị React đã cũ.
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<Conversation[]>([]);
  const messagesRef = useRef<Map<string,ChatMessage[]>>(new Map());
  const serverConversationIdsRef = useRef<Map<string,string>>(new Map());
  const requestQueueRef = useRef<QueuedChatRequest[]>([]);
  const processingRef = useRef(false);

  const active = conversations.find(item => item.id === activeId);
  conversationRef.current=conversations;

  // Cập nhật đồng thời ref và state để hàng đợi có thể đọc ngay dữ liệu vừa thay đổi.
  function updateConversations(update:(rows:Conversation[])=>Conversation[]) {
    const next=update(conversationRef.current);
    conversationRef.current=next;
    setConversations(next);
  }

  // Ghép ID hội thoại tạm với ID từ server, giữ nguyên tin nhắn đã hiện trên màn hình.
  function updateConversationMessages(key:string, update:(messages:ChatMessage[])=>ChatMessage[], serverId?:string) {
    const old=messagesRef.current.get(key)||[];
    const messages=update(old);
    messagesRef.current.set(key,messages);
    if(serverId)messagesRef.current.set(serverId,messages);
    updateConversations(rows=>{
      let found=false;
      const next=rows.map(row=>{
        if(row.id!==key&&row.id!==serverId)return row;
        found=true;
        return {...row,id:serverId||row.id,messages,messageCount:messages.length};
      });
      return found?next:[{id:serverId||key,title:messages.find(message=>message.role==='user')?.content.slice(0,60)||'Hội thoại mới',messageCount:messages.length,messages},...next];
    });
  }

  // Chế độ toàn màn hình khóa cuộn trang nền; Escape đóng chatbot.
  useEffect(() => {
    if (mode !== 'full') return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [mode]);

  useEffect(() => {
    if (mode === 'closed') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMode('closed');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [active?.messages.length, mode]);

  // Tạo vùng chat mới trên giao diện và xóa nội dung/tệp đang soạn.
  const newConversation = () => {
    if(busy)return;
    setActiveId(null);
    setDraft('');
    setFile(null);
    if(fileRef.current)fileRef.current.value='';
    setNotice('');
    inputRef.current?.focus();
  };

  // Thành viên tải từng trang tin nhắn từ server trước khi chuyển sang hội thoại đã chọn.
  async function openConversation(id:string){
    if(busy)return;
    setBusy(true);setNotice('');
    try{
      if(member){
        const messages:ChatMessage[]=[];let cursor:number|null=null;
        do {
          const page:{messages:ChatMessage[];nextCursor:number|null}=await api('/chat/conversations/'+id+'?limit=100'+(cursor?'&cursor='+cursor:''));
          messages.unshift(...page.messages);cursor=page.nextCursor;
        }while(cursor);
        messagesRef.current.set(id,messages);
        updateConversations(rows=>rows.map(r=>r.id===id?{...r,messages}:r));
      }
      setActiveId(id);setDraft('');setFile(null);if(fileRef.current)fileRef.current.value='';
    }catch(e){setNotice((e as Error).message)}finally{setBusy(false)}
  }

  // Chỉ xóa khi không còn yêu cầu đang xử lý; thành viên xóa cả bản ghi ở server.
  async function deleteCurrent(){
    if(!pendingDelete || busy || processingRef.current || requestQueueRef.current.length)return;
    setBusy(true);
    try{if(member)await api('/chat/conversations/'+pendingDelete.id,{method:'DELETE'});
      messagesRef.current.delete(pendingDelete.id);
      updateConversations(rows=>rows.filter(r=>r.id!==pendingDelete.id));
      if(activeId===pendingDelete.id){setActiveId(null);setDraft('');setFile(null);if(fileRef.current)fileRef.current.value='';setNotice('');}
      setPendingDelete(null);
      notify('Hội thoại đã được xóa.', 'success');
    }catch(e){setNotice((e as Error).message)}finally{setBusy(false)}
  }

  // Hiển thị ngay câu hỏi và ô trả lời đang chờ, rồi thêm yêu cầu vào hàng đợi.
  function submitMessage(){
    if(busy||!caps?.enabled||(!draft.trim()&&!file))return;
    if(requestQueueRef.current.length+(processingRef.current?1:0)>=5){setNotice('Đã đủ 5 tin nhắn đang chờ. Hãy đợi chatbot xử lý bớt rồi gửi tiếp.');return;}
    const selectedFile=file;
    const fileAttachment=selectedFile?attachmentForFile(selectedFile):undefined;
    const preview=fileAttachment?.kind==='image'&&selectedFile?URL.createObjectURL(selectedFile):undefined;
    const message=draft.trim() || (fileAttachment?.kind==='image'
      ?'Hãy nhận xét dấu hiệu đáng ngờ trong ảnh.'
      :'Hãy đọc và phân tích nội dung tài liệu đính kèm. Trả lời dựa trên nội dung tệp.');
    const conversationKey=activeId || `local-${crypto.randomUUID()}`;
    const messageId=crypto.randomUUID();
    const responseId=crypto.randomUUID();
    const createdAt=new Date().toISOString();
    const userMessage:ChatMessage={id:messageId,role:'user',content:message,createdAt,sources:[],deliveryState:'sending',...(fileAttachment?{attachment:{...fileAttachment,...(preview?{preview}:{})}}:{})};
    const pendingReply:ChatMessage={id:responseId,role:'assistant',content:'',createdAt,sources:[],deliveryState:'sending'};
    const prior=messagesRef.current.get(conversationKey) || conversationRef.current.find(row=>row.id===conversationKey)?.messages || [];
    const optimistic=[...prior,userMessage,pendingReply];
    messagesRef.current.set(conversationKey,optimistic);
    updateConversations(rows=>{
      const existing=rows.find(row=>row.id===conversationKey);
      const title=existing?.title || message.slice(0,60);
      const next=rows.filter(row=>row.id!==conversationKey);
      return [{id:conversationKey,title,messages:optimistic,messageCount:optimistic.length},...next];
    });
    if(!activeId)setActiveId(conversationKey);

    requestQueueRef.current.push({conversationKey,message,file:selectedFile,isMember:!!member,userMessageId:messageId,responseId});
    setQueuedCount(requestQueueRef.current.length+(processingRef.current?1:0));
    setDraft('');setFile(null);setNotice('');
    if(fileRef.current)fileRef.current.value='';
    void processRequestQueue();
  }

  // Gửi lần lượt để câu hỏi sau nhận đúng lịch sử/ID hội thoại của câu hỏi trước.
  async function processRequestQueue(){
    if(processingRef.current)return;
    processingRef.current=true;setProcessing(true);
    try{
      while(requestQueueRef.current.length){
        const item=requestQueueRef.current.shift()!;
        setQueuedCount(requestQueueRef.current.length+1);
        try{
          let reply:any;
          let retry=0;
          while(true){

            // Khách gửi lịch sử kèm request; lịch sử thành viên do backend đọc từ DB.
            const currentMessages=messagesRef.current.get(item.conversationKey)||[];
            const history=item.isMember?[]:currentMessages.filter(message=>message.id!==item.userMessageId&&!message.deliveryState).slice(-6).map(({role,content})=>({role,content}));
            const serverConversationId=item.isMember?(serverConversationIdsRef.current.get(item.conversationKey)||(item.conversationKey.startsWith('local-')?undefined:item.conversationKey)):undefined;
            const body={requestId:crypto.randomUUID(),message:item.message,conversationId:serverConversationId,guestSessionId:item.isMember?undefined:item.conversationKey.replace(/^local-/,'')||undefined,history};
            let options=json('POST',body);

            // Có tệp thì dùng multipart; chỉ có chữ thì gửi JSON.
            if(item.file){
              const form=new FormData();form.set('attachment',item.file,item.file.name);form.set('message',body.message);form.set('requestId',body.requestId);
              if(body.conversationId)form.set('conversationId',body.conversationId);
              if(body.guestSessionId)form.set('guestSessionId',body.guestSessionId);
              form.set('history',JSON.stringify(body.history));options={method:'POST',body:form};
            }
            try{
              reply=await api('/chat/messages',{...options,signal:AbortSignal.timeout(115000)});
              break;
            }catch(error){

              // Thử lại một lần khi giới hạn ngắn hạn có Retry-After, không tự thử khi hết quota ngày.
              const retryAfter=error instanceof HttpError?error.retryAfterSeconds:undefined;
              if(error instanceof HttpError&&error.status===429&&retry<1&&retryAfter&&retryAfter<=60&&!/hết hạn chat hôm nay/i.test(error.message)){
                retry++;setNotice('Chatbot đang chờ hạn mức yêu cầu được làm mới; tin nhắn của bạn vẫn đang xếp hàng.');
                updateConversationMessages(item.conversationKey,messages=>messages.map(message=>message.id===item.responseId?{...message,content:'Đang chờ lượt xử lý…'}:message));
                await new Promise(resolve=>setTimeout(resolve,(retryAfter+1)*1000));
                continue;
              }
              throw error;
            }
          }

          // Thay tin tạm bằng dữ liệu server trả về và cập nhật số token/lượt còn lại.
          const serverId=item.isMember?reply.conversationId:undefined;
          if(serverId)serverConversationIdsRef.current.set(item.conversationKey,serverId);
          updateConversationMessages(item.conversationKey,messages=>messages.map(message=>{
            if(message.id===item.userMessageId)return reply.userMessage as ChatMessage;
            if(message.id===item.responseId)return reply.assistantMessage as ChatMessage;
            return message;
          }),serverId);
          if(serverId)setActiveId(current=>current===item.conversationKey?serverId:current);
          setCaps(current=>current&&({...current,usage:{...current.usage,turnsRemainingToday:Math.max(0,current.usage.turnsRemainingToday-1),tokensRemainingToday:reply.usage.remainingTokensToday}}));
          setNotice(item.file&&reply.attachmentContextSaved===false?'Tệp đã được phân tích cho lượt này nhưng chưa được giữ làm ngữ cảnh hỏi tiếp. Hãy đính kèm lại nếu muốn hỏi sâu hơn.':'');
        }catch(error){

          // Giữ câu hỏi trên màn hình, đánh dấu thất bại và hiện lý do để người dùng biết.
          const message=(error as Error)?.message||'Không gửi được tin nhắn.';
          updateConversationMessages(item.conversationKey,messages=>messages.map(entry=>{
            if(entry.id===item.userMessageId)return {...entry,deliveryState:'failed'};
            if(entry.id===item.responseId)return {...entry,content:`Chưa nhận được câu trả lời. ${message}`,deliveryState:'failed'};
            return entry;
          }));
          setNotice(message);
        }
      }
    }finally{
      processingRef.current=false;setProcessing(false);setQueuedCount(0);
    }
  }
  const closeAndNavigate = (path: string) => {
    setMode('closed');
    navigate(path);
  };

  // Các khối giao diện được dùng lại ở cả cửa sổ nhỏ và chế độ toàn màn hình.
  const suggestionButtons = (compact: boolean) => (
    <div className={compact ? 'flex flex-wrap gap-2' : 'grid grid-cols-1 gap-3 sm:grid-cols-2'}>
      {suggestions.slice(0, compact ? 3 : 4).map(({ title, detail, icon: Icon, prompt }) => (
        <button key={title} type="button" onClick={() => { if(title===suggestions[0].title){setShowDelivery(v=>!v);return}setShowDelivery(false);setDraft(prompt); inputRef.current?.focus(); }}
          className={compact
            ? 'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 transition hover:border-blue-200 hover:text-[#004AC6]'
            : 'flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md'}>
          <Icon size={compact ? 17 : 24} className="shrink-0 text-[#004AC6]" />
          <span>{compact ? title : <><strong className="block text-sm text-slate-900">{title}</strong><span className="mt-0.5 block text-xs text-slate-500">{detail}</span></>}</span>
        </button>
      ))}
    </div>
  );

  const deliveryQuestions = showDelivery && <div className="mt-2 grid gap-1" aria-label="Chọn tình huống giao hàng">{['Đơn thanh toán khi nhận nhưng người giao yêu cầu chuyển khoản trước. Tôi nên làm gì?', 'Có tin nhắn yêu cầu quét QR để hoàn phí giao hàng. Làm sao kiểm tra?'].map(q=><button key={q} type="button" className="rounded-lg bg-blue-50 px-3 py-2 text-left text-xs" onClick={()=>{setDraft(q);setShowDelivery(false);inputRef.current?.focus()}}>{q}</button>)}</div>;

  // Ô soạn hiển thị trạng thái xử lý, tệp đã chọn và kiểm tra loại/dung lượng trước khi gửi.
  const composer = (compact: boolean) => (
    <div className={compact ? 'border-t border-slate-100 bg-white px-3 py-3' : 'border-t border-slate-100 bg-white px-5 py-4'}>
      <div className="mb-1 text-xs text-slate-500" role="status">{notice || (busy?'Đang tải hội thoại…':processing?`AI đang xử lý${queuedCount>1?` · ${queuedCount-1} tin nhắn đang chờ`:''}`:caps?.enabled?`Còn ${caps.usage.turnsRemainingToday} lượt hôm nay`:caps?'Trợ lý AI đang tắt.':'Đang kiểm tra kết nối…')}</div>
      {member && <p className="text-[11px] text-slate-500">Hội thoại được lưu 30 ngày.</p>}
      {file && <p className="mb-1 text-xs">Tệp được gửi đến Gemini và có thể được giữ làm ngữ cảnh hỏi tiếp tối đa 30 ngày (tài khoản) hoặc 24 giờ (khách). Hãy che OTP và dữ liệu riêng tư.</p>}
      {attachmentName && <div className="mb-2 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-[#003896]">{fileAttachmentKind(file)==='image'?<ImagePlus size={15}/>:<FileText size={15}/>}<span className="min-w-0 flex-1 truncate">{attachmentName}</span><button type="button" onClick={() => {setFile(null);if(fileRef.current)fileRef.current.value='';}} aria-label="Bỏ tệp đã chọn"><X size={15} /></button></div>}
      <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm focus-within:border-[#004AC6]">
        <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.xlsx,image/png,image/jpeg,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={event=>{const f=event.target.files?.[0];if(f){const ext=f.name.split('.').pop()?.toLowerCase()||'';const kind=fileAttachmentKind(f);const max=kind==='image'?2097152:8388608;if(!allowedExtensions.has(ext)){setFile(null);setNotice('Chọn ảnh PNG/JPG/WEBP, tệp PDF/DOCX hoặc bảng tính XLSX.');notify('Định dạng tệp chưa được hỗ trợ.','error');}else if(f.size>max){setFile(null);setNotice(kind==='image'?'Ảnh vượt 2 MiB.':'Tài liệu vượt 8 MiB.');notify('Tệp vượt dung lượng cho phép.','error');}else if(kind==='image'&&!caps?.imagesEnabled){setFile(null);setNotice('Phân tích ảnh hiện đang tắt. Bạn vẫn có thể gửi PDF, DOCX hoặc XLSX.');notify('Phân tích ảnh hiện đang tắt.','error');}else{setFile(f);setNotice('');}}event.target.value=''}} aria-label="Chọn ảnh hoặc tài liệu" />
        <button type="button" disabled={busy || !caps?.enabled} onClick={() => fileRef.current?.click()} className="rounded-xl p-2 text-slate-500 hover:bg-white hover:text-[#003EA8]" aria-label="Đính kèm ảnh hoặc tài liệu"><Paperclip size={22} /></button>
        <textarea disabled={busy} ref={inputRef} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitMessage(); } }}
          rows={1} maxLength={2000} placeholder={compact ? 'Nhập tin nhắn…' : 'Nhập câu hỏi hoặc dán tin nhắn nghi ngờ…'} aria-label="Tin nhắn cho trợ lý"
          className="max-h-28 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-1 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400" />
        <button type="button" onClick={submitMessage} disabled={busy || !caps?.enabled || (!draft.trim() && !file)} className="rounded-xl bg-[#004AC6] p-2.5 text-white transition hover:bg-[#003EA8] disabled:bg-slate-200 disabled:text-slate-400" aria-label="Gửi tin nhắn"><Send size={19} /></button>
      </div>
      {!compact && <p className="mt-2 text-center text-[11px] text-slate-400">Trợ lý AI có thể mắc sai sót. Hãy kiểm chứng thông tin quan trọng.</p>}
    </div>
  );

  // Tin người dùng và phản hồi AI có kiểu hiển thị riêng; nguồn tham khảo nằm dưới phản hồi.
  const messages = (compact: boolean) => (
    <div className="mx-auto flex w-full max-w-[980px] flex-col gap-4 px-4 py-5 sm:px-8" aria-live="polite">
      {active?.messages.map(m => (
        <div key={m.id} className={m.role === 'user' ? 'self-end rounded-xl bg-[#004AC6] p-3 text-sm text-white' : 'self-start rounded-xl bg-blue-50 p-3 text-sm'}>
          {m.attachment?.kind==='image'&&m.attachment.preview&&<img src={m.attachment.preview} alt={`Ảnh người dùng gửi: ${m.attachment.name}`} className="mb-2 max-h-72 max-w-full rounded-lg object-contain" />}
          {m.attachment?.kind==='document'&&<div className="mb-2 flex max-w-full items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-xs text-slate-700"><FileText size={17} className="shrink-0 text-[#004AC6]"/><span className="break-all">{m.attachment.name}</span></div>}
          {m.content&& (m.role === 'assistant' ? <ChatAnswer content={m.content} /> : <p className="whitespace-pre-wrap break-words">{m.content}</p>)}
          {m.role==='assistant'&&m.deliveryState==='sending'&&<p className="flex items-center gap-2 text-slate-500"><span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#004AC6]"/>Đang phân tích và soạn câu trả lời…</p>}
          {m.deliveryState==='sending'&&m.role==='user'&&<small className="mt-2 block text-[11px] opacity-70">Tin nhắn đang chờ gửi đến AI…</small>}
          {m.deliveryState==='failed'&&m.role==='user'&&<small className="mt-2 block text-[11px] opacity-80">Tin nhắn chưa được xử lý.</small>}
          {m.sources?.length > 0 && <div className="mt-3 space-y-1 border-t border-blue-100 pt-2 text-xs">
            <p className="font-semibold text-slate-600">Nguồn tham khảo</p>
            {m.sources.map(s => <a key={`${s.kind}:${s.url}:${s.title}`} className="block text-[#004AC6] underline underline-offset-2" href={s.url} target="_blank" rel="noreferrer">{s.title}</a>)}
          </div>}
          {m.role === 'assistant' && !m.deliveryState && <div className="mt-3 flex gap-3 text-xs"><button className="underline" onClick={() => closeAndNavigate('/kiem-tra')}>Kiểm tra dấu hiệu</button><button className="underline" onClick={() => closeAndNavigate('/bao-cao')}>Báo cáo</button></div>}
          <small className="mt-2 block text-[11px] opacity-70">{new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</small>
        </div>
      ))}
      {!compact && <div className="h-2" />}
      <div ref={endRef} />
    </div>
  );

  // Chọn một trong ba chế độ: nút mở, cửa sổ nhỏ hoặc toàn màn hình.
  return <>
    {mode === 'closed' && <button type="button" onClick={() => setMode('compact')} aria-label="Mở trợ lý AI" title="Mở trợ lý AI"
      className="fixed bottom-4 right-4 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#004AC6] to-[#003896] text-white shadow-[0_10px_24px_rgba(0,74,198,0.28)] transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#004AC6] sm:bottom-6 sm:right-8">
      <Bot size={28} strokeWidth={2.3} />{caps?.enabled && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />}
    </button>}

    {mode === 'compact' && <section role="dialog" aria-label="Trợ lý AI CyberAware" className="fixed bottom-4 right-4 z-[70] flex h-[min(500px,80dvh)] w-[min(340px,calc(100vw-32px))] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.22)] md:w-[380px]">
      <div className="flex items-center gap-3 bg-gradient-to-r from-[#004AC6] to-[#003896] px-4 py-3 text-white">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20"><Bot size={25} /></span><div className="min-w-0 flex-1"><h2 className="text-sm font-bold">Trợ lý AI CyberAware</h2><p className="text-[11px] text-blue-50">{caps?.enabled?'Sẵn sàng':'Trợ lý an toàn số'}</p></div>
        <button type="button" onClick={() => setMode('full')} className="rounded-lg p-2 hover:bg-white/15" aria-label="Mở toàn màn hình" title="Toàn màn hình"><Maximize2 size={20} /></button>
        <button type="button" onClick={() => setMode('closed')} className="rounded-lg p-2 hover:bg-white/15" aria-label="Đóng chatbot" title="Đóng"><X size={23} /></button>
      </div>
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-4"><p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><Sparkles size={15} className="text-[#004AC6]" /> Gợi ý nhanh</p>{suggestionButtons(true)}{deliveryQuestions}</div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-white">{active?.messages.length ? messages(true) : <div className="flex h-full flex-col items-center justify-center px-7 text-center"><span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#004AC6]"><Bot size={32} /></span><h3 className="text-lg font-bold text-slate-900">Xin chào! Mình có thể giúp gì?</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">Hỏi về dấu hiệu lừa đảo và cách tự bảo vệ trên mạng.</p></div>}</div>
      {composer(true)}
    </section>}

    {mode === 'full' && <section role="dialog" aria-modal="true" aria-label="Trợ lý AI CyberAware toàn màn hình" className="fixed inset-0 z-[100] flex overflow-hidden bg-white text-slate-900">
      {showSidebar && <aside className="hidden w-[300px] shrink-0 flex-col border-r border-slate-100 bg-white lg:flex lg:w-[360px]"><div className="flex items-center gap-3 border-b border-slate-100 p-5"><button type="button" onClick={newConversation} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#004AC6] px-4 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-[#003EA8]"><Plus size={22} /> Hội thoại mới</button><button type="button" onClick={() => setShowSidebar(false)} aria-label="Ẩn thanh bên" className="p-2 text-slate-400 hover:text-slate-700"><ChevronLeft size={21} /></button></div><div className="min-h-0 flex-1 overflow-y-auto px-5 py-5"><h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-400">Gần đây</h2>{conversations.length ? conversations.map(item => <button key={item.id} type="button" onClick={() => void openConversation(item.id)} className={`mb-1 flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-slate-50 ${activeId === item.id ? 'bg-blue-50' : ''}`}><MessageSquare size={21} className="mt-0.5 shrink-0 text-slate-400" /><span className="min-w-0"><span className="block truncate text-sm font-medium text-slate-800">{item.title}</span><span className="mt-1 block text-xs text-slate-400">{item.messageCount} tin nhắn</span></span></button>) : <p className="px-3 text-sm text-slate-400">Chưa có hội thoại nào.</p>}</div><div className="space-y-1 border-t border-slate-100 p-5"><button type="button" onClick={() => closeAndNavigate('/cai-dat')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><Settings size={20} /> Cài đặt</button><button type="button" onClick={() => closeAndNavigate('/gioi-thieu')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><CircleHelp size={20} /> Trợ giúp</button></div></aside>}
      <div className="flex min-w-0 flex-1 flex-col"><header className="shrink-0 border-b border-slate-100 bg-white px-4 py-4 sm:px-6"><div className="flex items-center gap-3"><div className="flex min-w-0 flex-1 items-center gap-3">{!showSidebar && <button type="button" onClick={() => setShowSidebar(true)} className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:block" aria-label="Hiện thanh bên"><MessageSquare size={20} /></button>}<h2 className="truncate text-lg font-bold sm:text-xl">Trợ lý AI CyberAware</h2></div><button type="button" onClick={newConversation} className="rounded-lg p-2 text-[#003EA8] hover:bg-blue-50 lg:hidden" aria-label="Hội thoại mới"><Plus size={22} /></button><button type="button" onClick={() => setMode('compact')} className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold hover:bg-slate-200"><Minus size={18} /><span className="hidden sm:inline">Thu nhỏ</span></button><button type="button" onClick={() => setMode('closed')} className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100"><LogOut size={18} /><span className="hidden sm:inline">Thoát</span></button></div><div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
        {conversations.length>0 && <select disabled={busy} aria-label="Hội thoại gần đây" value={activeId || ''} onChange={e=>void openConversation(e.target.value)} className="max-w-44 lg:hidden"><option value="" disabled>Gần đây</option>{conversations.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select>}
        {listCursor && <button onClick={async()=>{try{const p=await api('/chat/conversations?cursor='+encodeURIComponent(listCursor));setListCursor(p.nextCursor);setConversations(rows=>[...rows,...p.items.filter((c:Conversation)=>!rows.some(r=>r.id===c.id)).map((c:Conversation)=>({...c,messages:[]}))])}catch(e){setNotice((e as Error).message)}}}>Tải thêm</button>}
        {active && <button disabled={busy||processing||requestQueueRef.current.length>0} className="shrink-0 text-xs text-rose-700 disabled:text-slate-300" onClick={()=>setPendingDelete(active)}>Xóa hội thoại</button>}<span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-[#003EA8]"><Bot size={18} /> AI</span><span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">Phòng tránh lừa đảo</span><span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">Hướng dẫn xử lý</span></div></header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#F8FAFC]">{active?.messages.length ? messages(false) : <div className="mx-auto flex min-h-full w-full max-w-[1020px] flex-col justify-center px-5 py-10 sm:px-8"><div className="mb-8"><span className="mb-4 flex h-20 w-20 items-center justify-center rounded-[26px] bg-blue-50 text-[#004AC6] shadow-sm"><Bot size={34} /></span><h1 className="text-2xl font-bold leading-tight text-slate-950 sm:text-4xl">Chào bạn, Trợ lý AI có thể giúp gì?</h1><p className="mt-3 text-base text-slate-500 sm:text-xl">Hỗ trợ nhận biết rủi ro và tìm hiểu cách phòng chống lừa đảo trực tuyến.</p></div>{suggestionButtons(false)}{deliveryQuestions}{showNotice && <div className="mt-8 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600"><ShieldAlert size={20} className="shrink-0 text-slate-400" /><span className="flex-1">Không gửi mã OTP, mật khẩu hoặc thông tin thẻ ngân hàng tại đây.</span><button type="button" onClick={() => setShowNotice(false)} aria-label="Đóng lưu ý" className="text-slate-400 hover:text-slate-700"><X size={19} /></button></div>}</div>}</div>
        <div className="mx-auto w-full max-w-[1040px]">{composer(false)}</div>
      </div>
    </section>}
    {pendingDelete && <ConfirmDialog title="Xóa hội thoại?" description={`Hội thoại “${pendingDelete.title}” sẽ bị xóa vĩnh viễn và không thể khôi phục.`} confirmLabel="Xóa hội thoại" busy={busy||processing||requestQueueRef.current.length>0} onConfirm={() => void deleteCurrent()} onCancel={() => setPendingDelete(null)} />}
  </>;
};
