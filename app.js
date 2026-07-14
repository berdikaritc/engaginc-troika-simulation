/* Simulation engine. Pile array index 0 is always the visible/top card. */
const simulation = simulations[ACTIVE_SIMULATION];
if (!simulation) throw new Error(`Unknown simulation: ${ACTIVE_SIMULATION}`);
const state = structuredClone(simulation.initialState);
const $ = (selector) => document.querySelector(selector);
const speedMultiplier = 1 + (ANIMATION_SPEED - 5) * .115;
const adjusted = (ms) => Math.max(120, ms / speedMultiplier);
const cardPath = (name) => `cards-front/${encodeURIComponent(name)}.png`;

function cardElement(name, pile, index) {
  const card = document.createElement('div');
  card.className = 'card'; card.dataset.card = name; card.dataset.pile = pile; card.dataset.index = index;
  const image = new Image(); image.src = cardPath(name); image.alt = name; card.append(image);
  return card;
}

function renderPile(pile) {
  const target = pile === 'P1' ? $('#p1-hand') : pile === 'P2' ? $('#p2-hand') : $('#discard-pile');
  target.replaceChildren();
  const cards = state[pile];
  if (!cards.length) return;
  const maxSpread = pile === 'DISCARD' ? 10 : target.clientWidth - 116;
  const spread = cards.length < 2 ? 0 : Math.min(36, maxSpread / (cards.length - 1));
  cards.slice().reverse().forEach((name, reverseIndex) => {
    const index = cards.length - 1 - reverseIndex;
    const card = cardElement(name, pile, index);
    if (pile === 'DISCARD') {
      card.style.left = `${index * 1.5}px`; card.style.top = `${index * .8}px`;
      card.style.zIndex = index + 1; card.style.setProperty('--tilt', `${(index % 3 - 1) * 1.2}deg`);
    } else {
      card.style.left = `${index * spread}px`; card.style.zIndex = cards.length - index;
    }
    target.append(card);
  });
}
function render() { renderPile('P1'); renderPile('P2'); renderPile('DISCARD'); }
const pause = ms => new Promise(resolve => setTimeout(resolve, adjusted(ms)));
function cardRect(pile, index) { return document.querySelector(`.card[data-pile="${pile}"][data-index="${index}"]`)?.getBoundingClientRect(); }
function drawOrigin() { const game = $('#game').getBoundingClientRect(); return { left: game.left - 116, top: game.top + game.height / 2 - 87, width: 116, height: 174 }; }

function moveState([name, source, target]) {
  source = source === 'DRAWPILE' ? 'DRAW' : source; target = target === 'DRAWPILE' ? 'DRAW' : target;
  const index = state[source].indexOf(name);
  if (index < 0) throw new Error(`${name} is not in ${source}`);
  state[source].splice(index, 1); state[target].unshift(name);
  return { name, source, target, index };
}
async function animateOne(move) {
  const source = move[1] === 'DRAWPILE' ? 'DRAW' : move[1];
  const sourceRect = source === 'DRAW' ? drawOrigin() : cardRect(source, state[source].indexOf(move[0]));
  const result = moveState(move); render();
  const targetRect = cardRect(result.target, 0);
  if (!targetRect) return;
  const flying = cardElement(result.name, 'FLYING', 0); flying.classList.add('flying-card');
  flying.style.left = `${sourceRect.left}px`; flying.style.top = `${sourceRect.top}px`;
  $('#animation-layer').append(flying);
  await flying.animate([
    { transform: 'translate(0, 0) rotate(0deg)' },
    { transform: `translate(${targetRect.left-sourceRect.left}px, ${targetRect.top-sourceRect.top}px) rotate(${result.target === 'DISCARD' ? 3 : 0}deg)` }
  ], { duration: adjusted(1500), easing: 'cubic-bezier(.22,.75,.22,1)', fill: 'forwards' }).finished;
  flying.remove();
}
async function animateDiscardGroup(step) {
  const cards = step.moves.map(move => document.querySelector(`.card[data-pile="${move[1]}"][data-card="${CSS.escape(move[0])}"]`)).filter(Boolean);
  cards.forEach(card => card.classList.add('highlighted'));
  await pause(650);
  $('#call-banner').textContent = step.call; $('#call-banner').classList.add('visible');
  await pause(3000); $('#call-banner').classList.remove('visible'); await pause(200);
  const sourceRects = step.moves.map(move => cardRect(move[1], state[move[1]].indexOf(move[0])));
  const results = step.moves.map(moveState); render();
  const targets = results.map((result, i) => cardRect('DISCARD', step.moves.length - 1 - i));
  const layer = $('#animation-layer');
  const finished = results.map((result, i) => {
    const from = sourceRects[i], to = targets[i]; const flying = cardElement(result.name, 'FLYING', i); flying.classList.add('flying-card');
    flying.style.left = `${from.left}px`; flying.style.top = `${from.top}px`; layer.append(flying);
    return flying.animate([{transform:'translate(0,0)'},{transform:`translate(${to.left-from.left}px,${to.top-from.top}px) rotate(${(i-1)*2}deg)`}], {duration:adjusted(1500), easing:'cubic-bezier(.22,.75,.22,1)',fill:'forwards'}).finished.then(() => flying.remove());
  });
  await Promise.all(finished);
}
async function run() {
  render(); await pause(3500);
  for (let t = 0; t < simulation.turns.length; t++) {
    $('#turn-label').textContent = `TURN ${t + 1}`;
    for (const step of simulation.turns[t].steps) {
      $('#event-summary').textContent = step.summary || '';
      if (step.call) await animateDiscardGroup(step);
      else for (const move of step.moves) await animateOne(move);
    }
    $('#event-summary').textContent = ''; await pause(2000);
  }
  $('#turn-label').textContent = 'Simulation complete';
}
window.addEventListener('load', run);
