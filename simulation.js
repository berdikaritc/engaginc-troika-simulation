/*
 * CONFIGURATION
 * Add more simulations to SIMULATIONS, then change ACTIVE_SIMULATION and SPEED (1–9).
 * A move is [cardName, sourcePile, targetPile]. The first card in each pile is its top.
 */
const ACTIVE_SIMULATION = 'S1';
const SPEED = 5; // 1 = very slow, 9 = very fast

const S1_DRAW = [
  '1-swimming trunk','wildcard+cut WC4','wildcard W9','3-pyramid','1-house roof','2-laptop','2-pizza slice','3-golf ball','3-tv','1-table','wildcard W5','wildcard W10','2-watermelon','1-pyramid','3-drum','1-tent','3-tennis ball','wildcard W3','wildcard W12','2-swimming trunk','2-golf ball','wildcard+cut WC2','1-watermelon','1-hat','1-piano','1-golf ball','3-paper airplane','3-watermelon','1-basket ball','2-tennis ball','3-jelly','2-bed','3-pizza slice','1-jelly','2-jelly','1-bed','3-tent','1-tv','2-cloth hanger','3-grape','3-dice','wildcard+cut WC1','wildcard W11','2-pyramid','1-orange','3-orange','3-basket ball','2-house roof','wildcard+cut WC5','wildcard+cut WC6','2-cupboard','2-handphone','3-cupboard','2-dice','2-piano','2-grape','1-the triangle','wildcard W7','3-piano','wildcard W2','1-pizza slice','wildcard W6','2-alphabet block','1-paper airplane','3-table','wildcard W4','wildcard+cut WC3','3-swimming trunk','2-cake slice','1-tennis ball','2-tent','wildcard W8','3-the triangle','3-cloth hanger','3-hat','2-hat','1-alphabet block','3-alphabet block','3-cake slice','1-laptop','1-grape','2-the triangle','2-orange','2-paper airplane','wildcard W1','1-dice','2-drum','1-drum','1-cake slice','3-handphone','2-basket ball','3-laptop','1-cloth hanger','2-table','3-bed','1-handphone','1-cupboard','2-tv','3-house roof'
];

const SIMULATIONS = {
  S1: {
    initialState: { DRAW: S1_DRAW, P1: [], P2: [], DISCARD: [] },
    turns: [
      { steps: [{ summary: 'Each player is dealt 9 cards', moves: [
        ['3-tennis ball','DRAW','P1'],['wildcard W3','DRAW','P2'],['3-drum','DRAW','P1'],['1-tent','DRAW','P2'],['2-watermelon','DRAW','P1'],['1-pyramid','DRAW','P2'],['wildcard W5','DRAW','P1'],['wildcard W10','DRAW','P2'],['3-tv','DRAW','P1'],['1-table','DRAW','P2'],['2-pizza slice','DRAW','P1'],['3-golf ball','DRAW','P2'],['1-house roof','DRAW','P1'],['2-laptop','DRAW','P2'],['wildcard W9','DRAW','P1'],['3-pyramid','DRAW','P2'],['1-swimming trunk','DRAW','P1'],['wildcard+cut WC4','DRAW','P2']
      ]}] },
      { steps: [
        { summary: 'P1 discards', call: 'medium', moves: [['2-pizza slice','P1','DISCARD'],['3-tv','P1','DISCARD'],['3-drum','P1','DISCARD'],['3-tennis ball','P1','DISCARD']] },
        { summary: 'P1 draws', moves: [['wildcard W12','DRAW','P1'],['2-swimming trunk','DRAW','P1'],['2-golf ball','DRAW','P1']] },
        { summary: 'P2 discards', call: '3', moves: [['3-golf ball','P2','DISCARD'],['wildcard W10','P2','DISCARD'],['3-pyramid','P2','DISCARD']] },
        { summary: 'P2 draws', moves: [['wildcard+cut WC2','DRAW','P2'],['1-watermelon','DRAW','P2'],['1-hat','DRAW','P2']] }
      ] }
    ]
  }
};

const state = {};
const $ = (selector) => document.querySelector(selector);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const speedFactor = () => 2.05 - Math.max(1, Math.min(9, SPEED)) * .15;
const duration = () => Math.round(590 * speedFactor());

