// Anak Bos Troika - Card Play Simulation Engine

// State Variables
let simulationData = null;
let allSteps = [];
let currentStepIndex = 0;
let isPlaying = false;
let playbackSpeed = 1.0;
let isStepRunning = false;
let startTimer = null;

// Piles
let p1Hand = [];
let p2Hand = [];
let discardPile = [];

// DOM Card Elements mapping: cardName -> div element
const cards = {};
const highlightedCards = new Set();

// Layout configuration
const CARD_WIDTH = 150;
const CARD_HEIGHT = 233;
const SPACING_HAND = 25; // 1/6 of 150px
const DRAW_X = -200;
const P1_Y = 163.5;
const DISCARD_Y = 483.5;
const P2_Y = 803.5;

// DOM Elements
const gameBoard = document.getElementById('game-board');
const cardsLayer = document.getElementById('cards-layer');
const controlPanel = document.getElementById('control-panel');
const appWrapper = document.querySelector('.app-wrapper');

const simSelector = document.getElementById('sim-selector');
const loadSimBtn = document.getElementById('load-sim-btn');
const playPauseBtn = document.getElementById('play-pause-btn');
const stepPrevBtn = document.getElementById('step-prev-btn');
const stepNextBtn = document.getElementById('step-next-btn');
const restartBtn = document.getElementById('restart-btn');
const speedSlider = document.getElementById('speed-slider');
const speedVal = document.getElementById('speed-val');
const stepsList = document.getElementById('steps-list');

const turnNumEl = document.getElementById('turn-num');
const stepNumEl = document.getElementById('step-num');
const stepSummaryEl = document.getElementById('step-summary');
const progressBar = document.getElementById('progress-bar');

const callOverlay = document.getElementById('call-overlay');
const callSpeaker = document.getElementById('call-speaker');
const callValue = document.getElementById('call-value');

const loadingOverlay = document.getElementById('loading-overlay');
const loaderText = document.getElementById('loader-text');
const loadingProgressBar = document.getElementById('loading-progress-bar');
const statusBadge = document.getElementById('status-badge');
const showControlsTrigger = document.getElementById('show-controls-trigger');
const hideBtn = document.getElementById('hide-btn');

// Utility: Sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms / playbackSpeed));
}

// Get URL parameters
function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

// 1. Initial Entry Point
async function init() {
  const initialSim = getQueryParam('sim') || 'S1';
  simSelector.value = initialSim;
  
  // Set up event listeners
  setupEventListeners();
  
  // Load simulation
  await loadSimulation(initialSim);
}

// 2. Load and Prepare Simulation
async function loadSimulation(simName) {
  if (startTimer) {
    clearTimeout(startTimer);
    startTimer = null;
  }
  isPlaying = false;
  isStepRunning = false;
  playPauseBtn.textContent = 'Start';
  updateStatusDisplay('LOADING');
  
  // Show loading screen
  loadingOverlay.classList.remove('hidden');
  loaderText.textContent = `Fetching simulation '${simName}' data...`;
  loadingProgressBar.style.width = '0%';
  
  try {
    const response = await fetch(`simdata/${simName}/simulation.json`);
    if (!response.ok) {
      throw new Error(`Failed to load simdata/${simName}/simulation.json. Check if folder exists.`);
    }
    
    simulationData = await response.json();
    
    // Process steps into flat array
    allSteps = [];
    simulationData.turns.forEach((turn, turnIdx) => {
      turn.steps.forEach((step, stepIdx) => {
        allSteps.push({
          ...step,
          turnIndex: turnIdx + 1,
          stepIndexInTurn: stepIdx + 1,
          totalStepsInTurn: turn.steps.length
        });
      });
    });
    
    // Find all unique card names
    const uniqueCards = new Set();
    allSteps.forEach(step => {
      if (step.moves) {
        step.moves.forEach(move => {
          uniqueCards.add(move[0]);
        });
      }
    });
    
    const cardsArray = Array.from(uniqueCards);
    loaderText.textContent = `Preloading ${cardsArray.length} card images...`;
    
    // Preload images
    let loadedCount = 0;
    await Promise.all(cardsArray.map(cardName => {
      return new Promise(resolve => {
        const img = new Image();
        img.src = `cards-front/${encodeURIComponent(cardName)}.png`;
        img.onload = () => {
          loadedCount++;
          const percentage = (loadedCount / cardsArray.length) * 100;
          loadingProgressBar.style.width = `${percentage}%`;
          resolve();
        };
        img.onerror = () => {
          console.warn(`Card image not found: cards-front/${cardName}.png`);
          loadedCount++;
          const percentage = (loadedCount / cardsArray.length) * 100;
          loadingProgressBar.style.width = `${percentage}%`;
          resolve(); // Resolve anyway
        };
      });
    }));
    
    // Instantiate Card Elements
    createCardElements(cardsArray);
    
    // Populate Sidebar Steps List
    populateStepsList();
    
    // Hide loading overlay
    loadingOverlay.classList.add('hidden');
    
    // Reset state
    jumpToStep(0);
    
    // Wait for 3.5 seconds, then start playing automatically
    updateStatusDisplay('WAITING (3.5s)');
    let startDelay = 3500;
    
    startTimer = setTimeout(() => {
      startTimer = null;
      isPlaying = true;
      playPauseBtn.textContent = 'Pause';
      updateStatusDisplay('PLAYING');
      runSimulationLoop();
    }, startDelay);
    
  } catch (error) {
    loaderText.textContent = `Error: ${error.message}`;
    loadingProgressBar.style.width = '0%';
    alert(`Error: ${error.message}`);
  }
}

