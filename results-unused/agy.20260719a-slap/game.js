// Slap Card Game Simulation Logic

// 1. Data mapping for the 27 card objects and their sizes
const objectSizes = {
  "grape": "small",
  "orange": "medium",
  "watermelon": "large",
  "golf ball": "small",
  "tennis ball": "medium",
  "basket ball": "large",
  "house roof": "large",
  "tent": "large",
  "pyramid": "large",
  "cake slice": "small",
  "pizza slice": "medium",
  "jelly": "small",
  "handphone": "small",
  "tv": "medium",
  "laptop": "medium",
  "swimming trunk": "small",
  "cloth hanger": "large",
  "hat": "medium",
  "table": "medium",
  "cupboard": "large",
  "bed": "large",
  "paper airplane": "small",
  "dice": "small",
  "alphabet block": "small",
  "the triangle": "medium",
  "drum": "medium",
  "piano": "large"
};

// Indonesian translations for debug logs/metadata if needed
const indonesianNames = {
  "grape": "anggur",
  "orange": "jeruk",
  "watermelon": "semangka",
  "golf ball": "bola golf",
  "tennis ball": "bola tenis",
  "basket ball": "bola basket",
  "house roof": "atap rumah",
  "tent": "tenda",
  "pyramid": "piramid",
  "cake slice": "sepotong kue",
  "pizza slice": "sepotong pizza",
  "jelly": "jeli",
  "handphone": "ponsel",
  "tv": "tv",
  "laptop": "laptop",
  "swimming trunk": "celana renang",
  "cloth hanger": "gantungan baju",
  "hat": "topi",
  "table": "meja",
  "cupboard": "lemari",
  "bed": "ranjang",
  "paper airplane": "pesawat kertas",
  "dice": "dadu",
  "alphabet block": "balok huruf",
  "the triangle": "trikona",
  "drum": "drum",
  "piano": "piano"
};

// 2. Localization Dictionary
const locales = {
  en: {
    callTitle: "CALL",
    small: "Small",
    medium: "Medium",
    large: "Large",
    wrongSlap: "WRONG SLAP",
    fastest: "FASTEST",
    wins: "WINS THE GAME",
    p1Fastest: "P1 FASTEST",
    p2Fastest: "P2 FASTEST",
    p1Wins: "P1 WINS THE GAME",
    p2Wins: "P2 WINS THE GAME",
    readyText: "READY",
    discardText: "DISCARD PILE",
    salahGebrak: "SALAH GEBRAK",
    p1Duluan: "P1 DULUAN",
    p2Duluan: "P2 DULUAN",
    p1Menang: "P1 MENANG",
    p2Menang: "P2 MENANG",
    siap: "SIAP"
  },
  id: {
    callTitle: "PANGGILAN",
    small: "Kecil",
    medium: "Sedang",
    large: "Besar",
    wrongSlap: "SALAH GEBRAK",
    fastest: "DULUAN",
    wins: "MENANG",
    p1Fastest: "P1 DULUAN",
    p2Fastest: "P2 DULUAN",
    p1Wins: "P1 MENANG",
    p2Wins: "P2 MENANG",
    readyText: "SIAP",
    discardText: "TUMPUKAN BUANGAN",
    salahGebrak: "SALAH GEBRAK",
    p1Duluan: "P1 DULUAN",
    p2Duluan: "P2 DULUAN",
    p1Menang: "P1 MENANG",
    p2Menang: "P2 MENANG",
    siap: "SIAP"
  }
};

// Call sequence indices mapping
const callSequence = [
  { qty: 1, size: "small" },
  { qty: 2, size: "small" },
  { qty: 3, size: "small" },
  { qty: 1, size: "medium" },
  { qty: 2, size: "medium" },
  { qty: 3, size: "medium" },
  { qty: 1, size: "large" },
  { qty: 2, size: "large" },
  { qty: 3, size: "large" }
];

// Simulation states
let p1Pile = [];
let p2Pile = [];
let discardPile = [];
let currentCallIndex = 0; // index in callSequence (0 to 8)
let currentTurn = 1; // 1 or 2
let lastSlapWinner = null;
let wrongSlapPlayer = null;
let simulationRunning = false;
let isPaused = false;
let speedMultiplier = 1.0;
let currentLanguage = 'en'; // 'en' or 'id'
let gameActive = false;
let loopPromise = null;

