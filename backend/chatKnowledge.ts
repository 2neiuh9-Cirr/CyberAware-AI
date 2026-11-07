import { catalogItems, db } from './database';
import { normalizedText } from './intelligence';

export function chatKnowledge(question: string) {
  const words = [...new Set(normalizedText(question).match(/[a-z0-9]{2,}/g) || [])]
    .filter(w => !['toi','ban','cua','nhung','nhu','the','nao','gi','voi','mot','cho','nay','muon','lam','hay','can'].includes(w));
  const items: {id:string; title:string; text:string; kind:string; url:string; sourceDate?:string}[] = [];
  for (const s of catalogItems('scenario')) items.push({id:'scenario-'+s.id,kind:'scenario',title:s.title,text:'Tình huống minh họa: '+s.summary+' '+s.preventionTips.join(' '),url:'/canh-bao'});
  for (const c of catalogItems('course').filter(c=>(c.status || 'published')==='published')) {
    for (const l of c.modules.filter((m:any)=>m.type!=='quiz' && m.content)) items.push({id:c.id+'-'+l.id,kind:'lesson',title:l.title,text:l.content,url:'/hoc-tap'});
    if(c.incidentGuidance) items.push({id:c.id+'-guidance',kind:'lesson',title:c.incidentGuidance.title,text:c.incidentGuidance.steps.join(' '),url:'/hoc-tap'});
  }
  for(const row of db.prepare("SELECT id,title,summary,source_url,source_date FROM threat_intel WHERE status='reviewed'").all()) {
    if(String(row.source_url).startsWith('https://')) items.push({id:'intel-'+row.id,kind:'intel',title:String(row.title),text:String(row.summary),url:String(row.source_url),sourceDate:String(row.source_date)});
  }
  return items.map(item=>({item,score:words.reduce((n,w)=>n+Number(normalizedText(item.title).includes(w))*3+Number(normalizedText(item.text).includes(w)),0)}))
    .filter(x=>x.score>1).sort((a,b)=>b.score-a.score).slice(0,3).map(({item})=>({...item,text:item.text.slice(0,1600)}));
}
