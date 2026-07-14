/*
 * Configuration -------------------------------------------------------------
 * Add more entries to SIMULATIONS, then select one in the control above (or
 * change ACTIVE_SIMULATION). Pile arrays are top-first. Each move is
 * [cardName, sourcePile, targetPile]. DRAWPILE is accepted as an alias of DRAW.
 */
const ACTIVE_SIMULATION = 'S1';
const SIMULATIONS = {
  S1: {
    title: 'Opening deal',
    initialState: {
      DRAW: ['1-swimming trunk','wildcard+cut WC4','wildcard W9','3-pyramid','1-house roof','2-laptop','2-pizza slice','3-golf ball','3-tv','1-table','wildcard W5','wildcard W10','2-watermelon','1-pyramid','3-drum','1-tent','3-tennis ball','wildcard W3','wildcard W12','2-swimming trunk','2-golf ball','wildcard+cut WC2','1-watermelon','1-hat','1-piano','1-golf ball','3-paper airplane','3-watermelon','1-basket ball','2-tennis ball','3-jelly','2-bed','3-pizza slice','1-jelly','2-jelly','1-bed','3-tent','1-tv','2-cloth hanger','3-grape','3-dice','wildcard+cut WC1','wildcard W11','2-pyramid','1-orange','3-orange','3-basket ball','2-house roof','wildcard+cut WC5','wildcard+cut WC6','2-cupboard','2-handphone','3-cupboard','2-dice','2-piano','2-grape','1-the triangle','wildcard W7','3-piano','wildcard W2','1-pizza slice','wildcard W6','2-alphabet block','1-paper airplane','3-table','wildcard W4','wildcard+cut WC3','3-swimming trunk','2-cake slice','1-tennis ball','2-tent','wildcard W8','3-the triangle','3-cloth hanger','3-hat','2-hat','1-alphabet block','3-alphabet block','3-cake slice','1-laptop','1-grape','2-the triangle','2-orange','2-paper airplane','wildcard W1','1-dice','2-drum','1-drum','1-cake slice','3-handphone','2-basket ball','3-laptop','1-cloth hanger','2-table','3-bed','1-handphone','1-cupboard','2-tv','3-house roof'],
      P1: [], P2: [], DISCARD: []
    },
    turns: [
      { steps: [{ summary: 'Each player is dealt 9 cards', moves: [['1-swimming trunk','DRAW','P1'],['wildcard+cut WC4','DRAW','P2'],['wildcard W9','DRAW','P1'],['3-pyramid','DRAW','P2'],['1-house roof','DRAW','P1'],['2-laptop','DRAW','P2'],['2-pizza slice','DRAW','P1'],['3-golf ball','DRAW','P2'],['3-tv','DRAW','P1'],['1-table','DRAW','P2'],['wildcard W5','DRAW','P1'],['wildcard W10','DRAW','P2'],['2-watermelon','DRAW','P1'],['1-pyramid','DRAW','P2'],['3-drum','DRAW','P1'],['1-tent','DRAW','P2'],['3-tennis ball','DRAW','P1'],['wildcard W3','DRAW','P2']] }] },
      { steps: [
        { summary:'P1 discards', call:'medium', moves:[['2-pizza slice','P1','DISCARD'],['3-tv','P1','DISCARD'],['3-drum','P1','DISCARD'],['3-tennis ball','P1','DISCARD']] },
        { summary:'P1 draws', moves:[['wildcard W12','DRAW','P1'],['2-swimming trunk','DRAW','P1'],['2-golf ball','DRAW','P1']] },
        { summary:'P2 discards', call:'3', moves:[['3-golf ball','P2','DISCARD'],['wildcard W10','P2','DISCARD'],['3-pyramid','P2','DISCARD']] },
        { summary:'P2 draws', moves:[['wildcard+cut WC2','DRAW','P2'],['1-watermelon','DRAW','P2'],['1-hat','DRAW','P2']] }
      ] },
      { steps: [
        { summary:'P1 discards', call:'triangle', moves:[['2-swimming trunk','P1','DISCARD'],['1-house roof','P1','DISCARD'],['1-swimming trunk','P1','DISCARD']] },
        { summary:'P1 draws', moves:[['1-piano','DRAW','P1'],['1-golf ball','DRAW','P1'],['3-paper airplane','DRAW','P1']] },
        { summary:'P2 discards', call:'1', moves:[['1-swimming trunk','P2','DISCARD'],['1-table','P2','DISCARD'],['1-pyramid','P2','DISCARD'],['1-tent','P2','DISCARD'],['1-watermelon','P2','DISCARD'],['wildcard W3','P2','DISCARD'],['1-hat','P2','DISCARD']] },
        // The supplied prose says P2 draws; target is therefore P2 here.
        { summary:'P2 draws', moves:[['3-watermelon','DRAW','P2'],['1-basket ball','DRAW','P2'],['2-tennis ball','DRAW','P2']] }
      ] }
    ]
  }
};

const $ = selector => document.querySelector(selector);
const pileEls = { P1: $('#p1'), P2: $('#p2'), DISCARD: $('#discard') };
let state, runId = 0, selected = new Set(), incoming = new Set();
let serial = 0;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const canonicalPile = name => name === 'DRAWPILE' ? 'DRAW' : name;
const speed = () => Number($('#speed').value);
const scaled = seconds => seconds * 1000 * 5 / speed();
const asset = name => `cards-front/${encodeURIComponent(name)}.png`;