// Read query params for language
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('lang') === 'id') {
  currentLanguage = 'id';
} else {
  currentLanguage = 'en';
}

// 3. Build Full Deck (81 object cards + 3 wildcards)
function buildDeck() {
  const deck = [];
  
  // Object cards
  const quantities = [1, 2, 3];
  const objects = Object.keys(objectSizes);
  
  for (const obj of objects) {
    for (const q of quantities) {
      deck.push({
        name: `${q}-${obj}`,
        quantity: q,
        size: objectSizes[obj],
        isWildcard: false,
        img: `images/cards-front/${q}-${obj}.png`
      });
    }
  }
  
  // 3 Wildcards
  const wildcards = [
    "wildcard max 1",
    "wildcard tux 1",
    "wildcard+cut lyx 1"
  ];
  
  for (const wc of wildcards) {
    deck.push({
      name: wc,
      quantity: null,
      size: null,
      isWildcard: true,
      img: `images/cards-front/${wc}.png`
    });
  }
  
  return deck;
}

// Fisher-Yates Shuffle
function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}

// Sleep / Delay function respecting pause & speed multiplier
async function wait(ms) {
  let elapsed = 0;
  const step = 16; // Check every frame (~16ms)
  while (elapsed < ms) {
    if (!isPaused && simulationRunning) {
      elapsed += step * speedMultiplier;
    }
    await new Promise(resolve => setTimeout(resolve, 16));
  }
}

// Log message to the dashboard debugger
function logDebug(message, type = '') {
  const logDiv = document.getElementById('debug-log');
  const line = document.createElement('div');
  line.className = `debug-line ${type}`;
  
  const timestamp = new Date().toLocaleTimeString();
  line.textContent = `[${timestamp}] ${message}`;
  logDiv.appendChild(line);
  logDiv.scrollTop = logDiv.scrollHeight;
}

// Translate the call Sequence
function getCallString(qty, size, lang) {
  const t = locales[lang];
  let sizeStr = "";
  if (size === "small") sizeStr = t.small;
  else if (size === "medium") sizeStr = t.medium;
  else if (size === "large") sizeStr = t.large;
  return `${qty} ${sizeStr}`;
}

// Update call panel
function updateCallDisplay() {
  const call = callSequence[currentCallIndex];
  const display = getCallString(call.qty, call.size, currentLanguage);
  document.getElementById('current-call-display').textContent = display; // dashboard
  document.getElementById('call-badge').textContent = display; // recording frame
  
  const labelCallTitle = document.getElementById('call-title');
  labelCallTitle.textContent = locales[currentLanguage].callTitle;
}

// Update all label and panel language strings on-the-fly
function updateLanguageUI() {
  const t = locales[currentLanguage];
  
  // Dashboard
  document.getElementById('btn-lang-en').className = currentLanguage === 'en' ? 'active' : '';
  document.getElementById('btn-lang-id').className = currentLanguage === 'id' ? 'active' : '';
  
  // Recording area labels
  document.getElementById('label-discard-text').textContent = currentLanguage === 'en' ? 'DISCARD' : 'BUANGAN';
  
  // Update titles
  updateCallDisplay();
}

// Render player piles visually
function renderVisualStack(playerNum) {
  const stackElement = document.getElementById(`p${playerNum}-visual-stack`);
  stackElement.innerHTML = '';
  
  const pileSize = playerNum === 1 ? p1Pile.length : p2Pile.length;
  
  // Update counts
  document.getElementById(`count-p${playerNum}`).textContent = pileSize;
  document.getElementById(`info-p${playerNum}-cards`).textContent = pileSize;
  
  // Render up to 12 cards to indicate pile thickness
  const numCardsToRender = Math.min(pileSize, 12);
  for (let i = 0; i < numCardsToRender; i++) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'dummy-card-back';
    
    // Offset cards slightly to create the 3D stack effect
    cardDiv.style.left = `calc(50% - 82.5px - ${i * 0.5}px)`;
    cardDiv.style.top = `calc(50% - 115.5px - ${i * 1.0}px)`;
    cardDiv.style.zIndex = i;
    
    const img = document.createElement('img');
    img.src = 'images/cards-back/back.png';
    cardDiv.appendChild(img);
    
    stackElement.appendChild(cardDiv);
  }
}