function normalizePile(name) { return name === 'DRAWPILE' ? 'DRAW' : name; }
function cardPath(name) {
  // Two supplied cloth-hanger files have an extra .png in their filename.
  return `cards-front/${name.includes('cloth hanger') ? `${name}.png` : name}.png`;
}
function makeCard(name, id) {
  const img = document.createElement('img');
  img.className = 'card'; img.src = cardPath(name); img.alt = name; img.dataset.card = name; img.dataset.id = id;
  return img;
}
function handLayout(el, cards, pile) {
  const width = el.clientWidth, count = cards.length;
  const spacing = count < 2 ? 0 : Math.min((width - parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-w'))) / (count - 1), 66);
  const spread = Math.min(34, count * 2.5);
  cards.forEach((entry, i) => {
    const item = makeCard(entry.name, entry.id);
    const ratio = count < 2 ? 0 : i / (count - 1) - .5;
    item.style.left = `calc(50% + ${ratio * (count - 1) * spacing}px)`;
    item.style.marginLeft = 'calc(var(--card-w) / -2)';
    item.style.top = `${Math.abs(ratio) * 28}px`;
    item.style.transform = `rotate(${ratio * spread}deg)`;
    item.style.zIndex = String(i + 1);
    el.append(item);
  });
}
function discardLayout(el, cards) {
  cards.slice(0, 8).reverse().forEach((entry, reverseIndex) => {
    const i = Math.min(cards.length - 1 - reverseIndex, 7);
    const item = makeCard(entry.name, entry.id);
    item.style.transform = `translateX(-50%) translate(${(i - 3.5) * 4}px, ${Math.abs(i - 3.5) * 1.5}px) rotate(${(i - 3.5) * 2.4}deg)`;
    item.style.zIndex = String(i + 1); el.append(item);
  });
}
function render() {
  const p1 = $('#p1-pile'), p2 = $('#p2-pile'), discard = $('#discard-pile');
  p1.replaceChildren(); p2.replaceChildren(); discard.replaceChildren();
  handLayout(p1, state.P1, 'P1'); handLayout(p2, state.P2, 'P2'); discardLayout(discard, state.DISCARD);
}
function getCardElement(entry) { return document.querySelector(`.card[data-id="${entry.id}"]`); }
function rectForPile(pile, entry) {
  if (pile === 'DRAW') return $('#draw-origin').getBoundingClientRect();
  return getCardElement(entry)?.getBoundingClientRect();
}
function addFlyingCard(entry, start) {
  const clone = makeCard(entry.name, entry.id); clone.classList.add('flying-card');
  clone.style.left = `${start.left}px`; clone.style.top = `${start.top}px`;
  clone.style.width = `${start.width}px`; clone.style.height = `${start.height}px`; clone.style.transform = 'none';
  $('#move-layer').append(clone); return clone;
}
async function fly(entry, start, end) {
  const flyer = addFlyingCard(entry, start);
  await new Promise(requestAnimationFrame);
  flyer.style.transitionDuration = `${duration()}ms`;
  flyer.style.transform = `translate(${end.left - start.left}px, ${end.top - start.top}px) scale(${end.width / start.width}, ${end.height / start.height})`;
  await sleep(duration() + 35); flyer.remove();
}
function moveFromState(rawMove) {
  const [name, rawSource, rawTarget] = rawMove; const source = normalizePile(rawSource), target = normalizePile(rawTarget);
  const index = state[source].findIndex(card => card.name === name);
  if (index === -1) throw new Error(`Cannot move “${name}”: not found in ${source}.`);
  const [entry] = state[source].splice(index, 1); state[target].unshift(entry);
  return { entry, source, target };
}
function setInfo(turn, step, summary) { $('#turn-info').textContent = `TURN ${turn} · ${summary || `STEP ${step}`}`; }
async function showCall(call) { const banner = $('#call-banner'); banner.textContent = call; banner.classList.add('show'); await sleep(2000); banner.classList.remove('show'); await sleep(230); }
async function runDrawStep(moves) {
  for (const move of moves) {
    const source = normalizePile(move[1]); const start = source === 'DRAW' ? rectForPile('DRAW') : rectForPile(source, state[source].find(x => x.name === move[0]));
    const result = moveFromState(move); render(); const end = rectForPile(result.target, result.entry);
    await fly(result.entry, start, end); await sleep(Math.round(120 * speedFactor()));
  }
}
async function runDiscardStep(moves, call) {
  const entries = moves.map(([name, source]) => ({ name, source: normalizePile(source), entry: state[normalizePile(source)].find(x => x.name === name) }));
  entries.forEach(({ entry }) => getCardElement(entry)?.classList.add('highlight'));
  await sleep(650); await showCall(call);
  const starts = entries.map(({ entry, source }) => rectForPile(source, entry));
  const results = moves.map(moveFromState); render();
  await Promise.all(results.map((result, i) => fly(result.entry, starts[i], rectForPile(result.target, result.entry))));
}
async function runSimulation(simulation) {
  Object.assign(state, Object.fromEntries(Object.entries(simulation.initialState).map(([pile, cards]) => [pile, cards.map((name, i) => ({ name, id: `${pile}-${i}-${name}` }))])));
  render(); await sleep(3500);
  for (let turnIndex = 0; turnIndex < simulation.turns.length; turnIndex++) {
    const turn = simulation.turns[turnIndex];
    for (let stepIndex = 0; stepIndex < turn.steps.length; stepIndex++) {
      const step = turn.steps[stepIndex]; setInfo(turnIndex + 1, stepIndex + 1, step.summary);
      if (step.call) await runDiscardStep(step.moves, step.call); else await runDrawStep(step.moves);
      await sleep(Math.round(520 * speedFactor()));
    }
  }
  $('#turn-info').textContent = 'SIMULATION COMPLETE';
}

window.addEventListener('load', () => {
  $('#speed-badge').textContent = `SPEED ${SPEED}`;
  const simulation = SIMULATIONS[ACTIVE_SIMULATION];
  if (!simulation) throw new Error(`Unknown simulation: ${ACTIVE_SIMULATION}`);
  runSimulation(simulation).catch(error => { console.error(error); $('#turn-info').textContent = 'SIMULATION ERROR'; });
});