// Create card DOM elements and register them
function createCardElements(cardNames) {
  cardsLayer.innerHTML = '';
  // Reset registry
  for (const prop in cards) delete cards[prop];
  
  cardNames.forEach(cardName => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.style.backgroundImage = `url('cards-front/${encodeURIComponent(cardName)}.png')`;
    // Initial draw pile position
    cardEl.style.transform = `translate(${DRAW_X}px, ${P1_Y}px)`;
    cardEl.style.opacity = '0';
    cardEl.style.display = 'none';
    
    cardsLayer.appendChild(cardEl);
    cards[cardName] = cardEl;
  });
}

// Populate steps list in control panel
function populateStepsList() {
  stepsList.innerHTML = '';
  
  allSteps.forEach((step, idx) => {
    const item = document.createElement('div');
    item.className = 'step-item';
    item.id = `step-item-${idx}`;
    
    const meta = document.createElement('div');
    meta.className = 'step-item-meta';
    meta.textContent = `Turn ${step.turnIndex} • Step ${step.stepIndexInTurn}`;
    
    const summary = document.createElement('div');
    summary.className = 'step-item-summary';
    summary.textContent = step.summary;
    
    item.appendChild(meta);
    item.appendChild(summary);
    
    item.addEventListener('click', () => {
      if (isStepRunning) return; // Prevent clicking while animating
      if (startTimer) {
        clearTimeout(startTimer);
        startTimer = null;
      }
      jumpToStep(idx);
    });
    
    stepsList.appendChild(item);
  });
}