// Initialise Game State
function initGame() {
  logDebug("Initializing new game simulation...");
  
  // Clear any existing flying card elements in the DOM
  const existingCards = document.querySelectorAll('.card.flying, .card.flipped, .card.flying-back');
  existingCards.forEach(c => c.remove());
  
  // Clear discard pile area
  document.getElementById('discard-visual-stack').innerHTML = '';
  
  // Build and Shuffle deck
  const deck = buildDeck();
  shuffle(deck);
  
  // Distribute cards: 42 each
  p1Pile = deck.slice(0, 42);
  p2Pile = deck.slice(42, 84);
  discardPile = [];
  
  currentCallIndex = 0;
  currentTurn = 1;
  lastSlapWinner = null;
  wrongSlapPlayer = null;
  gameActive = true;
  
  // Update labels
  renderVisualStack(1);
  renderVisualStack(2);
  document.getElementById('count-discard').textContent = '0';
  document.getElementById('info-discard-cards').textContent = '0';
  document.getElementById('info-last-slapper').textContent = '-';
  
  // Highlight P1 as starting turn
  updateTurnHighlight();
  updateCallDisplay();
  updateLanguageUI();
  
  logDebug("Game setup complete. 84 cards distributed (42 to P1, 42 to P2).");
}

// Highlight whose turn it is
function updateTurnHighlight() {
  const p1Label = document.getElementById('label-p1');
  const p2Label = document.getElementById('label-p2');
  
  p1Label.classList.remove('active-turn');
  p2Label.classList.remove('active-turn');
  
  if (currentTurn === 1) {
    p1Label.classList.add('active-turn');
  } else {
    p2Label.classList.add('active-turn');
  }
}

// Display Banner Overlay Message
async function showBanner(text, type = '', duration = 1500) {
  const banner = document.getElementById('event-banner');
  const bannerText = document.getElementById('banner-text');
  
  banner.className = 'event-banner'; // reset
  if (type) banner.classList.add(type);
  
  bannerText.textContent = text;
  banner.classList.add('visible');
  
  await wait(duration);
  
  banner.classList.remove('visible');
  await wait(200); // fade out padding
}

// 4. Smooth Flight Deal Animation (P1/P2 Pile to Discard Pile)
async function dealCard(fromPlayerNum) {
  const playerPile = fromPlayerNum === 1 ? p1Pile : p2Pile;
  const cardObj = playerPile.pop(); // draw top card (end of array)
  discardPile.push(cardObj);
  
  // Update player visual stack count immediately
  renderVisualStack(fromPlayerNum);
  
  // Spawn active card div in the DOM
  const cardDiv = document.createElement('div');
  cardDiv.className = 'card flying';
  
  // Calculate top-left starting positions relative to game-container
  const startLeft = 277.5;
  const startTop = fromPlayerNum === 1 ? 64.5 : 784.5;
  
  // Apply visual stack offsets for the top card:
  const pileSize = playerPile.length; // size after pop
  const stackOffsetIndex = Math.min(pileSize, 11);
  const cardLeft = startLeft - (stackOffsetIndex * 0.5);
  const cardTop = startTop - (stackOffsetIndex * 1.0);
  
  cardDiv.style.left = `${cardLeft}px`;
  cardDiv.style.top = `${cardTop}px`;
  cardDiv.style.zIndex = 100; // deal moves above all
  
  // Card layout
  const cardInner = document.createElement('div');
  cardInner.className = 'card-inner';
  
  const cardFront = document.createElement('div');
  cardFront.className = 'card-front';
  const imgFront = document.createElement('img');
  imgFront.src = cardObj.img;
  cardFront.appendChild(imgFront);
  
  const cardBack = document.createElement('div');
  cardBack.className = 'card-back';
  const imgBack = document.createElement('img');
  imgBack.src = 'images/cards-back/back.png';
  cardBack.appendChild(imgBack);
  
  cardInner.appendChild(cardFront);
  cardInner.appendChild(cardBack);
  cardDiv.appendChild(cardInner);
  
  const container = document.getElementById('game-container');
  container.appendChild(cardDiv);
  
  // Force browser layout reflow
  cardDiv.offsetHeight;
  
  // Target position in the discard pile (middle third)
  const targetLeft = 277.5;
  const targetTop = 424.5;
  
  // Assign messy look offset
  const dx = (Math.random() * 14) - 7; // +/- 7px
  const dy = (Math.random() * 14) - 7; // +/- 7px
  const angle = (Math.random() * 24) - 12; // +/- 12 degrees
  
  // Fly card
  cardDiv.style.left = `${targetLeft + dx}px`;
  cardDiv.style.top = `${targetTop + dy}px`;
  cardDiv.style.transform = `rotate(${angle}deg)`;
  
  // Wait 0.6s for flight
  await wait(600);
  
  // Flip instantly upon landing
  cardDiv.classList.remove('flying');
  cardDiv.classList.add('flipped');
  cardDiv.style.transform = `translate3d(0, 0, 0) rotate(${angle}deg)`;
  cardDiv.style.zIndex = discardPile.length; // index in stack
  
  // Update discard labels
  document.getElementById('count-discard').textContent = discardPile.length;
  document.getElementById('info-discard-cards').textContent = discardPile.length;
  
  return cardDiv;
}

