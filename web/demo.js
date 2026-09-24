/* Isolated demo simulator. No network, real people, GPS or payment calls. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RideDemo=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const copy=x=>JSON.parse(JSON.stringify(x)),active=r=>['gathering','ready'].includes(r.state);
 const names=['陈同学','林可','阿晴','周同学','小宇'];
 const places=['澳门科技大学 TIS','澳门科技大学 R 座','澳门科技大学 A 座','擎天汇','横琴口岸'];
 function createDemo(options={}){
  const clock=options.now||Date.now;let seq=0,state;
  const uid=()=>`demo-${clock().toString(36)}-${++seq}-${Math.random().toString(36).slice(2,6)}`;
  const person=(i)=>({id:'bot-'+i,name:names[i%names.length],arrived:false});
  const message=(r,who,text)=>r.messages.push({id:uid(),sender:who.id,name:who.name,text,at:clock()});
  function make(from,to,departAt,members,capacity=4){return {id:uid(),demo:true,from,to,departAt,capacity,owner:members[0].id,members:copy(members),messages:[],locations:{},requests:[],offer:null,bill:null,state:'gathering',createdAt:clock(),point:(from.includes('TIS')?'TIS 门口右侧上客区':from+'上客区')}}
  function split(r,total,payer){return {total,currency:'MOP',payer,createdAt:clock(),items:r.members.map((m,i)=>({id:m.id,name:m.name,cents:Math.floor(total/r.members.length)+(i<total%r.members.length?1:0),status:m.id===payer?'received':'pending'}))}}
  function location(r,m,i){r.locations[m.id]={latitude:22.1494+i*.0003,longitude:113.5788+i*.00032,accuracy:8,updatedAt:clock(),demo:true}}
  function reset(){const now=clock();state={version:1,createdAt:now,user:{id:'demo-me',name:'小予',avatar:''},rooms:[],jobs:[],currentId:null};const me={...state.user,arrived:false};
   const live=make(places[0],places[3],now+25*60000,[me,person(0),person(1)]);live.showcase=true;message(live,person(0),'我在 TIS 门口右侧的上客区，穿白色外套。');message(live,me,'好，我下课后过来，大概还要 3 分钟。');message(live,person(1),'我已经到啦，等你们一起上车～');live.members[2].arrived=true;location(live,person(0),0);location(live,person(1),2);state.rooms.push(live);
   const past=make(places[3],places[1],now-86400000,[me,person(0),person(2),person(3)]);past.state='completed';past.members.forEach(m=>m.arrived=true);message(past,person(0),'今天这趟一共 120 澳门元，辛苦你先垫付啦。');message(past,me,'分摊单发好了，每人 30 元。');past.bill=split(past,12000,me.id);past.bill.items[1].status='received';past.bill.items[2].status='reported';state.rooms.push(past);
   const unpaid=make(places[2],places[4],now-2*86400000,[person(1),me,person(4)]);unpaid.state='completed';unpaid.members.forEach(m=>m.arrived=true);message(unpaid,person(1),'车费我先付了，一共 96 元，每人 32 元就好。');unpaid.bill=split(unpaid,9600,'bot-1');state.rooms.push(unpaid);
   [[0,3,8,4,0],[1,4,18,6,1],[3,2,40,4,2],[2,4,55,6,3]].forEach(([f,t,mins,cap,i])=>{const r=make(places[f],places[t],now+mins*60000,[person(i),person((i+1)%5)],cap);r.public=true;message(r,person(i),'已约好在上客区集合，还可以一起拼车。');state.rooms.push(r)});save();return copy(state.user)
  }
  function save(){if(options.write)options.write(copy(state))}
  try{state=options.read&&options.read()}catch{}if(!state||state.version!==1||clock()-state.createdAt>12*3600000)reset();
  const room=id=>{let r=state.rooms.find(r=>r.id===id),n=0;while(r?.state==='merged'&&n++<10)r=state.rooms.find(x=>x.id===r.mergedInto);return r};
  function releaseTarget(r){if(r.pendingTargetId){const target=room(r.pendingTargetId);if(target?.pendingJoin===r.id)delete target.pendingJoin;delete r.pendingTargetId}delete r.pendingMembers;delete r.joinConfirmed}
  function job(type,id,delay,extra={}){state.jobs.push({type,id,at:clock()+delay,...extra})}
  function offer(r){const bots=(r.pendingMembers||[person(Math.floor(Math.random()*names.length))]).slice(0,r.capacity-1);r.offer={id:uid(),participants:[...r.members,...bots].map(m=>({id:m.id,name:m.name,departAt:r.departAt})),confirmed:r.joinConfirmed?[state.user.id]:[],from:r.from,to:r.to};delete r.joinConfirmed;delete r.pendingMembers;job('bot-confirm',r.id,1500,{offerId:r.offer.id})}
  function merge(r){if(!r.offer||r.offer.confirmed.length!==r.offer.participants.length)return;const target=r.pendingTargetId?room(r.pendingTargetId):null;if(target){if(!active(target)||target.members.length>=target.capacity){releaseTarget(r);r.offer=null;job('match',r.id,2500);return}const joined=[...target.members,...r.members.filter(m=>!target.members.some(x=>x.id===m.id))];if(joined.length>target.capacity)throw Error('人数已满，请重新选择');target.members=joined;target.offer=null;delete target.pendingJoin;r.state='merged';r.mergedInto=target.id;r.offer=null;state.currentId=target.id;r=target}else r.members=r.offer.participants.map(m=>({id:m.id,name:m.name,arrived:false}));r.offer=null;message(r,{id:'system',name:'拼车提醒'},'大家已确认同行，现在可以直接沟通。');r.members.filter(m=>m.id!==state.user.id).forEach((m,i)=>location(r,m,i));job('welcome',r.id,900)}
  function advance(){const due=state.jobs.filter(j=>j.at<=clock());state.jobs=state.jobs.filter(j=>j.at>clock());for(const j of due){const r=room(j.id);if(!r)continue;
    if(j.type==='match'&&active(r)&&r.members.length===1&&!r.offer)offer(r);
    if(j.type==='bot-confirm'&&active(r)&&r.offer?.id===j.offerId){r.offer.confirmed=[...new Set([...r.offer.confirmed,...r.offer.participants.filter(m=>m.id!==state.user.id).map(m=>m.id)])];merge(r)}
    if(['welcome','reply'].includes(j.type)&&!['cancelled','timeout'].includes(r.state)){const bot=r.members.find(m=>m.id!==state.user.id);if(bot)message(r,bot,j.text||'你好呀！我在上客区附近，出发前在这里联系就好。')}
    if(j.type==='arrive'&&active(r)&&r.members.find(m=>m.id===state.user.id)?.arrived){r.members.forEach(m=>m.arrived=true);r.state='completed';r.locations={};message(r,{id:'system',name:'拼车提醒'},'所有伙伴已到达，集合已完成。乘车后可以从这里分摊车费。')}
    if(j.type==='reported'&&r.bill)r.bill.items.filter(m=>m.id!==r.bill.payer).forEach(m=>{if(m.status==='pending')m.status='reported'});
    if(j.type==='received'&&r.bill){const row=r.bill.items.find(m=>m.id===state.user.id);if(row?.status==='reported')row.status='received'}
   }
   for(const r of state.rooms){if(active(r)&&clock()>=r.departAt+1800000){releaseTarget(r);r.state='timeout';r.offer=null;r.locations={}}if(active(r))Object.entries(r.locations).forEach(([id,p],i)=>{if(id!==state.user.id){const motion=Math.sin(clock()/10000+i)*.00006;p.latitude=22.1494+i*.0003+motion;p.updatedAt=clock()}})}save()
  }
  function mine(){return state.rooms.filter(r=>r.state!=='merged'&&r.members.some(m=>m.id===state.user.id)).sort((a,b)=>b.departAt-a.departAt)}
  function current(){const r=room(state.currentId);return r&&active(r)?r:null}
  function publicRooms(){return state.rooms.filter(r=>r.public&&active(r)&&!r.pendingJoin&&r.members.length<r.capacity&&!r.members.some(m=>m.id===state.user.id)).map(r=>({...r,count:r.members.length,ownerName:r.members[0].name,joined:false}))}
  function snapshot(id){advance();return copy({mode:'demo',user:state.user,current:current(),room:id?room(id):current(),rooms:publicRooms(),history:mine()})}
  function trip(p){const from=String(p.from||'').trim(),to=String(p.to||'').trim();if(!from||!to||from===to)throw Error('请填写不同的出发地和目的地');if(!Number.isFinite(p.departAt)||p.departAt<=clock()||p.departAt>clock()+7*86400000)throw Error('请选择未来七天内的出发时间');if(!Number.isInteger(p.capacity)||p.capacity<2||p.capacity>6)throw Error('请选择 2～6 人');return {from,to,departAt:p.departAt,capacity:p.capacity}}
  function action(a,p={}){advance();let r=p.id?room(p.id):current();
   if(a==='reset'){reset();return copy(state.user)}
   if(a==='login')return copy(state.user);
   if(a==='current')return copy(current());
   if(a==='mine')return copy(mine());
   if(a==='list')return copy(publicRooms());
   if(a==='profile'){const name=String(p.name||'').trim();if(!name||name.length>12)throw Error('昵称为 1～12 个字');state.user.name=name;if(p.avatar!==undefined)state.user.avatar=p.avatar;state.rooms.forEach(r=>{const me=r.members.find(m=>m.id===state.user.id);if(me)me.name=name;if(r.bill){const row=r.bill.items.find(m=>m.id===state.user.id);if(row)row.name=name}});save();return copy(state.user)}
   if(a==='create'||a==='start'||a==='plazaJoin'){if(current())throw Error('请先完成或取消当前拼车');const target=a==='plazaJoin'?r:null;if(a==='plazaJoin'&&(!target?.public||!active(target)||target.pendingJoin||target.members.length>=target.capacity))throw Error('这趟拼车已结束');const input=target?{from:target.from,to:target.to,departAt:Math.max(target.departAt,clock()+60000),capacity:target.capacity}:trip(p);r=make(input.from,input.to,input.departAt,[{...state.user,arrived:false}],input.capacity);if(target){r.pendingTargetId=target.id;target.pendingJoin=r.id;r.pendingMembers=copy(target.members);r.joinConfirmed=true;r.point=target.point;}state.rooms.push(r);state.currentId=r.id;job('match',r.id,2500);save();return copy(r)}
   if(!r||!r.members.some(m=>m.id===state.user.id))throw Error('这趟行程暂不可用');
   if(a==='get')return copy(r);
   if(a==='meeting'){if(r.owner!==state.user.id||!active(r))throw Error('仅发起人可在集合期间修改集合点');const point=String(p.point||'').trim();if(!point||point.length>60)throw Error('集合点为 1～60 个字');r.point=point;message(r,{id:'system',name:'拼车提醒'},'集合点已更新：'+point)}
   else if(a==='confirmMatch'){if(!r.offer||p.offerId!==r.offer.id)throw Error('匹配已更新，请刷新');r.offer.confirmed=[...new Set([...r.offer.confirmed,state.user.id])];merge(r)}
   else if(a==='declineMatch'){releaseTarget(r);r.offer=null;state.jobs=state.jobs.filter(j=>j.id!==r.id);job('match',r.id,2500)}
   else if(a==='edit'){if(!active(r)||r.members.length!==1)throw Error('已确认同行后不能单独改路线');const updated=trip(p);releaseTarget(r);Object.assign(r,updated);r.offer=null;state.jobs=state.jobs.filter(j=>j.id!==r.id);job('match',r.id,2500)}
   else if(a==='cancel'||a==='leave'){if(!active(r))throw Error('该行程已结束');releaseTarget(r);if(a==='cancel'&&r.owner!==state.user.id)throw Error('仅发起人可取消这趟拼车');if(a==='leave'&&r.owner===state.user.id)throw Error('发起人请取消拼车');if(a==='leave'){r.members=r.members.filter(m=>m.id!==state.user.id);delete r.locations[state.user.id];message(r,{id:'system',name:'拼车提醒'},state.user.name+' 已退出本次同行')}else{r.state='cancelled';r.locations={};r.offer=null}state.jobs=state.jobs.filter(j=>j.id!==r.id);state.currentId=null}
   else if(a==='message'){const text=String(p.text||'').trim();if(!text||text.length>500)throw Error('消息为 1～500 个字');if(!r.messages.some(m=>m.id===p.messageId)){message(r,state.user,text);r.messages[r.messages.length-1].id=p.messageId||uid();const response=/哪|位置|集合/.test(text)?'在上客区右边的路灯旁，地图上的绿色标记就是集合点。':/到|分钟/.test(text)?'收到，我在这里等你，不着急～':/钱|费|转/.test(text)?'好的，费用我们按人数平摊就可以。':'收到啦，我们到上客区见！';job('reply',r.id,1200,{text:response})}}
   else if(a==='arrive'){if(!active(r))throw Error('集合已结束');r.members.find(m=>m.id===state.user.id).arrived=true;if(r.members.length>1)job('arrive',r.id,2000)}
   else if(a==='location'){if(p.enabled===false)delete r.locations[state.user.id];else{if(!active(r)||p.enabled!==true)throw Error('请在集合中开启共享');location(r,state.user,1)}}
   else if(a==='bill'){if(r.state!=='completed'||r.bill)throw Error('结束行程后可创建一张分摊单');if(!Number.isSafeInteger(p.total)||p.total<1||p.total>999900)throw Error('请输入 0.01～9999.00 澳门元');r.bill=split(r,p.total,state.user.id);job('reported',r.id,2200)}
   else if(a==='reportPaid'){const row=r.bill?.items.find(m=>m.id===state.user.id);if(!row||r.bill.payer===state.user.id)throw Error('无需操作本人份额');if(row.status==='pending'){row.status='reported';job('received',r.id,1800)}}
   else if(a==='confirmPaid'){if(r.bill?.payer!==state.user.id)throw Error('只有垫付人可以确认到账');const row=r.bill.items.find(m=>m.id===p.member);if(!row)throw Error('成员不存在');row.status='received'}
   else throw Error('不支持的操作');r.messages=r.messages.slice(-100);save();return copy(room(r.id))
  }
  return {action,snapshot,reset};
 }
 return {createDemo};
});