function initialise(simulation) {
  serial = 0;
  state = Object.fromEntries(Object.entries(simulation.initialState).map(([pile, cards]) => [pile, cards.map(name => ({ name, id: ++serial }))]));
  selected.clear(); incoming.clear(); $('#callout').classList.remove('show'); $('#animation-layer').replaceChildren(); render();
}
function render() {
  for (const [pile, element] of Object.entries(pileEls)) {
    element.replaceChildren();
    const cards = pile === 'DISCARD' && state[pile].length > 20 ? state[pile].slice(0, 20) : state[pile];
    // Arrays are top-first; render bottom-first so the topmost is at the right.
    const shown = [...cards].reverse();
    const cardWidth = Math.min(window.innerWidth * .21, 150);
    const free = Math.max(0, element.clientWidth - cardWidth);
    const gap = shown.length > 1 ? Math.min(33, free / (shown.length - 1)) : 0;
    shown.forEach((card, index) => {
      const node = document.createElement('div');
      node.className = `card${selected.has(card.id) ? ' selected' : ''}${incoming.has(card.id) ? ' incoming' : ''}`;
      node.dataset.id = card.id;
      node.style.left = `${index * gap}px`;
      node.style.zIndex = index + 1;
      node.innerHTML = `<img src="${asset(card.name)}" alt="${card.name}">`;
      element.append(node);
    });
  }
  $('#p1-count').textContent = `${state.P1.length} cards`;
  $('#p2-count').textContent = `${state.P2.length} cards`;
  $('#discard-count').textContent = `${state.DISCARD.length} cards${state.DISCARD.length > 20 ? ' · compressed' : ''}`;
}
function cardRect(id) { const el = document.querySelector(`.card[data-id="${id}"]`); return el && el.getBoundingClientRect(); }
function take(move) {
  const [name, sourceRaw] = move, source = canonicalPile(sourceRaw);
  const index = state[source].findIndex(card => card.name === name);
  if (index < 0) { console.warn(`Move skipped: ${name} was not found in ${source}.`, move); return null; }
  return state[source].splice(index, 1)[0];
}
function place(card, targetRaw) { state[canonicalPile(targetRaw)].unshift(card); }
function flying(card, from, to, duration) {
  if (!from || !to) return Promise.resolve();
  const layer = $('#animation-layer'), layerRect = layer.getBoundingClientRect();
  const node = document.createElement('div');
  node.className = 'flying-card'; node.innerHTML = `<img src="${asset(card.name)}" alt="">`;
  Object.assign(node.style, { left:`${from.left-layerRect.left}px`, top:`${from.top-layerRect.top}px`, width:`${from.width}px`, height:`${from.height}px` });
  layer.append(node);
  const dx = to.left - from.left, dy = to.top - from.top, ratio = to.width / from.width;
  const animation = node.animate([{ transform:'translate(0,0) scale(1)' }, { transform:`translate(${dx}px,${dy}px) scale(${ratio})` }], { duration, easing:'cubic-bezier(.23,.83,.33,1)', fill:'forwards' });
  return animation.finished.catch(() => {}).then(() => node.remove());
}
async function animateDraw(move, token) {
  const [name, sourceRaw, targetRaw] = move, source = canonicalPile(sourceRaw), target = canonicalPile(targetRaw);
  const card = take(move); if (!card || token !== runId) return;
  place(card, target); incoming.add(card.id); render();
  const destination = cardRect(card.id), drawRect = $('#draw-pile').getBoundingClientRect();
  await flying(card, drawRect, destination, scaled(1.5));
  incoming.delete(card.id); render();
}
async function animateDiscard(step, token) {
  const valid = step.moves.map(move => ({ move, card: state[canonicalPile(move[1])].find(c => c.name === move[0]) })).filter(x => x.card);
  valid.forEach(({card}) => selected.add(card.id)); render();
  $('#callout').textContent = step.call; $('#callout').classList.add('show');
  await sleep(scaled(3)); if (token !== runId) return;
  $('#callout').classList.remove('show');
  const actions = valid.map(({move, card}) => ({ move, card, from: cardRect(card.id), target: canonicalPile(move[2]) }));
  actions.forEach(({move, card, target}) => { take(move); place(card, target); incoming.add(card.id); });
  selected.clear(); render();
  await Promise.all(actions.map(({card, from}) => flying(card, from, cardRect(card.id), scaled(1.5))));
  actions.forEach(({card}) => incoming.delete(card.id)); render();
}
async function play() {
  const token = ++runId, key = $('#simulation').value, simulation = SIMULATIONS[key];
  initialise(simulation); $('#status').textContent = 'Starting in 3.5 seconds…';
  await sleep(3500); if (token !== runId) return;
  for (let t = 0; t < simulation.turns.length; t++) {
    for (const step of simulation.turns[t].steps) {
      if (token !== runId) return;
      $('#status').textContent = `Turn ${t + 1} · ${step.summary}`;
      if (step.call && step.moves.some(move => canonicalPile(move[2]) === 'DISCARD')) await animateDiscard(step, token);
      else for (const move of step.moves) await animateDraw(move, token);
    }
    if (t < simulation.turns.length - 1) { $('#status').textContent = `Turn ${t + 1} complete`; await sleep(scaled(2)); }
  }
  $('#status').textContent = 'Simulation complete';
}

Object.keys(SIMULATIONS).forEach(key => $('#simulation').add(new Option(key, key, false, key === ACTIVE_SIMULATION)));
$('#speed').addEventListener('input', event => $('#speed-value').textContent = event.target.value);
$('#replay').addEventListener('click', play);
$('#simulation').addEventListener('change', play);
window.addEventListener('resize', render);
play();