// 5. Slapping Hand animations
async function animateSlap(winnerNum, isWrongSlap, wrongSlapper) {
  const hand1 = document.getElementById('hand-p1');
  const hand2 = document.getElementById('hand-p2');
  
  // Reset hand states
  hand1.style.transition = 'none';
  hand2.style.transition = 'none';
  hand1.offsetHeight;
  hand2.offsetHeight;
  
  const targetX = 360;
  const targetY = 540;
  
  if (isWrongSlap) {
    const slapper = wrongSlapper;
    const hand = slapper === 1 ? hand1 : hand2;
    const restRot = slapper === 1 ? 180 : 0;
    
    // Slap duration 0.1s to 0.2s
    const duration = 100 + Math.random() * 100;
    document.documentElement.style.setProperty('--slap-duration', `${duration}ms`);
    
    hand.style.left = `${targetX}px`;
    hand.style.top = `${slapper === 1 ? -200 : 1280}px`;
    hand.style.transform = `translate(-50%, -50%) rotate(${restRot}deg)`;
    hand.offsetHeight;
    
    // Animate to slap
    hand.style.transition = `top calc(var(--slap-duration) / var(--speed-multiplier)) cubic-bezier(0.18, 0.89, 0.32, 1.15),
                             transform calc(var(--slap-duration) / var(--speed-multiplier)) cubic-bezier(0.18, 0.89, 0.32, 1.15)`;
    
    const slapRot = restRot + (Math.random() * 20 - 10);
    hand.style.top = `${targetY}px`;
    hand.style.transform = `translate(-50%, -50%) rotate(${slapRot}deg)`;
    hand.style.zIndex = 110;
    
    await wait(duration);
    return duration;
  } else {
    // Both race to slap!
    const winHand = winnerNum === 1 ? hand1 : hand2;
    const loseHand = winnerNum === 1 ? hand2 : hand1;
    
    const winRestRot = winnerNum === 1 ? 180 : 0;
    const loseRestRot = winnerNum === 1 ? 0 : 180;
    
    // Winner speed: 0.1s to 0.15s
    const winDuration = 100 + Math.random() * 50;
    // Loser follows winner with a tiny delay and lands on top
    const loseDelay = 50 + Math.random() * 50;
    const loseDuration = 100 + Math.random() * 50;
    
    winHand.style.left = `${targetX}px`;
    winHand.style.top = `${winnerNum === 1 ? -200 : 1280}px`;
    winHand.style.transform = `translate(-50%, -50%) rotate(${winRestRot}deg)`;
    
    loseHand.style.left = `${targetX}px`;
    loseHand.style.top = `${winnerNum === 1 ? 1280 : -200}px`;
    loseHand.style.transform = `translate(-50%, -50%) rotate(${loseRestRot}deg)`;
    
    winHand.offsetHeight;
    loseHand.offsetHeight;
    
    // Trigger winner slap
    document.documentElement.style.setProperty('--slap-duration', `${winDuration}ms`);
    winHand.style.transition = `top calc(var(--slap-duration) / var(--speed-multiplier)) cubic-bezier(0.18, 0.89, 0.32, 1.15),
                               transform calc(var(--slap-duration) / var(--speed-multiplier)) cubic-bezier(0.18, 0.89, 0.32, 1.15)`;
    
    const winSlapRot = winRestRot + (Math.random() * 20 - 10);
    winHand.style.top = `${targetY}px`;
    winHand.style.transform = `translate(-50%, -50%) rotate(${winSlapRot}deg)`;
    winHand.style.zIndex = 110; // Winner hand bottom
    
    await wait(loseDelay);
    
    // Trigger loser slap
    document.documentElement.style.setProperty('--slap-duration', `${loseDuration}ms`);
    loseHand.style.transition = `top calc(var(--slap-duration) / var(--speed-multiplier)) cubic-bezier(0.18, 0.89, 0.32, 1.15),
                                transform calc(var(--slap-duration) / var(--speed-multiplier)) cubic-bezier(0.18, 0.89, 0.32, 1.15)`;
    
    const loseSlapRot = loseRestRot + (Math.random() * 20 - 10);
    loseHand.style.top = `${targetY}px`;
    loseHand.style.transform = `translate(-50%, -50%) rotate(${loseSlapRot}deg)`;
    loseHand.style.zIndex = 111; // Loser hand lands ON TOP of winner
    
    await wait(loseDuration);
    return winDuration + loseDelay + loseDuration;
  }
}