// Setup Event Listeners
function setupEventListeners() {
  // Load simulation button
  loadSimBtn.addEventListener('click', () => {
    const name = simSelector.value.trim();
    if (name) loadSimulation(name);
  });
  
  // Play / Pause button
  playPauseBtn.addEventListener('click', () => {
    if (startTimer) {
      clearTimeout(startTimer);
      startTimer = null;
    }
    
    if (isPlaying) {
      isPlaying = false;
      playPauseBtn.textContent = 'Play';
      updateStatusDisplay('PAUSED');
    } else {
      if (currentStepIndex >= allSteps.length) {
        // Restart from beginning
        jumpToStep(0);
      }
      isPlaying = true;
      playPauseBtn.textContent = 'Pause';
      updateStatusDisplay('PLAYING');
      runSimulationLoop();
    }
  });
  
  // Step Prev Button
  stepPrevBtn.addEventListener('click', () => {
    if (isStepRunning) return;
    if (startTimer) {
      clearTimeout(startTimer);
      startTimer = null;
    }
    if (currentStepIndex > 0) {
      jumpToStep(currentStepIndex - 1);
    }
  });
  
  // Step Next Button
  stepNextBtn.addEventListener('click', () => {
    if (isStepRunning) return;
    if (startTimer) {
      clearTimeout(startTimer);
      startTimer = null;
    }
    if (currentStepIndex < allSteps.length - 1) {
      jumpToStep(currentStepIndex + 1);
    }
  });
  
  // Restart button
  restartBtn.addEventListener('click', () => {
    if (isStepRunning) return;
    if (startTimer) {
      clearTimeout(startTimer);
      startTimer = null;
    }
    jumpToStep(0);
  });
  
  // Speed slider
  speedSlider.addEventListener('input', (e) => {
    playbackSpeed = parseFloat(e.target.value);
    speedVal.textContent = playbackSpeed.toFixed(2);
    // Apply speed to css transition speed custom variable on board
    gameBoard.style.setProperty('--speed', playbackSpeed);
  });
  
  // Hide panel triggers
  hideBtn.addEventListener('click', toggleControlPanel);
  showControlsTrigger.addEventListener('click', toggleControlPanel);
  
  // Hotkey 'H'
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'h') {
      // Don't trigger if typing in text inputs
      if (document.activeElement.tagName !== 'INPUT') {
        toggleControlPanel();
      }
    }
  });
}

function toggleControlPanel() {
  appWrapper.classList.toggle('controls-hidden');
}

// Update floating status badge
function updateStatusDisplay(status) {
  statusBadge.textContent = status.toUpperCase();
  if (status.includes('playing')) {
    statusBadge.style.color = 'var(--accent-blue)';
    statusBadge.style.borderColor = 'rgba(0, 229, 255, 0.3)';
  } else if (status.includes('paused')) {
    statusBadge.style.color = '#fff';
    statusBadge.style.borderColor = 'rgba(255, 255, 255, 0.1)';
  } else if (status.includes('completed')) {
    statusBadge.style.color = 'var(--accent-gold)';
    statusBadge.style.borderColor = 'rgba(255, 215, 0, 0.3)';
  } else {
    statusBadge.style.color = 'rgba(255, 255, 255, 0.5)';
    statusBadge.style.borderColor = 'rgba(255, 255, 255, 0.05)';
  }
}

// 3. Jump to a Specific Step (Fast Forward State instantly)
function jumpToStep(index) {
  if (index < 0 || index >= allSteps.length) return;
  
  isPlaying = false;
  playPauseBtn.textContent = 'Play';
  updateStatusDisplay('PAUSED');
  
  p1Hand = [];
  p2Hand = [];
  discardPile = [];
  highlightedCards.clear();
  
  // Reset all elements
  Object.values(cards).forEach(el => {
    el.style.display = 'none';
    el.style.opacity = '0';
    el.style.transition = 'none';
    el.classList.remove('drawing', 'discarding', 'highlighted');
  });
  
  // Fast forward card movements up to step index
  for (let i = 0; i < index; i++) {
    const step = allSteps[i];
    if (step.moves) {
      step.moves.forEach(([cardName, fromPile, toPile]) => {
        // Update pile arrays
        removeFromPile(cardName, fromPile);
        addToPile(cardName, toPile);
      });
    }
  }
  
  currentStepIndex = index;
  
  // Update step labels on screen
  updateStepUI(allSteps[currentStepIndex]);
  
  // Update layout instantly without animations
  updateLayout(false);
}

function removeFromPile(cardName, pileName) {
  if (pileName === 'P1') p1Hand = p1Hand.filter(c => c !== cardName);
  else if (pileName === 'P2') p2Hand = p2Hand.filter(c => c !== cardName);
  else if (pileName === 'DISCARD') discardPile = discardPile.filter(c => c !== cardName);
}

function addToPile(cardName, pileName) {
  if (pileName === 'P1') p1Hand.push(cardName);
  else if (pileName === 'P2') p2Hand.push(cardName);
  else if (pileName === 'DISCARD') discardPile.push(cardName);
}

