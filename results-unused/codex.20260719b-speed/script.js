(() => {
  'use strict';
  const CARD_BACK = 'images/cards-back/back.png';
  const cardPath = name => `images/cards-front/${encodeURIComponent(name)}.png`;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.random() * 1200;
  const lang = new URLSearchParams(location.search).get('lang') === 'id' ? 'id' : 'en';
  document.documentElement.lang = lang;
  const words = {
    en:{draw:'Draw Pile',hand:'Hand',reserve:'Reserve',play:'Play Pile',flip:'FLIP',flipReserve:'FLIP RESERVE',wins:p=>`${p} WINS`,drawGame:'DRAW'},
    id:{draw:'Tumpukan Ambil',hand:'Tangan',reserve:'Cadangan',play:'Tumpukan Main',flip:'BALIK',flipReserve:'AMBIL CADANGAN',wins:p=>`${p} MENANG`,drawGame:'SERI'}
  }[lang];

  const objects = [
    ['grape','fruit','purple'],['orange','fruit','orange'],['watermelon','fruit','green'],
    ['golf ball','sports','white'],['tennis ball','sports','green'],['basket ball','sports','orange'],
    ['house roof','building','red'],['tent','building','yellow'],['pyramid','building','brown'],
    ['cake slice','food','orange'],['pizza slice','food','yellow'],['jelly','food','purple'],
    ['handphone','gadget','black'],['tv','gadget','black'],['laptop','gadget','red'],
    ['swimming trunk','fashion','blue'],['cloth hanger','fashion','blue'],['hat','fashion','purple'],
    ['table','furniture','brown'],['cupboard','furniture','brown'],['bed','furniture','white'],
    ['paper airplane','toy','yellow'],['dice','toy','red'],['alphabet block','toy','green'],
    ['the triangle','music','white'],['drum','music','blue'],['piano','music','black']
  ];
  const allCards = objects.flatMap(([object,category,color]) => [1,2,3].map(quantity => ({name:`${quantity}-${object}`,category,color})));
  const shuffle = a => { for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };

  const els = Object.fromEntries(['p1-draw','p1-hand','p1-reserve','p1-play','p2-play','p2-reserve','p2-draw','p2-hand'].map(id=>[id,document.getElementById(id)]));
  const players = [
    {id:'p1', name:'P1', draw:[],hand:[],reserve:[],play:[], busy:false},
    {id:'p2', name:'P2', draw:[],hand:[],reserve:[],play:[], busy:false}
  ];
  const message = document.getElementById('message');
  let ended = false, actionVersion = 0, gameStarted = false;

  function img(card, face=true){ const el=document.createElement('img'); el.className='card'; el.draggable=false; el.src=face?cardPath(card.name):CARD_BACK; el.alt=face?card.name:'Card back'; return el; }
  function setLabels(){
    for(const p of players){
      els[`${p.id}-draw`].querySelector('.label').textContent=`${p.name} ${words.draw}`;
      els[`${p.id}-hand`].querySelector('.label').textContent=`${p.name} ${words.hand}`;
      els[`${p.id}-reserve`].querySelector('.label').textContent=`${p.name} ${words.reserve}`;
      els[`${p.id}-play`].querySelector('.label').textContent=`${p.name} ${words.play}`;
    }
  }
  function clearCards(el){ el.querySelectorAll('.card').forEach(x=>x.remove()); }
  function renderPlayer(p){
    const d=els[`${p.id}-draw`], h=els[`${p.id}-hand`], r=els[`${p.id}-reserve`], pl=els[`${p.id}-play`];
    [d,h,r,pl].forEach(clearCards);
    if(p.draw.length) d.append(img(p.draw.at(-1),false));
    p.hand.forEach((c,i)=>{const el=img(c);el.style.setProperty('--i',i);h.append(el)});
    if(p.reserve.length) r.append(img(p.reserve.at(-1),false));
    if(p.play.length) pl.append(img(p.play.at(-1),gameStarted));
    d.querySelector('.count').textContent=p.draw.length;
    r.querySelector('.count').textContent=p.reserve.length;
    pl.querySelector('.count').textContent=p.play.length;
  }
  function render(){players.forEach(renderPlayer)}
  async function announce(text, duration=2000){ message.textContent=text; message.classList.add('show'); await sleep(duration); message.classList.remove('show'); }
  const matches=(card,top)=>card.color===top.color||card.category===top.category;
  function moves(p){ return p.hand.flatMap((card,index)=>players.map((target,targetIndex)=>matches(card,target.play.at(-1))?{index,target,targetIndex}:null).filter(Boolean)); }

  async function fly(card, fromEl, toEl, fromIndex=0, face=true){
    const start=fromEl.getBoundingClientRect(), end=toEl.getBoundingClientRect();
    const el=img(card,face); el.classList.add('flying');
    el.style.left=`${start.left+(fromEl.classList.contains('hand')?fromIndex*34:0)}px`; el.style.top=`${start.top}px`; el.style.position='fixed';
    document.body.append(el); await new Promise(requestAnimationFrame);
    el.style.transform=`translate(${end.left-(start.left+(fromEl.classList.contains('hand')?fromIndex*34:0))}px,${end.top-start.top}px)`;
    await sleep(310); el.remove();
  }
  async function takeMove(p, move, version){
    p.busy=true; await sleep(randomDelay());
    if(ended||version!==actionVersion){p.busy=false;return}
    const current=moves(p).find(m=>m.index===move.index&&m.targetIndex===move.targetIndex);
    if(!current){p.busy=false;return}
    const card=p.hand[current.index];
    await fly(card,els[`${p.id}-hand`],els[`${current.target.id}-play`],current.index);
    p.hand.splice(current.index,1); current.target.play.push(card); render();
    if(p.draw.length){
      const drawn=p.draw.pop(); render();
      const source=els[`${p.id}-draw`];
      const temp=img(drawn);temp.classList.add('flip-in');source.append(temp);
      await fly(drawn,source,els[`${p.id}-hand`],0,true); temp.remove(); p.hand.push(drawn); render();
    }
    p.busy=false;
  }
  function winner(){ return players.find(p=>p.draw.length===0&&p.hand.length===0); }
  async function race(){
    while(!ended){
      const win=winner(); if(win){ended=true;await announce(words.wins(win.name),999999);return}
      const available=players.map(p=>moves(p));
      if(available.every(x=>x.length===0)&&players.every(p=>!p.busy)){
        actionVersion++; await sleep(2000);
        if(players.some(p=>p.reserve.length===0)){ended=true;await announce(words.drawGame,999999);return}
        await announce(words.flipReserve); await sleep(1000);
        for(const p of players)p.play.push(p.reserve.pop()); render(); continue;
      }
      for(let i=0;i<players.length;i++) if(!players[i].busy&&available[i].length){
        const choice=available[i][Math.floor(Math.random()*available[i].length)]; takeMove(players[i],choice,actionVersion);
      }
      await sleep(40);
    }
  }
  async function start(){
    setLabels();
    // The requested visible piles total 82 slots; duplicate one ordinary card to fill them without a wildcard.
    const deck=shuffle([...allCards,{...allCards[Math.floor(Math.random()*allCards.length)]}]);
    players[0].draw=deck.splice(0,34);players[1].draw=deck.splice(0,34);
    players[0].reserve=deck.splice(0,6);players[1].reserve=deck.splice(0,6);
    players[0].play=deck.splice(0,1);players[1].play=deck.splice(0,1);
    render();
    await sleep(2000);
    for(const p of players) p.hand.push(...p.draw.splice(-6));
    gameStarted=true;
    render();
    await announce(words.flip);
    await sleep(1000);
    race();
  }
  start();
})();