// Retract hands back offscreen
async function retractHands() {
  const hand1 = document.getElementById('hand-p1');
  const hand2 = document.getElementById('hand-p2');
  
  document.documentElement.style.setProperty('--slap-duration', `300ms`);
  hand1.style.transition = `top calc(var(--slap-duration) / var(--speed-multiplier)) ease-in,
                           transform calc(var(--slap-duration) / var(--speed-multiplier)) ease-in`;
  hand2.style.transition = `top calc(var(--slap-duration) / var(--speed-multiplier)) ease-in,
                           transform calc(var(--slap-duration) / var(--speed-multiplier)) ease-in`;
  
  hand1.style.top = `-200px`;
  hand1.style.transform = `translate(-50%, -50%) rotate(180deg)`;
  
  hand2.style.top = `1280px`;
  hand2.style.transform = `translate(-50%, -50%) rotate(0deg)`;
  
  await wait(300);
}

// 6. Slide Pile & Retrieve Discard Cards Animation
async function takeDiscardPile(toPlayerNum, isWrongSlap) {
  const discardDivs = Array.from(document.querySelectorAll('.card.flipped'));
  if (discardDivs.length === 0) return;
  
  logDebug(`Player P${toPlayerNum} takes the discard pile (${discardPile.length} cards).`);
  
  const targetLeft = 277.5;
  const targetTop = toPlayerNum === 1 ? 64.5 : 784.5;
  
  // 1. Slide player's current pile to the right (takes ~0.4s)
  const playerSlot = document.getElementById(`p${toPlayerNum}-visual-stack`);
  document.documentElement.style.setProperty('--slide-duration', `400ms`);
  playerSlot.style.transform = 'translateX(200px)';
  
  await wait(200); // Let slide begin
  
  // 2. Flip all cards in discard pile face down instantly
  discardDivs.forEach(div => {
    div.classList.remove('flipped');
    const inner = div.querySelector('.card-inner');
    inner.style.transition = 'none';
    inner.offsetHeight; // force layout
    div.style.transform = 'rotate(0deg)';
  });
  
  await wait(50);
  
  // 3. Fly discard cards smoothly to player's pile position
  const flybackDuration = isWrongSlap ? 1000 : 1500;
  document.documentElement.style.setProperty('--flyback-duration', `${flybackDuration}ms`);
  
  discardDivs.forEach((div, i) => {
    // Add flyback transitions
    div.style.transition = `left calc(var(--flyback-duration) / var(--speed-multiplier)) cubic-bezier(0.25, 0.8, 0.25, 1), 
                            top calc(var(--flyback-duration) / var(--speed-multiplier)) cubic-bezier(0.25, 0.8, 0.25, 1), 
                            transform calc(var(--flyback-duration) / var(--speed-multiplier)) cubic-bezier(0.25, 0.8, 0.25, 1)`;
    // Target position is offset to mimic stacking at the bottom
    const cardL = targetLeft - (i * 0.5);
    const cardT = targetTop - (i * 1.0);
    div.style.left = `${cardL}px`;
    div.style.top = `${cardT}px`;
    div.style.transform = 'rotate(0deg)';
    div.style.zIndex = i; // pile order
  });
  
  // Wait for flight to finish
  await wait(flybackDuration);
  
  // 4. Update the game state: prepend discard pile to the losing player's pile
  if (toPlayerNum === 1) {
    p1Pile = [...discardPile, ...p1Pile];
  } else {
    p2Pile = [...discardPile, ...p2Pile];
  }
  discardPile = [];
  
  // 5. Clean up temporary DOM cards
  discardDivs.forEach(div => div.remove());
  
  // 6. Re-render visual stack showing new thickness
  renderVisualStack(toPlayerNum);
  document.getElementById('count-discard').textContent = '0';
  document.getElementById('info-discard-cards').textContent = '0';
  
  // 7. Slide current pile back to center on top of the newly added bottom cards (takes ~0.4s)
  playerSlot.style.transform = 'translateX(0px)';
  
  await wait(400);
}