// Update dashboard text and step highlights in sidebar
function updateStepUI(step) {
  if (!step) return;
  
  turnNumEl.textContent = step.turnIndex;
  stepNumEl.textContent = `${step.stepIndexInTurn}/${step.totalStepsInTurn}`;
  stepSummaryEl.textContent = step.summary;
  
  // Update progress bar
  const progressPercent = (currentStepIndex / (allSteps.length - 1)) * 100;
  progressBar.style.width = `${progressPercent}%`;
  
  // Update sidebar active item
  document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active'));
  const activeItem = document.getElementById(`step-item-${currentStepIndex}`);
  if (activeItem) {
    activeItem.classList.add('active');
    activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// 4. Main Simulation Auto-Play Loop
async function runSimulationLoop() {
  while (currentStepIndex < allSteps.length && isPlaying) {
    const step = allSteps[currentStepIndex];
    
    updateStepUI(step);
    
    // Execute step animations
    await executeStep(step);
    
    if (!isPlaying) break; // If paused during execution
    
    currentStepIndex++;
    
    if (currentStepIndex >= allSteps.length) {
      isPlaying = false;
      playPauseBtn.textContent = 'Restart';
      updateStatusDisplay('completed');
      break;
    }
    
    // Delay before the next step starts: 2 seconds
    updateStatusDisplay('waiting next step');
    await sleep(2000);
    
    if (isPlaying) {
      updateStatusDisplay('PLAYING');
    }
  }
}

// 5. Execute Step Animations
async function executeStep(step) {
  isStepRunning = true;
  const moves = step.moves || [];
  
  if (step.call) {
    // DISCARD GROUP STEP WITH CALL
    gameBoard.className = 'game-board mode-discarding';
    
    // A. Highlight only the cards in the player's hand that are being discarded
    const discardedCards = moves.filter(m => m[1] === 'P1' || m[1] === 'P2').map(m => m[0]);
    
    discardedCards.forEach(c => highlightedCards.add(c));
    updateLayout(true); // Redraw with highlights
    
    // B. Display the call text for 3 seconds
    const speaker = step.call.includes('P1') ? 'PLAYER 1 CALLS' : (step.call.includes('P2') ? 'PLAYER 2 CALLS' : 'CALL ANNOUNCED');
    const callVal = step.call.replace(/P[12] CALLS:\s*/i, '');
    
    callSpeaker.textContent = speaker;
    callValue.textContent = callVal;
    callOverlay.classList.add('active');
    
    await sleep(3000); // 3 seconds overlay display
    
    callOverlay.classList.remove('active');
    
    // Remove highlights as they start moving
    discardedCards.forEach(c => highlightedCards.delete(c));
    
    // C. Move cards to discard pile one by one (sequential delay: 0.75 seconds)
    for (let i = 0; i < moves.length; i++) {
      const [cardName, fromPile, toPile] = moves[i];
      
      // Update state
      removeFromPile(cardName, fromPile);
      addToPile(cardName, toPile);
      
      // Update card transition class
      const el = cards[cardName];
      if (el) {
        el.className = 'card discarding';
      }
      
      updateLayout(true);
      
      await sleep(750); // Each card starts moving 0.75s after the previous
    }
    
    // Wait for the final card to finish its transition (0.75s total duration)
    await sleep(750);
    
  } else {
    // DRAW STEP (Or normal move step without call)
    gameBoard.className = 'game-board mode-drawing';
    
    // Move cards with stagger (stagger interval: 200ms)
    for (let i = 0; i < moves.length; i++) {
      const [cardName, fromPile, toPile] = moves[i];
      
      // If card is drawn from DRAW, prepare it offscreen first
      if (fromPile === 'DRAW') {
        initDrawingCard(cardName, toPile);
      }
      
      removeFromPile(cardName, fromPile);
      addToPile(cardName, toPile);
      
      const el = cards[cardName];
      if (el) {
        el.className = 'card drawing';
      }
      
      updateLayout(true);
      
      await sleep(200); // Stagger interval of 200ms between draws
    }
    
    // Wait for the final card to land (1.5s total duration minus last stagger)
    await sleep(1500);
  }
  
  isStepRunning = false;
}

// 6. Prepares drawing card position offscreen on the left
function initDrawingCard(cardName, toPile) {
  const el = cards[cardName];
  if (!el) return;
  
  // Align Y coordinate to match destination pile for horizontal entry
  let startY = P1_Y;
  if (toPile === 'P2') {
    startY = P2_Y;
  } else if (toPile === 'DISCARD') {
    startY = DISCARD_Y;
  }
  
  el.style.transition = 'none';
  el.classList.remove('drawing', 'discarding', 'highlighted');
  
  // Position offscreen on the left, set translucent
  el.style.transform = `translate(${DRAW_X}px, ${startY}px)`;
  el.style.opacity = '0';
  el.style.display = 'block';
  el.style.zIndex = '1000'; // Make drawing card overlap other cards
  
  // Force browser layout reflow
  void el.offsetWidth;
  
  // Fade in
  el.style.opacity = '1';
}

// 7. Calculate layouts and update card transform values
function updateLayout(animate = true) {
  // Update Player 1 Hand layout
  p1Hand.forEach((cardName, index) => {
    const el = cards[cardName];
    if (!el) return;
    
    if (!animate) {
      el.style.transition = 'none';
      el.className = 'card';
    }
    el.style.display = 'block';
    el.style.opacity = '1';
    
    const N = p1Hand.length;
    const W = (N - 1) * SPACING_HAND + CARD_WIDTH;
    const startX = (720 - W) / 2;
    
    const isHighlighted = highlightedCards.has(cardName);
    const x = startX + index * SPACING_HAND;
    const y = isHighlighted ? (P1_Y - 30) : P1_Y;
    const scaleStr = isHighlighted ? ' scale(1.08)' : '';
    const rotateStr = isHighlighted ? ' rotate(2deg)' : '';
    
    el.style.transform = `translate(${x}px, ${y}px)${scaleStr}${rotateStr}`;
    el.style.zIndex = isHighlighted ? (200 + index) : (10 + index);
    
    if (isHighlighted) {
      el.classList.add('highlighted');
    } else {
      el.classList.remove('highlighted');
    }
  });
  
  // Update Player 2 Hand layout
  p2Hand.forEach((cardName, index) => {
    const el = cards[cardName];
    if (!el) return;
    
    if (!animate) {
      el.style.transition = 'none';
      el.className = 'card';
    }
    el.style.display = 'block';
    el.style.opacity = '1';
    
    const N = p2Hand.length;
    const W = (N - 1) * SPACING_HAND + CARD_WIDTH;
    const startX = (720 - W) / 2;
    
    const isHighlighted = highlightedCards.has(cardName);
    const x = startX + index * SPACING_HAND;
    const y = isHighlighted ? (P2_Y - 30) : P2_Y;
    const scaleStr = isHighlighted ? ' scale(1.08)' : '';
    const rotateStr = isHighlighted ? ' rotate(-2deg)' : '';
    
    el.style.transform = `translate(${x}px, ${y}px)${scaleStr}${rotateStr}`;
    el.style.zIndex = isHighlighted ? (200 + index) : (10 + index);
    
    if (isHighlighted) {
      el.classList.add('highlighted');
    } else {
      el.classList.remove('highlighted');
    }
  });
  
  // Update Discard Pile layout
  const M = discardPile.length;
  let discardSpacing = SPACING_HAND; // ~1/6 card width (25px)
  
  if (M >= 20) {
    discardSpacing = 15; // ~1/10 card width (15px)
  } else if (M >= 12) {
    discardSpacing = 18.75; // ~1/8 card width (18.75px)
  }
  
  discardPile.forEach((cardName, index) => {
    const el = cards[cardName];
    if (!el) return;
    
    if (!animate) {
      el.style.transition = 'none';
      el.className = 'card';
    }
    el.style.display = 'block';
    el.style.opacity = '1';
    
    const W = (M - 1) * discardSpacing + CARD_WIDTH;
    const startX = (720 - W) / 2;
    const x = startX + index * discardSpacing;
    const y = DISCARD_Y;
    
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.style.zIndex = 10 + index;
    el.classList.remove('highlighted');
  });
}

// Run engine initialization
window.addEventListener('DOMContentLoaded', init);
