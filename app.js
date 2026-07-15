/* Change this default, or open index.html?sim=S2, to choose a simulation. */
const DEFAULT_SIMULATION = 'S1';
const SIMULATION = new URLSearchParams(location.search).get('sim') || DEFAULT_SIMULATION;
const CARD_WIDTH = 151;
const state = { P1: [], P2: [], DISCARD: [] };
let serial = 0;

const $ = (selector) => document.querySelector(selector);
const piles = { P1: $('#p1'), P2: $('#p2'), DISCARD: $('#discard') };
const pause = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));
// S1 contains an older "tux lyx" spelling; its supplied artwork is named "cut lyx".
const cardAssetName = (name) => name.replace(/^wildcard\+tux lyx /, 'wildcard+cut lyx ');
const cardPath = (name) => `cards-front/${encodeURIComponent(cardAssetName(name))}.png`;

function cardElement(card) {
  const image = document.createElement('img');
  image.className = 'card';
  image.src = cardPath(card.name);
  image.alt = card.name;
  image.dataset.id = card.id;
  return image;
}

function renderPile(name) {
  const pile = piles[name];
  const cards = state[name];
  pile.replaceChildren();
  const shown = name === 'DISCARD' && cards.length > 16 ? cards.slice(-16) : cards;
  const available = pile.clientWidth - CARD_WIDTH;
  const gap = shown.length > 1 ? Math.max(18, Math.min(56, available / (shown.length - 1))) : 0;
  shown.forEach((card, index) => {
    const image = cardElement(card);
    image.style.left = `${index * gap}px`;
    image.style.zIndex = index + 1;
    pile.append(image);
  });
  if (name === 'DISCARD') $('#discardCount').textContent = `${cards.length} card${cards.length === 1 ? '' : 's'}`;
}
function renderAll() { Object.keys(piles).forEach(renderPile); }
function updateStatus(turn, step, summary) {
  $('#turnLabel').textContent = `Turn ${turn}`;
  $('#stepLabel').textContent = `Step ${step} · ${summary || 'In progress'}`;
}
function takeCard(pile, cardName) {
  const index = state[pile].map(c => c.name).lastIndexOf(cardName);
  if (index < 0) throw new Error(`${cardName} is not in ${pile}`);
  return state[pile].splice(index, 1)[0];
}
function pileCard(id) { return document.querySelector(`.card[data-id="${id}"]`); }

async function fly(card, source, duration) {
  const target = pileCard(card.id).getBoundingClientRect();
  const image = document.createElement('img');
  image.className = 'flying-card'; image.src = cardPath(card.name); image.alt = '';
  image.style.setProperty('--duration', `${duration}ms`);
  image.style.left = `${source.left}px`; image.style.top = `${source.top}px`;
  image.style.width = `${source.width || CARD_WIDTH}px`;
  document.body.append(image);
  // Wait a frame, then move. The destination card stays hidden until arrival.
  await new Promise(requestAnimationFrame);
  image.style.left = `${target.left}px`; image.style.top = `${target.top}px`;
  image.style.width = `${target.width}px`;
  await pause(duration + 35);
  image.remove();
  const destination = pileCard(card.id);
  if (destination) destination.style.opacity = '1';
}

async function drawMove(move, fast) {
  const [name, , to] = move;
  const card = { id: ++serial, name };
  state[to].push(card); renderPile(to);
  const destination = pileCard(card.id); destination.style.opacity = '0';
  await fly(card, $('#drawPile').getBoundingClientRect(), fast ? 200 : 1500);
}
async function discardStep(moves, call) {
  const from = moves[0][1];
  await pause(3000); // The player thinks before choosing their group.
  const cards = moves.map(([name]) => {
    const card = [...state[from]].reverse().find(item => item.name === name);
    if (!card) throw new Error(`${name} is not in ${from}`);
    return card;
  });
  cards.forEach(card => pileCard(card.id)?.classList.add('highlight'));
  $('#callout strong').textContent = call || '—'; $('#callout').classList.add('visible');
  await pause(3000);
  $('#callout').classList.remove('visible');
  const sources = new Map(cards.map(card => [card.id, pileCard(card.id).getBoundingClientRect()]));
  cards.forEach(card => takeCard(from, card.name));
  state.DISCARD.push(...cards); renderAll();
  cards.forEach(card => { const target = pileCard(card.id); if (target) target.style.opacity = '0'; });
  await Promise.all(cards.map(card => fly(card, sources.get(card.id), 1500)));
}
async function runStep(step, isInitial, turnNumber, stepNumber) {
  updateStatus(turnNumber, stepNumber, step.summary);
  if (!step.moves?.length) return;
  if (step.moves[0][1] === 'DRAW') {
    for (const move of step.moves) await drawMove(move, isInitial);
  } else {
    await discardStep(step.moves, step.call);
  }
}
async function start() {
  try {
    const response = await fetch(`simdata/${encodeURIComponent(SIMULATION)}/simulation.json`);
    if (!response.ok) throw new Error(`Could not load simulation ${SIMULATION}`);
    const simulation = await response.json();
    $('#turnLabel').textContent = `Simulation ${SIMULATION}`;
    $('#stepLabel').textContent = 'Starting shortly…';
    await pause(3500);
    for (let turnIndex = 0; turnIndex < simulation.turns.length; turnIndex++) {
      const turn = simulation.turns[turnIndex];
      for (let stepIndex = 0; stepIndex < turn.steps.length; stepIndex++) {
        await runStep(turn.steps[stepIndex], turnIndex === 0, turnIndex + 1, stepIndex + 1);
      }
    }
    $('#turnLabel').textContent = 'All turns played'; $('#stepLabel').textContent = 'Recording complete';
    $('#finish').classList.add('visible');
  } catch (error) {
    console.error(error); $('#turnLabel').textContent = 'Unable to start'; $('#stepLabel').textContent = error.message;
  }
}
renderAll(); start();