// 7. Check for winner
function checkWinner(slapOccurred, lastSlapper) {
  const p1Empty = p1Pile.length === 0;
  const p2Empty = p2Pile.length === 0;
  
  // Both empty (rare sudden death)
  if (p1Empty && p2Empty) {
    if (slapOccurred) {
      // The slapper who is NOT the last slapper wins the game!
      const winner = lastSlapper === 1 ? 2 : 1;
      declareWinner(winner);
      return true;
    }
    return false;
  }
  
  if (p1Empty) {
    if (slapOccurred) {
      if (lastSlapper === 2) {
        // P1 wins because P2 is the last slapper (loser) and took the pile
        declareWinner(1);
        return true;
      }
    }
  }
  
  if (p2Empty) {
    if (slapOccurred) {
      if (lastSlapper === 1) {
        // P2 wins because P1 is the last slapper (loser) and took the pile
        declareWinner(2);
        return true;
      }
    }
  }
  
  return false;
}

// Declare winner and end game
async function declareWinner(winnerNum) {
  gameActive = false;
  simulationRunning = false;
  
  const t = locales[currentLanguage];
  const winMsg = winnerNum === 1 ? t.p1Wins : t.p2Wins;
  
  logDebug(`=== GAME OVER === P${winnerNum} WINS!`, 'win-event');
  
  document.getElementById('btn-play-pause').textContent = 'Start';
  
  await showBanner(winMsg, 'win', 5000);
}

