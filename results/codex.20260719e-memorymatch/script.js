const OBJECTS = [
  ['grape','anggur'], ['orange','jeruk'], ['watermelon','semangka'],
  ['golf ball','bola golf'], ['tennis ball','bola tenis'], ['basket ball','bola basket'],
  ['house roof','atap rumah'], ['tent','tenda'], ['pyramid','piramid'],
  ['cake slice','sepotong kue'], ['pizza slice','sepotong pizza'], ['jelly','jeli'],
  ['handphone','ponsel'], ['tv','tv'], ['laptop','laptop'],
  ['swimming trunk','celana renang'], ['cloth hanger','gantungan baju'], ['hat','topi'],
  ['table','meja'], ['cupboard','lemari'], ['bed','ranjang'],
  ['paper airplane','pesawat kertas'], ['dice','dadu'], ['alphabet block','balok huruf'],
  ['the triangle','trikona'], ['drum','drum'], ['piano','piano']
];

const lang = new URLSearchParams(location.search).get('lang') === 'id' ? 'id' : 'en';
const TEXT = {
  en: { title:'MEMORY<br>MATCH', subtitle:'Find the object trios', ready:'GET READY', turn:p=>`${p}'S TURN`, match:'MATCH!', noMatch:'NO MATCH', left:n=>`${n} ${n === 1 ? 'TRIO' : 'TRIOS'} TO FIND`, over:'GAME OVER', wins:p=>`${p} WINS!`, tie:'IT’S A TIE!' },
  id: { title:'COCOKKAN<br>OBJEK', subtitle:'Temukan trio objek', ready:'BERSIAP', turn:p=>`GILIRAN ${p}`, match:'COCOK!', noMatch:'TIDAK COCOK', left:n=>`${n} TRIO TERSISA`, over:'PERMAINAN SELESAI', wins:p=>`${p} MENANG!`, tie:'HASIL SERI!' }
}[lang];

const $ = s => document.querySelector(s);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const shuffle = array => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const state = { cards: [], scores: [0, 0], player: 0, groupsLeft: 7, known: new Map() };

function setMessage(text, style = '') {
  const el = $('#message');
  el.textContent = text;
  el.className = `message ${style}`;
}

function setup() {
  document.documentElement.lang = lang;
  $('#title').innerHTML = TEXT.title;
  $('#subtitle').textContent = TEXT.subtitle;
  setMessage(TEXT.ready);
  $('#winner-kicker').textContent = TEXT.over;

  const selected = shuffle([...OBJECTS]).slice(0, 7);
  state.cards = shuffle(selected.flatMap(([en, id], group) => [1,2,3].map(quantity => ({ en, id, group, quantity, removed:false, flipped:false }))));
  const board = $('#board');
  state.cards.forEach((card, index) => {
    const slot = document.createElement('div');
    slot.className = 'card-slot';
    slot.innerHTML = `<div class="card" id="card-${index}">
      <img class="card-face card-back" src="images/cards-back/back.png" alt="Card back">
      <img class="card-face card-front" src="images/cards-front/${card.quantity}-${card.en}.png" alt="${card.quantity} ${lang === 'id' ? card.id : card.en}">
    </div>`;
    board.appendChild(slot);
  });
  updateProgress();
}

function updateProgress() {
  $('#progress-fill').style.width = `${((7 - state.groupsLeft) / 7) * 100}%`;
  $('#remaining').textContent = TEXT.left(state.groupsLeft);
}

function chooseCards() {
  const available = state.cards.map((c,i) => c.removed ? -1 : i).filter(i => i >= 0);
  const rememberedGroups = new Map();
  available.forEach(i => {
    if (!state.known.has(i)) return;
    const group = state.known.get(i);
    rememberedGroups.set(group, [...(rememberedGroups.get(group) || []), i]);
  });
  const rememberedTrios = [...rememberedGroups.values()].filter(indices => indices.length === 3);

  // Memory is used more reliably as the board empties: 10% initially,
  // rising to 70%. A deliberate match is possible only after all three
  // positions in that trio have actually been revealed on earlier turns.
  const matchChance = .10 + ((7 - state.groupsLeft) / 6) * .60;
  if (rememberedTrios.length && Math.random() < matchChance) {
    return shuffle(rememberedTrios)[0];
  }

  // With no usable remembered trio, the player explores three positions at
  // random. An early match can therefore happen, but only by real coincidence.
  return shuffle([...available]).slice(0, 3);
}

async function flip(index, faceUp) {
  const card = $(`#card-${index}`);
  const options = {
    duration: 175,
    easing: 'cubic-bezier(.42, 0, .72, 1)',
    fill: 'forwards'
  };

  // Web Animations forces every intermediate width to be painted instead of
  // allowing class/style changes to be combined into one browser frame.
  const close = card.animate(
    [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
    options
  );
  await close.finished;

  // At the edge-on midpoint, exchange faces; no mirrored back can be shown.
  state.cards[index].flipped = faceUp;
  card.classList.toggle('front-visible', faceUp);
  if (faceUp) state.known.set(index, state.cards[index].group);

  // Second half: the new face widens from the edge back to full width.
  const open = card.animate(
    [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
    { ...options, easing: 'cubic-bezier(.28, 0, .58, 1)' }
  );
  await open.finished;
  close.cancel();
  open.cancel();
}

async function playTurn() {
  const p = state.player;
  $('#player-0').classList.toggle('active', p === 0);
  $('#player-1').classList.toggle('active', p === 1);
  setMessage(TEXT.turn(`P${p + 1}`));
  await sleep(1000);

  const picks = chooseCards();
  for (const index of picks) {
    await flip(index, true);
    await sleep(Math.random() * 2000);
  }
  await sleep(1000);

  const isMatch = picks.every(i => state.cards[i].group === state.cards[picks[0]].group);
  if (isMatch) {
    setMessage(TEXT.match, 'match');
    picks.forEach(i => $(`#card-${i}`).classList.add('matched'));
    await sleep(2000);
    picks.forEach((i, order) => {
      state.cards[i].removed = true;
      const el = $(`#card-${i}`);
      el.classList.remove('matched');
      el.style.animationDelay = `${order * 80}ms`;
      el.classList.add('fly');
    });
    await sleep(1100);
    state.scores[p]++;
    state.groupsLeft--;
    $(`#score-${p}`).textContent = state.scores[p];
    updateProgress();
  } else {
    setMessage(TEXT.noMatch, 'no-match');
    await sleep(1000);
    await Promise.all(picks.map(i => flip(i, false)));
  }
  await sleep(2000);
  state.player = 1 - state.player;
}

async function finish() {
  $('#player-0').classList.remove('active');
  $('#player-1').classList.remove('active');
  const [a,b] = state.scores;
  $('#winner-text').textContent = a === b ? TEXT.tie : TEXT.wins(a > b ? 'P1' : 'P2');
  $('#final-score').textContent = `${a} — ${b}`;
  const winner = $('#winner');
  winner.setAttribute('aria-hidden', 'false');
  winner.classList.add('show');
}

async function run() {
  setup();
  await sleep(2000);
  while (state.groupsLeft > 0) await playTurn();
  await finish();
}

run();
