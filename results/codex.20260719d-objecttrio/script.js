(function () {
  'use strict';

  const CARD_W = 165, CARD_H = 231, STEP = 43;
  const params = new URLSearchParams(location.search);
  const lang = params.get('lang') === 'id' ? 'id' : 'en';
  const speed = Math.max(.2, Number(params.get('speed')) || 1);
  const copy = {
    en: { gameName:'OBJECT TRIO', gameInstruction:'COLLECT 3 CARDS OF THE SAME OBJECT', hand:'HAND', drawPile:'DRAW PILE', discardPile:'DISCARD', ready:'GET READY', turn:'TURN', thinking:'THINKING…', wins:'WINS!', draw:'DRAW', collecting:'COLLECTING', or:'OR' },
    id: { gameName:'TRIO OBJEK', gameInstruction:'KUMPULKAN 3 KARTU OBJEK SAMA', hand:'KARTU', drawPile:'TUMPUKAN', discardPile:'BUANGAN', ready:'BERSIAP', turn:'GILIRAN', thinking:'BERPIKIR…', wins:'MENANG!', draw:'SERI', collecting:'MENGOLEKSI', or:'ATAU' }
  }[lang];
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = copy[el.dataset.i18n]);

  const definitions = [
    ['grape','anggur','fruit','buah','round','bundar','purple','ungu','small','kecil','🍇','#7551a7'],
    ['orange','jeruk','fruit','buah','round','bundar','orange','oranye','medium','sedang','🍊','#ef8128'],
    ['watermelon','semangka','fruit','buah','round','bundar','green','hijau','large','besar','🍉','#4d9f58'],
    ['golf ball','bola golf','sports','olahraga','round','bundar','white','putih','small','kecil','⚪','#56865a'],
    ['tennis ball','bola tenis','sports','olahraga','round','bundar','green','hijau','medium','sedang','🎾','#92b83e'],
    ['basket ball','bola basket','sports','olahraga','round','bundar','orange','oranye','large','besar','🏀','#d16a29'],
    ['house roof','atap rumah','building','bangunan','triangle','segitiga','red','merah','large','besar','🏠','#c84d42'],
    ['tent','tenda','building','bangunan','triangle','segitiga','yellow','kuning','large','besar','⛺','#d4a82e'],
    ['pyramid','piramid','building','bangunan','triangle','segitiga','brown','cokelat','large','besar','🔺','#aa764a'],
    ['cake slice','sepotong kue','food','makanan','triangle','segitiga','orange','oranye','small','kecil','🍰','#e48550'],
    ['pizza slice','sepotong pizza','food','makanan','triangle','segitiga','yellow','kuning','medium','sedang','🍕','#e3b42e'],
    ['jelly','jeli','food','makanan','round','bundar','purple','ungu','small','kecil','🟣','#844da4'],
    ['handphone','ponsel','gadget','gawai','rectangle','kotak','black','hitam','small','kecil','📱','#384152'],
    ['tv','tv','gadget','gawai','rectangle','kotak','black','hitam','medium','sedang','📺','#384152'],
    ['laptop','laptop','gadget','gawai','rectangle','kotak','red','merah','medium','sedang','💻','#c54a48'],
    ['swimming trunk','celana renang','fashion','fesyen','triangle','segitiga','blue','biru','small','kecil','🩳','#347bb2'],
    ['cloth hanger','gantungan baju','fashion','fesyen','triangle','segitiga','blue','biru','large','besar','🔷','#347bb2'],
    ['hat','topi','fashion','fesyen','round','bundar','purple','ungu','medium','sedang','👒','#7d5599'],
    ['table','meja','furniture','mebel','rectangle','kotak','brown','cokelat','medium','sedang','🪑','#8f6548'],
    ['cupboard','lemari','furniture','mebel','rectangle','kotak','brown','cokelat','large','besar','🚪','#8f6548'],
    ['bed','ranjang','furniture','mebel','rectangle','kotak','white','putih','large','besar','🛏️','#7793a8'],
    ['paper airplane','pesawat kertas','toy','mainan','triangle','segitiga','yellow','kuning','small','kecil','✈️','#d2a730'],
    ['dice','dadu','toy','mainan','rectangle','kotak','red','merah','small','kecil','🎲','#cf4b49'],
    ['alphabet block','balok huruf','toy','mainan','rectangle','kotak','green','hijau','small','kecil','🧊','#398c64'],
    ['the triangle','trikona','music','musik','triangle','segitiga','white','putih','medium','sedang','△','#6f8d9c'],
    ['drum','drum','music','musik','round','bundar','blue','biru','medium','sedang','🥁','#377cad'],
    ['piano','piano','music','musik','rectangle','kotak','black','hitam','large','besar','🎹','#333846']
  ];

  let generation = 0;
  const $ = s => document.querySelector(s);
  const wait = ms => new Promise(r => setTimeout(r, ms * speed));
  const deckEl = $('#draw-pile'), discardEl = $('#discard-pile');
  const hands = [$('#p1-hand'), $('#p2-hand')];
  let deck, playerHands, discard, goal;

  function resize() {
    const scale = Math.min(innerWidth / 720, innerHeight / 1080);
    document.documentElement.style.setProperty('--game-scale', scale);
  }
  addEventListener('resize', resize); resize();
  $('.logo').addEventListener('error', e => e.currentTarget.dataset.broken = '1');

  function allCards() {
    return definitions.flatMap((d, objectIndex) => [1,2,3].map(qty => ({
      qty, objectIndex, en:d[0], id:d[1], category:lang==='id'?d[3]:d[2],
      shape:lang==='id'?d[5]:d[4], color:lang==='id'?d[7]:d[6],
      size:lang==='id'?d[9]:d[8], icon:d[10], accent:d[11], file:`${qty}-${d[0]}.png`
    })));
  }
  function shuffle(a) { for(let i=a.length-1;i;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
  function imagePath(card) { return `images/cards-front/${card.file}`; }
  function warmImageCache(cards) {
    cards.forEach(card => { const img=new Image(); img.decoding='async'; img.src=imagePath(card); });
  }

  function cardNode(card, back=false) {
    const el = document.createElement('div');
    el.className = `card ${back?'card-back':'card-face'} qty-${card?.qty||0}`;
    if (!back) {
      el.style.setProperty('--accent', card.accent);
      el.innerHTML = `<div class="fallback-art"><div class="card-title">${card.qty} · ${lang==='id'?card.id:card.en}</div><div class="objects">${Array(card.qty).fill(`<span class="object-icon">${card.icon}</span>`).join('')}</div><div class="attributes">${card.category} · ${card.shape}<br>${card.color} · ${card.size}</div></div>`;
      const img = new Image(); img.className = 'real-card'; img.alt = `${card.qty} ${lang==='id'?card.id:card.en}`;
      img.onload = () => el.append(img); img.src = imagePath(card);
    } else {
      const img = new Image(); img.className='real-card'; img.alt='';
      img.onload=()=>el.append(img); img.src='images/cards-back/back.png';
    }
    el.cardData = card;
    return el;
  }

  function rect(el) { const r=el.getBoundingClientRect(), g=$('#game').getBoundingClientRect(), s=g.width/720; return {left:(r.left-g.left)/s,top:(r.top-g.top)/s}; }
  function layoutHand(p) { [...hands[p].children].forEach((c,i)=>c.style.setProperty('--i',i)); }
  function renderDeck() {
    deckEl.innerHTML='';
    const layers=Math.min(5, Math.max(0,Math.ceil(deck.length/15)));
    for(let i=0;i<layers;i++){ const c=cardNode(null,true); c.style.transform=`translate(${i*1.5}px,${-i*2}px)`; deckEl.append(c); }
    $('#deck-count').textContent=deck.length;
  }
  function renderDiscard() { discardEl.innerHTML=''; if(discard.length) discardEl.append(cardNode(discard.at(-1))); }

  async function fly(card, fromEl, toEl, duration, back=false) {
    const moving=cardNode(card,back); moving.classList.add('discarding'); $('#game').append(moving);
    const a=rect(fromEl), b=rect(toEl);
    moving.style.left='0'; moving.style.top='0';
    const dx=b.left-a.left, dy=b.top-a.top;
    const arc=Math.min(42,Math.max(18,Math.abs(dx)*.08));
    const animation=moving.animate([
      { transform:`translate3d(${a.left}px,${a.top}px,0) scale(.96) rotate(-2deg)`, offset:0 },
      { transform:`translate3d(${a.left+dx*.48}px,${a.top+dy*.48-arc}px,0) scale(1.035) rotate(${dx>0?2:-2}deg)`, offset:.48 },
      { transform:`translate3d(${b.left}px,${b.top}px,0) scale(1) rotate(0deg)`, offset:1 }
    ], { duration:duration*speed, easing:'cubic-bezier(.35,.02,.18,1)', fill:'forwards' });
    try { await animation.finished; } catch (_) {}
    // Keep the flying card painted at its destination. The caller inserts the
    // permanent card underneath it and removes this clone in the same task,
    // avoiding a blank frame at the end of the animation.
    return moving;
  }

  function settleAnimation(el) {
    el.getAnimations().forEach(animation => animation.cancel());
    el.classList.remove('discarding');
    el.style.left=''; el.style.top=''; el.style.transform='';
  }
  function addToHand(p, card, el=cardNode(card)) {
    settleAnimation(el); playerHands[p].push(card); hands[p].append(el); layoutHand(p);
  }
  function removeFromHand(p, index) { playerHands[p].splice(index,1); hands[p].children[index].remove(); layoutHand(p); }
  function setTurn(p, text='') {
    [0,1].forEach(i => $(`#p${i+1}-label`).classList.toggle('active',i===p));
    $('#turn-indicator').textContent = text || (p >= 0 ? `P${p+1} ${copy.turn}` : '');
  }
  function chooseGoals(hand, current=[]) {
    const counts=new Map(); hand.forEach(c=>counts.set(c.objectIndex,(counts.get(c.objectIndex)||0)+1));
    const bestCount=Math.max(...counts.values());
    const ranked=[...counts].sort((a,b)=>b[1]-a[1]);
    const best=ranked.filter(([,count])=>count===bestCount).map(([object])=>object);
    // Preserve equally strong existing plans so the label does not jump.
    const ordered=[...current.filter(object=>best.includes(object)),...best.filter(object=>!current.includes(object))];
    // Pursue two routes when both are equally promising. With four unrelated
    // singles, two are selected as opening plans; a later pair creates one
    // clearly faster route and naturally narrows the strategy again.
    return ordered.slice(0,best.length>1 ? 2 : 1);
  }
  function showGoal(p) {
    const names=goal[p].map(objectIndex => {
      const definition=definitions[objectIndex];
      return lang==='id'?definition[1]:definition[0];
    });
    $(`#p${p+1}-collecting`).textContent=`${copy.collecting} ${names.join(` ${copy.or} `)}`.toUpperCase();
  }
  function reconsiderGoal(p) {
    const next=chooseGoals(playerHands[p],goal[p]);
    if(next.join(',')!==goal[p].join(',')) { goal[p]=next; showGoal(p); }
  }
  function discardChoice(p) {
    const hand=playerHands[p]; let candidates=hand.map((c,i)=>({c,i})).filter(x=>!goal[p].includes(x.c.objectIndex));
    if(!candidates.length) candidates=hand.map((c,i)=>({c,i}));
    const frequency = oi => hand.filter(c=>c.objectIndex===oi).length;
    candidates.sort((a,b)=>frequency(a.c.objectIndex)-frequency(b.c.objectIndex));
    return candidates[0].i;
  }
  function isWinner(p){ const count={}; playerHands[p].forEach(c=>count[c.objectIndex]=(count[c.objectIndex]||0)+1); return Object.values(count).some(n=>n===3); }

  function prepareDeck() {
    return shuffle(allCards());
  }

  async function dealCard(p, token) {
    if(token!==generation) return;
    const card=deck.pop(); renderDeck();
    const slot=document.createElement('div'); slot.className='card slot'; slot.style.setProperty('--i',playerHands[p].length); hands[p].append(slot); layoutHand(p);
    const moving=await fly(card,deckEl,slot,800);
    slot.remove(); addToHand(p,card,moving);
  }

  async function takeTurn(p, token) {
    if(token!==generation || !deck.length) return false;
    reconsiderGoal(p);
    setTurn(p);
    let card, source=deckEl;
    const topDiscard=discard.at(-1);
    const currentCount=Math.max(...goal[p].map(object=>playerHands[p].filter(c=>c.objectIndex===object).length));
    const discardCount=topDiscard ? playerHands[p].filter(c=>c.objectIndex===topDiscard.objectIndex).length : 0;
    const usefulDiscard=topDiscard && discardCount>0 &&
      !playerHands[p].some(c=>c.objectIndex===topDiscard.objectIndex&&c.qty===topDiscard.qty) &&
      discardCount+1>=currentCount;
    // A discard that creates the strongest pair is worth changing plans for.
    if(usefulDiscard && !goal[p].includes(topDiscard.objectIndex)) {
      goal[p]=[topDiscard.objectIndex,...goal[p]].slice(0,2); showGoal(p);
    }
    if(usefulDiscard){card=discard.pop(); renderDiscard(); source=discardEl;} else {card=deck.pop();renderDeck();}
    const slot=document.createElement('div'); slot.className='card slot'; slot.style.setProperty('--i',playerHands[p].length); hands[p].append(slot); layoutHand(p);
    const moving=await fly(card,source,slot,1000);
    slot.remove(); addToHand(p,card,moving);
    reconsiderGoal(p);
    if(isWinner(p)) return true;
    $('#turn-indicator').textContent=copy.thinking; await wait(1300);
    const index=discardChoice(p), out=playerHands[p][index], sourceCard=hands[p].children[index];
    sourceCard.style.visibility='hidden';
    const discardedMoving=await fly(out,sourceCard,discardEl,1000);
    removeFromHand(p,index); discard.push(out);
    discardEl.innerHTML=''; settleAnimation(discardedMoving); discardEl.append(discardedMoving);
    setTurn(-1,''); await wait(1000); return false;
  }

  async function run() {
    const token=++generation;
    deck=prepareDeck(); warmImageCache(deck); playerHands=[[],[]]; discard=[]; goal=[[],[]];
    hands.forEach(h=>h.innerHTML=''); renderDiscard(); renderDeck(); setTurn(-1,'');
    $('#p1-collecting').textContent=''; $('#p2-collecting').textContent='';
    const start=$('#start-card'), announcement=$('#announcement');
    announcement.classList.remove('show'); announcement.textContent=''; start.classList.remove('hide');
    await wait(2000); if(token!==generation)return; start.classList.add('hide'); await wait(350);
    for(let i=0;i<4;i++) for(let p=0;p<2;p++) await dealCard(p,token);
    goal=[chooseGoals(playerHands[0]),chooseGoals(playerHands[1])];
    showGoal(0); showGoal(1);
    await wait(700);
    let winner=-1, p=0;
    while(token===generation && deck.length && winner<0){if(await takeTurn(p,token))winner=p;else p=1-p;}
    if(token!==generation)return;
    setTurn(winner, winner < 0 ? copy.draw : '');
    announcement.textContent=winner<0?copy.draw:`P${winner+1} ${copy.wins}`;
    announcement.classList.add('show');
  }

  $('#replay').addEventListener('click',run);
  run();
})();