// Main Game Loop step
async function runStep() {
  if (!gameActive) return;
  
  // 1. Determine player to discard
  // If active player has 0 cards, they skip.
  const p1Has = p1Pile.length > 0;
  const p2Has = p2Pile.length > 0;
  
  if (!p1Has && !p2Has) {
    // Sudden death sudden slap! Both empty, discard has cards.
    logDebug("Sudden death slap race triggered!", "slap-event");
    const winner = Math.random() < 0.5 ? 1 : 2;
    const loser = winner === 1 ? 2 : 1;
    
    // Slap
    await animateSlap(winner, false);
    
    // Display fastest slap
    const t = locales[currentLanguage];
    const bannerMsg = winner === 1 ? t.p1Fastest : t.p2Fastest;
    
    await showBanner(bannerMsg, 'success', 800);
    await retractHands();
    
    // Loser takes pile
    await takeDiscardPile(loser, false);
    
    // Check winner
    checkWinner(true, loser);
    return;
  }
  
  if (currentTurn === 1 && !p1Has) {
    logDebug("P1 has 0 cards, skipping discard.");
    currentTurn = 2;
    updateTurnHighlight();
  } else if (currentTurn === 2 && !p2Has) {
    logDebug("P2 has 0 cards, skipping discard.");
    currentTurn = 1;
    updateTurnHighlight();
  }
  
  const activePlayer = currentTurn;
  const activePile = activePlayer === 1 ? p1Pile : p2Pile;
  
  if (activePile.length === 0) return; // fail-safe
  
  // 2. Deal card (flies to center, takes 0.6s)
  const cardElement = await dealCard(activePlayer);
  const cardName = cardElement.dataset.cardName;
  const cardObj = discardPile[discardPile.length - 1];
  
  // 3. Highlight and evaluate against call
  const call = callSequence[currentCallIndex];
  
  // Call text log
  const callString = getCallString(call.qty, call.size, 'en');
  logDebug(`P${activePlayer} discards "${cardName}" and calls "${callString}".`);
  
  // Evaluate match
  let isMatch = false;
  if (cardObj.isWildcard) {
    isMatch = true;
    logDebug(`Wildcard discarded! SLAP RACE!`, 'slap-event');
  } else if (cardObj.quantity === call.qty && cardObj.size === call.size) {
    isMatch = true;
    logDebug(`Match found! Qty: ${cardObj.quantity}, Size: ${cardObj.size}. SLAP RACE!`, 'slap-event');
  }
  
  if (isMatch) {
    // -------------------------------------------------------------
    // MATCH / WILDCARD RULE: SLAP RACE
    // -------------------------------------------------------------
    // Highlights matching panel
    const callPanel = document.getElementById('call-panel');
    callPanel.classList.add('matching');
    cardElement.classList.add('highlight-slap');
    
    // Delay before slap begins (0.1s to 0.5s)
    const delayBeforeSlap = 100 + Math.random() * 400;
    await wait(delayBeforeSlap);
    
    // Slap race! 50/50 chance P1 wins
    const slapWinner = Math.random() < 0.5 ? 1 : 2;
    const slapLoser = slapWinner === 1 ? 2 : 1;
    lastSlapWinner = slapWinner;
    
    // Animate slap race
    await animateSlap(slapWinner, false);
    
    // Display fastest slap
    const t = locales[currentLanguage];
    const bannerMsg = slapWinner === 1 ? t.p1Fastest : t.p2Fastest;
    document.getElementById('info-last-slapper').textContent = `P${slapWinner}`;
    
    await showBanner(bannerMsg, 'success', 1000);
    
    // retract hands
    await retractHands();
    
    // Highlight removal
    callPanel.classList.remove('matching');
    cardElement.classList.remove('highlight-slap');
    
    // Loser takes discard pile (takes ~3s)
    await takeDiscardPile(slapLoser, false);
    
    // Check win condition
    const ended = checkWinner(true, slapLoser);
    if (ended) return;
    
    // Turn continues from the loser of the slap
    currentTurn = slapLoser;
    currentCallIndex = (currentCallIndex + 1) % 9;
    updateTurnHighlight();
    updateCallDisplay();
    
  } else {
    // -------------------------------------------------------------
    // NO MATCH RULE: 2% MISTAKEN SLAP or 98% DELAY
    // -------------------------------------------------------------
    const rand = Math.random();
    
    if (rand < 0.02) {
      // 2% chance player slaps mistakenly
      const wrongSlapper = Math.random() < 0.5 ? 1 : 2;
      logDebug(`Wrong slap! Player P${wrongSlapper} slapped mistakenly.`, 'slap-event');
      wrongSlapPlayer = wrongSlapper;
      
      cardElement.classList.add('highlight-wrong');
      
      // Delay before slap (0.1s to 0.5s)
      const delayBeforeSlap = 100 + Math.random() * 400;
      await wait(delayBeforeSlap);
      
      // Slap hand
      await animateSlap(null, true, wrongSlapper);
      
      // Display wrong slap text
      const t = locales[currentLanguage];
      await showBanner(t.wrongSlap, 'wrong', 1200);
      
      // retract hands
      await retractHands();
      cardElement.classList.remove('highlight-wrong');
      
      // Slapper takes discard pile (takes ~2s)
      await takeDiscardPile(wrongSlapper, true);
      
      // Check win condition (slapper was last slapper, so slapper takes cards)
      const ended = checkWinner(true, wrongSlapper);
      if (ended) return;
      
      // Turn continues from the wrong slapper
      currentTurn = wrongSlapper;
      currentCallIndex = (currentCallIndex + 1) % 9;
      updateTurnHighlight();
      updateCallDisplay();
      
    } else {
      // 98% normal turn: delay 0.1s to 0.5s
      const delay = 100 + Math.random() * 400;
      await wait(delay);
      
      // Check if active player just emptied their deck
      // (They avoid being the last slapper of the next slap before winning)
      const p1Empty = p1Pile.length === 0;
      const p2Empty = p2Pile.length === 0;
      
      // Turn advances normally
      currentTurn = currentTurn === 1 ? 2 : 1;
      currentCallIndex = (currentCallIndex + 1) % 9;
      
      // Skip turn check if next player has 0 cards
      if (currentTurn === 1 && p1Pile.length === 0 && p2Pile.length > 0) {
        currentTurn = 2;
      } else if (currentTurn === 2 && p2Pile.length === 0 && p1Pile.length > 0) {
        currentTurn = 1;
      }
      
      updateTurnHighlight();
      updateCallDisplay();
    }
  }
}

