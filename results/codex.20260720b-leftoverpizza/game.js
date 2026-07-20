(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const lang = params.get('lang') === 'id' ? 'id' : 'en';
  document.documentElement.lang = lang;
  const copy = lang === 'id'
    ? { ready:'BERSIAP!', matching:'MEMBUANG PASANGAN', turn:'GILIRAN', cards:'KARTU', discard:'BUANGAN', over:'PERMAINAN SELESAI', wins:'MENANG', instruction:'HINDARI MENDAPAT PIZZA SISA' }
    : { ready:'GET READY!', matching:'DISCARDING PAIRS', turn:"'S TURN", cards:'CARDS', discard:'DISCARD', over:'GAME OVER', wins:'WINS', instruction:'AVOID GETTING THE LEFTOVER PIZZA' };
  if(lang === 'id') { $('.brand-en').textContent='PIZZA'; $('.brand strong').textContent='SISA'; }
  $('#game-instruction').textContent=copy.instruction;

  const objects = [
    ['grape','anggur','🍇'],['orange','jeruk','🍊'],['watermelon','semangka','🍉'],
    ['golf ball','bola golf','⛳'],['tennis ball','bola tenis','🎾'],['basket ball','bola basket','🏀'],
    ['house roof','atap rumah','🏠'],['tent','tenda','⛺'],['pyramid','piramid','🔺'],
    ['cake slice','sepotong kue','🍰'],['pizza slice','sepotong pizza','🍕'],['jelly','jeli','🍮'],
    ['handphone','ponsel','📱'],['tv','tv','📺'],['laptop','laptop','💻'],
    ['swimming trunk','celana renang','🩳'],['cloth hanger','gantungan baju','👚'],['hat','topi','👒'],
    ['table','meja','🪑'],['cupboard','lemari','🗄️'],['bed','ranjang','🛏️'],
    ['paper airplane','pesawat kertas','✈️'],['dice','dadu','🎲'],['alphabet block','balok huruf','🧱'],
    ['the triangle','trikona','△'],['drum','drum','🥁'],['piano','piano','🎹']
  ];
  let uid = 0;
  const deck = objects.flatMap((o, pair) => [1,2].map(q => ({ uid:uid++, pair, q, en:o[0], id:o[1], icon:o[2] })))
    .filter(c => !(c.pair === 10 && c.q === 2));
  const shuffle = a => { for(let i=a.length-1;i;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
  shuffle(deck);
  const players = [{hand:deck.slice(0,27), el:$('#p1-hand'), label:$('#p1-label')},{hand:deck.slice(27), el:$('#p2-hand'), label:$('#p2-label')}];
  const discarded = [];
  const sleep = ms => new Promise(r => setTimeout(r,ms));
  function $(s){ return document.querySelector(s); }
  function cardEl(c){
    const el=document.createElement('div'); el.className='card'; el.dataset.uid=c.uid; el.dataset.icon=c.icon; el.dataset.label=`${c.q} ${c[lang]}`;
    const img=document.createElement('img'); img.src=`images/cards-front/${c.q}-${c.en}.png`; img.alt=`${c.q} ${c[lang]}`;
    img.addEventListener('error',()=>{ img.remove(); el.classList.add('fallback'); }); el.append(img); return el;
  }
  function renderHand(p){
    const keep=new Map([...p.el.children].map(e=>[+e.dataset.uid,e])); p.el.innerHTML='';
    const n=p.hand.length, cardWidth=115;
    const step=n<2?0:(p.el.clientWidth-cardWidth)/(n-1);
    const start=n===1?(p.el.clientWidth-cardWidth)/2:0;
    p.hand.forEach((c,i)=>{ const el=keep.get(c.uid)||cardEl(c); el.classList.remove('hidden-source'); el.style.left=`${start+i*step}px`; el.style.top=`${Math.abs(i-(n-1)/2)*.35}px`; el.style.zIndex=i+1; el.style.transform=`rotate(${(i-(n-1)/2)*.18}deg)`; p.el.append(el); });
    const pi=players.indexOf(p)+1; $(`#p${pi}-count`).textContent=`${n} ${copy.cards}`;
  }
  function renderAll(){ players.forEach(renderHand); $('#discard-count').textContent=`${discarded.length} ${copy.cards}`; }
  function rectInGame(el){ const a=el.getBoundingClientRect(),g=$('#game').getBoundingClientRect(),scale=g.width/720; return {left:(a.left-g.left)/scale,top:(a.top-g.top)/scale}; }
  async function flyCards(p,cards, destination='discard'){
    const sources=cards.map(c=>p.el.querySelector(`[data-uid="${c.uid}"]`));
    const clones=sources.map((src,i)=>{ const r=rectInGame(src),cl=src.cloneNode(true); cl.classList.add('flying'); cl.style.left=`${r.left}px`; cl.style.top=`${r.top}px`; cl.style.zIndex=60+i; cl.style.setProperty('--spread-x',`${(i-(cards.length-1)/2)*65}px`); cl.style.setProperty('--rot',`${i?'5deg':'-5deg'}`); $('#fx-layer').append(cl); src.classList.add('hidden-source'); return cl; });
    await sleep(30); clones.forEach(c=>c.classList.add('highlight')); await sleep(500);
    const dest = destination==='discard' ? rectInGame($('#discard')) : rectInGame(destination.el);
    clones.forEach((cl,i)=>{ cl.style.transition='left .5s ease-in-out, top .5s ease-in-out, transform .5s ease-in-out, filter .25s'; cl.style.left=`${dest.left+(destination==='discard'?0:Math.min(480,destination.hand.length*14))}px`; cl.style.top=`${dest.top+(destination==='discard'?0:78)}px`; cl.style.transform=`scale(.9) rotate(${i*3-2}deg)`; cl.style.filter='none'; });
    await sleep(520); clones.forEach(c=>c.remove());
  }
  function addDiscard(cards){ discarded.push(...cards); const pile=$('#discard'); pile.innerHTML=''; const top=cardEl(discarded.at(-1)); top.style.setProperty('--tilt',`${(discarded.length%5-2)*2}deg`); pile.append(top); $('#discard-count').textContent=`${discarded.length} ${copy.cards}`; }
  function findPair(hand){ const seen=new Map(); for(const c of hand){ if(seen.has(c.pair)) return [seen.get(c.pair),c]; seen.set(c.pair,c); } return null; }
  async function discardPair(p,pair){ await flyCards(p,pair); p.hand=p.hand.filter(c=>!pair.includes(c)); addDiscard(pair); renderHand(p); await sleep(150); }
  async function clearPairs(p){ let pair; while((pair=findPair(p.hand))) await discardPair(p,pair); }
  async function takeTurn(i){
    const p=players[i], other=players[1-i]; if(!other.hand.length) return;
    p.label.classList.add('active'); $('#status').textContent=lang==='id'?`GILIRAN P${i+1}`:`P${i+1}${copy.turn}`;
    const drawn=other.hand[Math.floor(Math.random()*other.hand.length)]; await flyCards(other,[drawn],p);
    other.hand=other.hand.filter(c=>c!==drawn); p.hand.push(drawn); renderAll(); await sleep(500);
    const mate=p.hand.find(c=>c.pair===drawn.pair&&c!==drawn); if(mate) await discardPair(p,[mate,drawn]);
    p.label.classList.remove('active'); await sleep(1000);
  }
  async function run(){
    $('#discard-title').textContent=copy.discard; $('#result-small').textContent=copy.over; $('#status').textContent=copy.ready; renderAll(); await sleep(2000);
    $('#status').textContent=copy.matching;
    await clearPairs(players[0]); await clearPairs(players[1]); await sleep(2000);
    let turn=0, guard=0;
    while(players[0].hand.length+players[1].hand.length>1 && guard++<200){
      if(!players[1-turn].hand.length){ await clearPairs(players[turn]); turn=1-turn; continue; }
      await takeTurn(turn); turn=1-turn;
    }
    const loser=players[0].hand.length?0:1, winner=1-loser;
    $('#status').textContent=''; $('#result strong').textContent=`P${winner+1} ${copy.wins}`; $('#result').classList.add('show');
  }
  $('.logo').addEventListener('error',e=>e.currentTarget.classList.add('broken'));
  run();
})();
