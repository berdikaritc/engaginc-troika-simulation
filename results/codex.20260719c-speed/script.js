(() => {
  'use strict';

  const ASSET_ROOT = '../../images';
  const CARD_BACK = `${ASSET_ROOT}/cards-back/back.png`;
  const cardPath = name => `${ASSET_ROOT}/cards-front/${encodeURIComponent(name)}.png`;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const randomWait = () => 100 + Math.random() * 1700;
  const lang = new URLSearchParams(location.search).get('lang') === 'id' ? 'id' : 'en';
  document.documentElement.lang = lang;

  const text = {
    en: { draw: 'Draw', hand: 'Hand', reserve: 'Reserve', play: 'Play', flip: 'FLIP', flipReserve: 'FLIP RESERVE', win: p => `${p} WINS`, tie: 'DRAW' },
    id: { draw: 'Ambil', hand: 'Tangan', reserve: 'Cadangan', play: 'Main', flip: 'BALIK', flipReserve: 'AMBIL CADANGAN', win: p => `${p} MENANG`, tie: 'SERI' }
  }[lang];
  const translations = {
    fruit: 'BUAH', sports: 'OLAHRAGA', building: 'BANGUNAN', food: 'MAKANAN', gadget: 'GAWAI',
    fashion: 'FESYEN', furniture: 'MEBEL', toy: 'MAINAN', music: 'MUSIK', white: 'PUTIH',
    black: 'HITAM', red: 'MERAH', blue: 'BIRU', green: 'HIJAU', yellow: 'KUNING',
    orange: 'ORANYE', purple: 'UNGU', brown: 'COKELAT'
  };

  const objects = [
    ['grape','fruit','purple'], ['orange','fruit','orange'], ['watermelon','fruit','green'],
    ['golf ball','sports','white'], ['tennis ball','sports','green'], ['basket ball','sports','orange'],
    ['house roof','building','red'], ['tent','building','yellow'], ['pyramid','building','brown'],
    ['cake slice','food','orange'], ['pizza slice','food','yellow'], ['jelly','food','purple'],
    ['handphone','gadget','black'], ['tv','gadget','black'], ['laptop','gadget','red'],
    ['swimming trunk','fashion','blue'], ['cloth hanger','fashion','blue'], ['hat','fashion','purple'],
    ['table','furniture','brown'], ['cupboard','furniture','brown'], ['bed','furniture','white'],
    ['paper airplane','toy','yellow'], ['dice','toy','red'], ['alphabet block','toy','green'],
    ['the triangle','music','white'], ['drum','music','blue'], ['piano','music','black']
  ];
  const cards = objects.flatMap(([object, category, color]) => [1, 2, 3].map(quantity => ({ name: `${quantity}-${object}`, category, color })));
  const shuffle = array => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const ids = ['p1-draw','p1-hand','p1-reserve','p1-play','p1-call','p2-play','p2-reserve','p2-draw','p2-hand','p2-call'];
  const el = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  const result = document.getElementById('result');
  const players = [
    { id: 'p1', label: 'P1', draw: [], hand: [], reserve: [], play: [], busy: false, selectedHandIndex: null, flyingHandIndex: null },
    { id: 'p2', label: 'P2', draw: [], hand: [], reserve: [], play: [], busy: false, selectedHandIndex: null, flyingHandIndex: null }
  ];
  let playFaceUp = false;
  let ended = false;
  let epoch = 0;
  const lockedPlayPiles = new Set();

  function makeCard(card, faceUp = true) {
    const image = document.createElement('img');
    image.className = 'card';
    image.draggable = false;
    image.src = faceUp ? cardPath(card.name) : CARD_BACK;
    image.alt = faceUp ? card.name : 'Card back';
    return image;
  }
  function clearCards(container) { container.querySelectorAll('.card').forEach(card => card.remove()); }
  function renderPlayer(player) {
    const draw = el[`${player.id}-draw`];
    const hand = el[`${player.id}-hand`];
    const reserve = el[`${player.id}-reserve`];
    const play = el[`${player.id}-play`];
    [draw, hand, reserve, play].forEach(clearCards);
    if (player.draw.length) draw.append(makeCard(player.draw.at(-1), false));
    player.hand.forEach((card, index) => {
      if (index === player.flyingHandIndex) return;
      const image = makeCard(card);
      image.style.setProperty('--i', index);
      if (index === player.selectedHandIndex) image.classList.add('selected');
      hand.append(image);
    });
    if (player.reserve.length) reserve.append(makeCard(player.reserve.at(-1), false));
    if (player.play.length) play.append(makeCard(player.play.at(-1), playFaceUp));
    draw.querySelector('.count').textContent = player.draw.length;
    reserve.querySelector('.count').textContent = player.reserve.length;
    play.querySelector('.count').textContent = player.play.length;
  }
  function render() { players.forEach(renderPlayer); }
  function setLabels() {
    for (const player of players) {
      el[`${player.id}-draw`].querySelector('.label').textContent = `${player.label} ${text.draw}`;
      el[`${player.id}-hand`].querySelector('.label').textContent = `${player.label} ${text.hand}`;
      el[`${player.id}-reserve`].querySelector('.label').textContent = `${player.label} ${text.reserve}`;
      el[`${player.id}-play`].querySelector('.label').textContent = `${player.label} ${text.play}`;
    }
  }
  function call(player, value, global = false) {
    const target = el[`${player.id}-call`];
    target.textContent = value;
    target.classList.toggle('global', global);
    target.classList.add('show');
  }
  function clearCalls() { players.forEach(player => el[`${player.id}-call`].classList.remove('show', 'global')); }
  async function announce(value, duration = 2000, persistent = false) {
    players.forEach(player => call(player, value, true));
    if (!persistent) { await sleep(duration); clearCalls(); }
  }
  function matches(card, top) { return card.color === top.color || card.category === top.category; }
  function possibleMoves(player) {
    return player.hand.flatMap((card, handIndex) => players.flatMap((target, targetIndex) =>
      !lockedPlayPiles.has(target.id) && matches(card, target.play.at(-1)) ? [{ handIndex, targetIndex }] : []));
  }
  function calledAttribute(card, top) {
    const choices = [];
    if (card.color === top.color) choices.push(card.color);
    if (card.category === top.category) choices.push(card.category);
    const value = choices[Math.floor(Math.random() * choices.length)];
    return lang === 'id' ? translations[value] : value.toUpperCase();
  }
  function rectFor(container, handIndex = 0) {
    const rect = container.getBoundingClientRect();
    return { left: rect.left + (container.classList.contains('hand') ? handIndex * 33 : 0), top: rect.top };
  }
  async function fly(card, source, destination, handIndex = 0) {
    const start = rectFor(source, handIndex);
    const end = rectFor(destination);
    const image = makeCard(card, true);
    image.classList.add('flying');
    image.style.left = `${start.left}px`;
    image.style.top = `${start.top}px`;
    // An uncached image must be decoded before its initial frame is painted;
    // otherwise browsers can visually skip straight to the final position.
    if (image.decode) await image.decode().catch(() => {});
    document.body.append(image);
    image.getBoundingClientRect();
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    image.style.transform = `translate(${end.left - start.left}px, ${end.top - start.top}px)`;
    await sleep(600);
    image.remove();
  }

  async function takeMove(player, selected, currentEpoch) {
    player.busy = true;
    await sleep(randomWait());
    if (ended || epoch !== currentEpoch) { player.busy = false; return; }
    const valid = possibleMoves(player).find(move => move.handIndex === selected.handIndex && move.targetIndex === selected.targetIndex);
    if (!valid) { player.busy = false; return; }

    const target = players[valid.targetIndex];
    // Reserve the destination before displaying the call. This operation is
    // synchronous, so two racers cannot commit to the same Play Pile.
    lockedPlayPiles.add(target.id);
    const card = player.hand[valid.handIndex];
    call(player, calledAttribute(card, target.play.at(-1)));
    player.selectedHandIndex = valid.handIndex;
    render();
    await sleep(500);
    if (ended || epoch !== currentEpoch) {
      player.selectedHandIndex = null;
      lockedPlayPiles.delete(target.id);
      player.busy = false;
      render();
      return;
    }
    // Keep the source slot hidden in state so concurrent renders by the other
    // player cannot recreate this card while its flying copy is visible.
    player.selectedHandIndex = null;
    player.flyingHandIndex = valid.handIndex;
    render();
    await fly(card, el[`${player.id}-hand`], el[`${target.id}-play`], valid.handIndex);
    if (ended || epoch !== currentEpoch) {
      player.flyingHandIndex = null;
      lockedPlayPiles.delete(target.id);
      player.busy = false;
      render();
      return;
    }
    player.hand.splice(valid.handIndex, 1);
    player.flyingHandIndex = null;
    target.play.push(card);
    render();
    lockedPlayPiles.delete(target.id);

    if (player.draw.length) {
      const drawn = player.draw.pop();
      render();
      await fly(drawn, el[`${player.id}-draw`], el[`${player.id}-hand`]);
      player.hand.push(drawn);
      render();
    }
    player.busy = false;
  }

  function getWinner() { return players.find(player => player.draw.length === 0 && player.hand.length === 0); }
  async function flipReserve() {
    epoch++;
    await sleep(2000);
    if (players.some(player => player.reserve.length === 0)) {
      ended = true;
      await announce(text.tie, 0, true);
      return false;
    }
    await announce(text.flipReserve);
    await sleep(2000);
    const cardsToFlip = players.map(player => player.reserve.pop());
    render();
    await Promise.all(players.map((player, index) => fly(cardsToFlip[index], el[`${player.id}-reserve`], el[`${player.id}-play`])));
    players.forEach((player, index) => player.play.push(cardsToFlip[index]));
    render();
    await sleep(2000);
    return true;
  }
  async function race() {
    while (!ended) {
      const winner = getWinner();
      if (winner) {
        ended = true;
        epoch++;
        clearCalls();
        result.textContent = text.win(winner.label);
        result.classList.add('show');
        return;
      }
      const choices = players.map(possibleMoves);
      if (choices.every(list => list.length === 0) && players.every(player => !player.busy)) {
        clearCalls();
        if (!await flipReserve()) return;
        continue;
      }
      players.forEach((player, index) => {
        if (!player.busy && choices[index].length) {
          const choice = choices[index][Math.floor(Math.random() * choices[index].length)];
          takeMove(player, choice, epoch);
        }
      });
      await sleep(35);
    }
  }
  async function start() {
    setLabels();
    // The game uses 50 ordinary object cards, selected afresh each load.
    const deck = shuffle([...cards]).slice(0, 50);
    players[0].draw = deck.splice(0, 18);
    players[1].draw = deck.splice(0, 18);
    players[0].reserve = deck.splice(0, 6);
    players[1].reserve = deck.splice(0, 6);
    players[0].play = deck.splice(0, 1);
    players[1].play = deck.splice(0, 1);
    players.forEach(player => player.hand.push(...player.draw.splice(-6)));
    render();
    await sleep(2000);
    playFaceUp = true;
    render();
    await announce(text.flip);
    await sleep(2000);
    race();
  }
  start();
})();