// Infinite Game Loop Runner
async function gameLoop() {
  while (gameActive) {
    if (!isPaused && simulationRunning) {
      await runStep();
      await wait(500); // short delay between steps
    } else {
      await new Promise(resolve => setTimeout(resolve, 100)); // sleep when paused
    }
  }
}

// 8. Bind Control Buttons and Actions
function bindControls() {
  // Play / Pause simulation
  const playBtn = document.getElementById('btn-play-pause');
  playBtn.addEventListener('click', async () => {
    if (!simulationRunning) {
      logDebug("Starting simulation...");
      simulationRunning = true;
      isPaused = false;
      playBtn.textContent = 'Pause';
      
      if (!gameActive) {
        initGame();
        // 2 seconds delay before first card deal
        logDebug("First deal starting in 2 seconds...");
        const t = locales[currentLanguage];
        await showBanner(t.readyText, '', 1800);
        await wait(200);
        gameActive = true;
      }
      
      if (!loopPromise) {
        loopPromise = gameLoop();
      }
    } else {
      // Toggle pause state
      if (isPaused) {
        logDebug("Resuming simulation...");
        isPaused = false;
        playBtn.textContent = 'Pause';
      } else {
        logDebug("Pausing simulation...");
        isPaused = true;
        playBtn.textContent = 'Resume';
      }
    }
  });

  // Restart Button
  document.getElementById('btn-restart').addEventListener('click', async () => {
    logDebug("Restarting simulation...");
    gameActive = false;
    simulationRunning = false;
    isPaused = false;
    
    playBtn.textContent = 'Start';
    
    // Short wait to allow current async chains to resolve safely
    await new Promise(resolve => setTimeout(resolve, 150));
    
    initGame();
  });

  // Speed Multiplier Buttons
  const speedBtns = document.querySelectorAll('.speed-btn');
  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      speedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      speedMultiplier = parseFloat(btn.dataset.speed);
      logDebug(`Speed multiplier updated to: ${speedMultiplier}x`);
      
      // Update global CSS custom property for animations
      document.documentElement.style.setProperty('--speed-multiplier', speedMultiplier);
    });
  });

  // Language English / Indonesian toggle
  document.getElementById('btn-lang-en').addEventListener('click', () => {
    currentLanguage = 'en';
    window.history.replaceState(null, '', '?lang=en');
    logDebug("Language switched to English.");
    updateLanguageUI();
  });

  document.getElementById('btn-lang-id').addEventListener('click', () => {
    currentLanguage = 'id';
    window.history.replaceState(null, '', '?lang=id');
    logDebug("Language switched to Indonesian.");
    updateLanguageUI();
  });
}

// Initialise window
window.addEventListener('DOMContentLoaded', () => {
  // Bind UI buttons
  bindControls();
  
  // Set up game initial state
  initGame();
  
  // Dynamic CSS variables setup
  document.documentElement.style.setProperty('--speed-multiplier', speedMultiplier);
  
  logDebug("Simulation ready. Press 'Start' to begin the animation.");
});
