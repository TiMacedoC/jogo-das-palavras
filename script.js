'use strict';

/* ================= Dados ================= */

// Alfabeto sem K, W e Y.
const LETTERS = [...'ABCDEFGHIJLMNOPQRSTUVXZ'];

const GROUPS = [
  {
    name: 'Comida e bebida',
    items: [
      'Frutas', 'Legumes e verduras', 'Doces e sobremesas', 'Bebidas',
      'Comidas de festa junina', 'Sabores de pizza', 'Coisas do café da manhã',
      'Temperos e condimentos', 'Comidas típicas brasileiras', 'Coisas que ficam na geladeira',
      'Salgados e lanches', 'Coisas que se compram no supermercado',
    ],
  },
  {
    name: 'Bichos e natureza',
    items: [
      'Animais', 'Animais marinhos', 'Aves', 'Insetos e outros bichinhos',
      'Animais da fazenda', 'Animais selvagens', 'Flores e plantas', 'Árvores',
      'Coisas da natureza', 'Coisas que aparecem no céu',
    ],
  },
  {
    name: 'Lugares',
    items: [
      'Países', 'Cidades brasileiras', 'Cidades do mundo', 'Lugares da cidade',
      'Cômodos e cantos da casa', 'Coisas que tem na praia', 'Destinos de viagem',
      'Coisas que tem numa escola', 'Coisas que tem num hospital', 'Lojas e estabelecimentos',
    ],
  },
  {
    name: 'Pessoas e personagens',
    items: [
      'Profissões', 'Nomes masculinos', 'Nomes femininos', 'Personagens de desenho animado',
      'Super-heróis e vilões', 'Cantores e bandas', 'Atores e atrizes', 'Jogadores de futebol',
      'Personagens de filmes', 'Personagens históricos', 'Famosos brasileiros',
      'Personagens de contos de fadas',
    ],
  },
  {
    name: 'Objetos',
    items: [
      'Coisas que tem na cozinha', 'Material escolar e de escritório', 'Roupas e acessórios',
      'Ferramentas', 'Coisas que tem no banheiro', 'Brinquedos', 'Instrumentos musicais',
      'Coisas que cabem no bolso', 'Meios de transporte', 'Coisas para levar numa viagem',
      'Eletrodomésticos e eletrônicos', 'Móveis', 'Coisas que têm rodas', 'Coisas que têm botão',
      'Partes de um carro',
    ],
  },
  {
    name: 'Cultura e diversão',
    items: [
      'Filmes', 'Séries', 'Novelas', 'Músicas brasileiras', 'Esportes', 'Jogos e brincadeiras',
      'Videogames', 'Times de futebol', 'Livros', 'Marcas famosas', 'Marcas de carro',
      'Aplicativos e sites', 'Hobbies', 'Ritmos e danças',
    ],
  },
  {
    name: 'Corpo e mente',
    items: [
      'Partes do corpo', 'Doenças e sintomas', 'Sentimentos e emoções',
      'Adjetivos para descrever pessoas', 'Verbos', 'Palavras em inglês',
      'Matérias da escola', 'Cores',
    ],
  },
  {
    name: 'Desafios',
    items: [
      'Coisas que fazem barulho', 'Coisas que voam', 'Coisas amarelas', 'Coisas verdes',
      'Coisas vermelhas', 'Coisas geladas', 'Coisas quentes', 'Coisas redondas',
      'Coisas de metal', 'Coisas para colecionar', 'Coisas de Natal',
      'Coisas de festa de aniversário', 'Coisas de acampamento', 'Coisas com cheiro forte',
      'Coisas grudentas', 'Coisas que quebram fácil', 'Desculpas para chegar atrasado',
      'Coisas que tem numa bolsa', 'Coisas que têm tampa',
    ],
  },
];

const CATEGORIES = GROUPS.flatMap(group => group.items.map(name => ({ name, group: group.name })));

const TIME_MIN = 3;
const TIME_MAX = 60;
const PREFS_KEY = 'roda-das-letras:prefs';     // o index.html lê esta chave para abrir direto na tabela
const HANDOFF_KEY = 'roda-das-letras:rodada';  // leva a rodada de uma página para a outra ao trocar o layout

const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>';
const DONE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* ================= Estado ================= */

const state = {
  duration: 10,     // segundos por vez
  sound: true,
  category: 0,      // índice em CATEGORIES
  drawn: [],        // já sorteadas, para não repetir até passar pela lista toda
  used: new Set(),  // letras confirmadas nesta rodada
  pending: null,    // letra tocada na vez atual, ainda não confirmada
  phase: 'idle',    // idle | running | paused | timeout | done
  turnMs: 10000,    // duração total da vez em andamento
  remaining: 10000, // ms que faltam na vez em andamento
  deadline: 0,
};

let preferredLayout = 'roda'; // roda | grade
let raf = 0;
let lastSecs = 0;
let shuffling = false;
let toastTimer = 0;
let wakeLock = null;

/* ================= Elementos ================= */

const $ = id => document.getElementById(id);

const card = $('card');
const cardGroup = $('card-group');
const cardTitle = $('card-title');
const btnDraw = $('btn-draw');
const btnPick = $('btn-pick');
const btnPause = $('btn-pause');
const btnReset = $('btn-reset');
const btnSound = $('btn-sound');
const btnFullscreen = $('btn-fullscreen');
const btnRules = $('btn-rules');
const timeMinus = $('time-minus');
const timePlus = $('time-plus');
const timeValue = $('time-value');
const freeCount = $('free-count');
const stage = $('stage');
const wheel = $('wheel');   // layout em roda (index.html)
const grid = $('grid');     // layout em grade (grade.html)
const ringBar = $('ring-bar');
const hub = $('hub');
const hubName = hub.dataset.name || 'botão do meio';
const LAYOUT = grid ? 'grade' : 'roda';
const hubMain = $('hub-main');
const hubSub = $('hub-sub');
const toastEl = $('toast');
const picker = $('picker');
const pickerBody = $('picker-body');
const rules = $('rules');
const timeoutOverlay = $('timeout');
const doneOverlay = $('done');

const keyEls = new Map();
const chipEls = [];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ================= Som ================= */

const Sound = (() => {
  let ctx = null;
  let primed = false;

  function context() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  // O navegador só libera áudio dentro de um gesto do usuário (iOS em especial).
  function unlock() {
    const c = context();
    if (!c || primed) return;
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, 22050);
    src.connect(c.destination);
    src.start(0);
    primed = true;
  }

  function tone({ freq, to, type = 'sine', dur = 0.1, gain = 0.2, at = 0 }) {
    if (!state.sound) return;
    const c = context();
    if (!c) return;
    const t = c.currentTime + at;
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  return {
    unlock,
    key: () => tone({ freq: 520, to: 300, type: 'triangle', dur: 0.07, gain: 0.3 }),
    release: () => tone({ freq: 300, to: 520, type: 'triangle', dur: 0.06, gain: 0.2 }),
    pass: () => {
      tone({ freq: 660, dur: 0.1, gain: 0.22 });
      tone({ freq: 990, dur: 0.16, gain: 0.2, at: 0.07 });
    },
    tick: urgent => tone({ freq: urgent ? 1500 : 1100, type: 'square', dur: 0.035, gain: urgent ? 0.1 : 0.04 }),
    deny: () => tone({ freq: 200, to: 150, type: 'square', dur: 0.14, gain: 0.08 }),
    flip: () => tone({ freq: 700 + Math.random() * 500, type: 'triangle', dur: 0.04, gain: 0.08 }),
    land: () => {
      tone({ freq: 784, dur: 0.12, gain: 0.18 });
      tone({ freq: 1175, dur: 0.22, gain: 0.16, at: 0.09 });
    },
    buzz: () => {
      tone({ freq: 140, type: 'sawtooth', dur: 0.9, gain: 0.32 });
      tone({ freq: 147, type: 'square', dur: 0.9, gain: 0.14 });
    },
  };
})();

/* ================= Utilidades ================= */

// Toque responde já no pointerdown, para não perder tempo no relógio.
// O click só é usado quando vem do teclado (detail === 0).
function onTap(el, fn) {
  el.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    el.classList.add('is-down');
    fn();
  });
  const release = () => el.classList.remove('is-down');
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('pointerleave', release);
  el.addEventListener('click', e => { if (e.detail === 0) fn(); });
}

function restartAnimation(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
}

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 1900);
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function roundInProgress() {
  return state.used.size > 0 || state.pending !== null || state.phase === 'running' || state.phase === 'paused';
}

// Ações que apagam a rodada pedem um segundo toque quando há jogo em andamento.
function guardedClick(btn, action) {
  const label = btn.textContent;
  let timer = 0;
  const reset = () => {
    clearTimeout(timer);
    btn.classList.remove('is-confirming');
    btn.textContent = label;
  };
  btn.addEventListener('click', () => {
    if (!roundInProgress() || btn.classList.contains('is-confirming')) {
      reset();
      action();
      return;
    }
    btn.classList.add('is-confirming');
    btn.textContent = 'Confirmar?';
    toast('Isso apaga as letras da rodada. Toque de novo para confirmar');
    timer = setTimeout(reset, 2500);
  });
}

function loadPrefs() {
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    if (Number.isInteger(prefs.duration)) state.duration = Math.min(TIME_MAX, Math.max(TIME_MIN, prefs.duration));
    if (typeof prefs.sound === 'boolean') state.sound = prefs.sound;
    if (prefs.layout === 'roda' || prefs.layout === 'grade') preferredLayout = prefs.layout;
  } catch { /* sem armazenamento: segue com o padrão */ }
}

function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      duration: state.duration,
      sound: state.sound,
      layout: preferredLayout,
    }));
  } catch { /* sem armazenamento */ }
}

// Rodada deixada pela outra página ao trocar o layout. Só vale uma vez.
function takeHandoff() {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    sessionStorage.removeItem(HANDOFF_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function switchLayout(e) {
  const target = e.currentTarget.dataset.layout;
  if (target === LAYOUT) {
    e.preventDefault();
    return;
  }
  preferredLayout = target;
  savePrefs();
  try {
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({
      category: state.category,
      used: [...state.used],
      drawn: state.drawn,
    }));
  } catch { /* sem armazenamento: a outra página começa uma rodada nova */ }
  // O link segue para a outra página normalmente.
}

async function keepAwake() {
  if (wakeLock || !('wakeLock' in navigator) || document.hidden) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch { /* o navegador recusou; a tela pode apagar sozinha */ }
}

/* ================= Montagem ================= */

function buildKeys() {
  const step = 360 / LETTERS.length;
  LETTERS.forEach((letter, i) => {
    const key = document.createElement('button');
    key.type = 'button';
    key.className = 'key';
    key.textContent = letter;
    key.setAttribute('aria-label', `Letra ${letter}`);
    if (wheel) {
      const angle = (i * step - 90) * Math.PI / 180;
      key.style.left = `${50 + 40.5 * Math.cos(angle)}%`;
      key.style.top = `${50 + 40.5 * Math.sin(angle)}%`;
    }
    onTap(key, () => pressKey(letter));
    (wheel || grid).append(key);
    keyEls.set(letter, key);
  });
}

function buildPicker() {
  let index = 0;
  for (const group of GROUPS) {
    const section = document.createElement('section');
    const title = document.createElement('h3');
    title.className = 'group-title';
    title.textContent = group.name;
    const list = document.createElement('div');
    list.className = 'chips';
    for (const name of group.items) {
      const i = index++;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = name;
      chip.addEventListener('click', () => {
        closeOverlay(picker);
        newRound(i);
        landCard();
      });
      list.append(chip);
      chipEls.push(chip);
    }
    section.append(title, list);
    pickerBody.append(section);
  }
  $('picker-count').textContent = CATEGORIES.length;
}

// A roda é sempre quadrada: ocupa o menor lado do espaço disponível.
function fitWheel() {
  const width = stage.clientWidth;
  const height = stage.clientHeight || width;
  const size = Math.max(220, Math.floor(Math.min(width, height) * 0.96));
  wheel.style.setProperty('--w', `${size}px`);
}

/* ================= Desenho ================= */

function render() {
  for (const [letter, key] of keyEls) {
    const used = state.used.has(letter);
    const pending = state.pending === letter;
    key.classList.toggle('is-used', used);
    key.classList.toggle('is-pending', pending);
    key.setAttribute('aria-pressed', String(used || pending));
  }
  freeCount.innerHTML = `${LETTERS.length - state.used.size}<small>/${LETTERS.length}</small>`;
  btnPause.disabled = !(state.phase === 'running' || state.phase === 'paused');
  btnPause.textContent = state.phase === 'paused' ? 'Continuar' : 'Pausar';
  renderTime();
  renderHub();
  renderRing();
}

function renderTime() {
  timeValue.innerHTML = `${state.duration}<small>s</small>`;
  timeMinus.disabled = state.duration <= TIME_MIN;
  timePlus.disabled = state.duration >= TIME_MAX;
}

function renderHub() {
  const secs = Math.ceil(state.remaining / 1000);
  const { phase } = state;
  hub.classList.toggle('is-ready', phase === 'running' && state.pending !== null);
  hub.classList.toggle('is-urgent', phase === 'running' && secs <= 3);
  hubMain.classList.toggle('is-play', phase === 'idle');

  let main = String(secs);
  let sub = '';
  let label = '';
  if (phase === 'idle') {
    main = PLAY_ICON;
    sub = state.used.size ? 'Continuar' : 'Começar';
    label = `${sub} o tempo`;
  } else if (phase === 'running') {
    sub = state.pending ? 'Passar a vez' : 'Escolha a letra';
    label = state.pending ? `Passar a vez, ${secs} segundos restantes` : `${secs} segundos restantes`;
  } else if (phase === 'paused') {
    sub = 'Pausado';
    label = 'Continuar o tempo';
  } else if (phase === 'timeout') {
    main = '0';
    sub = 'Tempo!';
    label = 'Tempo esgotado';
  } else {
    main = DONE_ICON;
    sub = 'Sem letras';
    label = 'Todas as letras foram usadas';
  }
  hubMain.innerHTML = main;
  hubSub.textContent = sub;
  hub.setAttribute('aria-label', label);
}

function renderRing() {
  const fraction = state.phase === 'idle' ? 1 : Math.max(0, state.remaining / state.turnMs);
  hub.style.setProperty('--progress', fraction.toFixed(4));
  if (!ringBar) return;
  ringBar.style.strokeDashoffset = String(100 * (1 - fraction));
  ringBar.classList.toggle('is-urgent', state.phase === 'running' && state.remaining <= 3000);
  ringBar.classList.toggle('is-empty', fraction <= 0);
}

function renderCard() {
  const category = CATEGORIES[state.category];
  cardGroup.textContent = category.group;
  cardTitle.textContent = category.name;
  chipEls.forEach((chip, i) => {
    const current = i === state.category;
    chip.classList.toggle('is-current', current);
    if (current) chip.setAttribute('aria-current', 'true');
    else chip.removeAttribute('aria-current');
  });
}

function landCard() {
  restartAnimation(card, 'is-landed');
  Sound.land();
}

/* ================= Relógio ================= */

function resetClock() {
  state.turnMs = state.duration * 1000;
  state.remaining = state.turnMs;
}

function stopClock(phase) {
  cancelAnimationFrame(raf);
  state.phase = phase;
}

function startTurn() {
  state.turnMs = state.duration * 1000;
  state.remaining = state.turnMs;
  state.deadline = performance.now() + state.turnMs;
  state.pending = null;
  state.phase = 'running';
  lastSecs = state.duration;
  keepAwake();
  render();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}

function loop() {
  if (state.phase !== 'running') return;
  state.remaining = Math.max(0, state.deadline - performance.now());
  if (state.remaining <= 0) {
    timeout();
    return;
  }
  const secs = Math.ceil(state.remaining / 1000);
  if (secs !== lastSecs) {
    lastSecs = secs;
    Sound.tick(secs <= 3);
    renderHub();
    if (secs <= 3) restartAnimation(hubMain, 'is-pop');
  }
  renderRing();
  raf = requestAnimationFrame(loop);
}

function pause() {
  if (state.phase !== 'running') return;
  state.remaining = Math.max(0, state.deadline - performance.now());
  stopClock('paused');
  render();
}

function resume() {
  if (state.phase !== 'paused') return;
  state.deadline = performance.now() + state.remaining;
  state.phase = 'running';
  keepAwake();
  render();
  raf = requestAnimationFrame(loop);
}

function timeout() {
  state.remaining = 0;
  state.pending = null;
  stopClock('timeout');
  Sound.buzz();
  try { navigator.vibrate?.([300, 100, 300]); } catch { /* sem vibração */ }
  render();
  openOverlay(timeoutOverlay);
}

/* ================= Jogada ================= */

function pressHub() {
  Sound.unlock();
  if (shuffling) return;
  switch (state.phase) {
    case 'idle':
      startTurn();
      break;
    case 'paused':
      resume();
      break;
    case 'running':
      if (state.pending) {
        passTurn();
      } else {
        Sound.deny();
        restartAnimation(hub, 'is-nudged');
        toast('Toque numa letra antes de passar a vez');
      }
      break;
    case 'done':
      openOverlay(doneOverlay);
      break;
  }
}

function pressKey(letter) {
  Sound.unlock();
  if (shuffling) return;
  const key = keyEls.get(letter);

  if (state.phase === 'idle') {
    restartAnimation(hub, 'is-nudged');
    toast(`Toque no ${hubName} para começar`);
    return;
  }
  if (state.phase === 'paused') {
    toast(`O tempo está pausado. Toque no ${hubName} para continuar`);
    return;
  }
  if (state.phase !== 'running') return;

  if (state.used.has(letter)) {
    Sound.deny();
    restartAnimation(key, 'is-nudged');
    toast(`A letra ${letter} já foi usada`);
    return;
  }
  if (state.pending === letter) {
    state.pending = null;
    Sound.release();
  } else {
    state.pending = letter;
    Sound.key();
  }
  render();
}

function passTurn() {
  state.used.add(state.pending);
  state.pending = null;
  Sound.pass();
  if (state.used.size === LETTERS.length) {
    stopClock('done');
    render();
    openOverlay(doneOverlay);
    return;
  }
  startTurn();
}

function newRound(index) {
  stopClock('idle');
  state.category = index;
  state.used.clear();
  state.pending = null;
  resetClock();
  renderCard();
  render();
}

function resetLetters() {
  stopClock('idle');
  state.used.clear();
  state.pending = null;
  resetClock();
  render();
}

function draw() {
  if (shuffling) return;
  const others = CATEGORIES.map((_, i) => i).filter(i => i !== state.category);
  let pool = others.filter(i => !state.drawn.includes(i));
  if (!pool.length) {
    state.drawn = [state.category];
    pool = others;
  }
  const pick = randomItem(pool);
  state.drawn.push(pick);

  stopClock('idle');
  state.pending = null;
  render();

  if (reducedMotion.matches) {
    newRound(pick);
    landCard();
    return;
  }

  shuffling = true;
  card.classList.add('is-shuffling');
  let flips = 0;
  const spin = setInterval(() => {
    const preview = randomItem(CATEGORIES);
    cardGroup.textContent = preview.group;
    cardTitle.textContent = preview.name;
    Sound.flip();
    if (++flips < 9) return;
    clearInterval(spin);
    shuffling = false;
    card.classList.remove('is-shuffling');
    newRound(pick);
    landCard();
  }, 70);
}

function setDuration(value) {
  const next = Math.min(TIME_MAX, Math.max(TIME_MIN, value));
  if (next === state.duration) return false;
  state.duration = next;
  if (state.phase === 'idle') resetClock();
  savePrefs();
  render();
  if (state.phase === 'running' || state.phase === 'paused') {
    toast('O novo tempo vale a partir da próxima vez');
  }
  return true;
}

// Segurar o + ou o − repete o passo.
function holdToRepeat(btn, delta) {
  let delay = 0;
  let repeat = 0;
  const stop = () => {
    clearTimeout(delay);
    clearInterval(repeat);
  };
  btn.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    stop();
    setDuration(state.duration + delta);
    delay = setTimeout(() => {
      repeat = setInterval(() => {
        if (!setDuration(state.duration + delta)) stop();
      }, 90);
    }, 450);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => btn.addEventListener(type, stop));
  btn.addEventListener('click', e => { if (e.detail === 0) setDuration(state.duration + delta); });
}

/* ================= Janelas ================= */

function openOverlay(el) {
  el.hidden = false;
  el.querySelector('.btn, .icon-btn')?.focus({ preventScroll: true });
}

function closeOverlay(el) {
  el.hidden = true;
}

function openPicker() {
  pause();
  openOverlay(picker);
  chipEls[state.category]?.scrollIntoView({ block: 'center' });
}

function openRules() {
  pause();
  openOverlay(rules);
}

/* ================= Tela cheia ================= */

const root = document.documentElement;

function isFullscreen() {
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

async function toggleFullscreen() {
  try {
    if (isFullscreen()) {
      await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      await (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
    }
  } catch {
    toast('Este navegador não abriu a tela cheia');
  }
}

/* ================= Início ================= */

function start(hotData = {}) {
  const saved = { ...takeHandoff(), ...hotData };
  loadPrefs();
  buildKeys();
  buildPicker();

  const first = Number.isInteger(saved.category) && CATEGORIES[saved.category]
    ? saved.category
    : Math.floor(Math.random() * CATEGORIES.length);
  state.drawn = Array.isArray(saved.drawn)
    ? saved.drawn.filter(i => Number.isInteger(i) && CATEGORIES[i])
    : [];
  if (!state.drawn.includes(first)) state.drawn.push(first);
  newRound(first);
  if (Array.isArray(saved.used)) {
    saved.used.filter(letter => LETTERS.includes(letter)).forEach(letter => state.used.add(letter));
    render();
  }

  btnSound.setAttribute('aria-pressed', String(state.sound));

  onTap(hub, pressHub);
  guardedClick(btnDraw, draw);
  guardedClick(btnReset, resetLetters);
  btnPick.addEventListener('click', openPicker);
  btnRules.addEventListener('click', openRules);
  document.querySelectorAll('[data-layout]').forEach(link => link.addEventListener('click', switchLayout));
  btnPause.addEventListener('click', () => (state.phase === 'paused' ? resume() : pause()));
  holdToRepeat(timeMinus, -1);
  holdToRepeat(timePlus, 1);

  btnSound.addEventListener('click', () => {
    state.sound = !state.sound;
    btnSound.setAttribute('aria-pressed', String(state.sound));
    savePrefs();
    Sound.key();
  });

  if (!(document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
    btnFullscreen.hidden = true;
  }
  btnFullscreen.addEventListener('click', toggleFullscreen);
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(type =>
    document.addEventListener(type, () => btnFullscreen.classList.toggle('is-active', isFullscreen())));

  $('picker-close').addEventListener('click', () => closeOverlay(picker));
  $('picker-draw').addEventListener('click', () => { closeOverlay(picker); draw(); });
  $('rules-close').addEventListener('click', () => closeOverlay(rules));
  [picker, rules].forEach(overlay => overlay.addEventListener('click', e => {
    if (e.target === overlay) closeOverlay(overlay);
  }));

  $('timeout-next').addEventListener('click', () => { closeOverlay(timeoutOverlay); startTurn(); });
  $('timeout-draw').addEventListener('click', () => { closeOverlay(timeoutOverlay); draw(); });
  $('timeout-stop').addEventListener('click', () => {
    closeOverlay(timeoutOverlay);
    stopClock('idle');
    resetClock();
    render();
  });
  $('done-reset').addEventListener('click', () => { closeOverlay(doneOverlay); resetLetters(); });
  $('done-draw').addEventListener('click', () => { closeOverlay(doneOverlay); draw(); });

  // Libera o áudio no primeiro gesto que o navegador aceita.
  ['pointerup', 'touchend', 'keydown'].forEach(type =>
    document.addEventListener(type, () => Sound.unlock(), { passive: true }));

  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (!picker.hidden || !rules.hidden) {
      if (e.key === 'Escape') { closeOverlay(picker); closeOverlay(rules); }
      return;
    }
    if (!timeoutOverlay.hidden || !doneOverlay.hidden) return;
    const letter = e.key.toUpperCase();
    if (LETTERS.includes(letter)) {
      e.preventDefault();
      pressKey(letter);
    } else if ((e.key === ' ' || e.key === 'Enter') && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      pressHub();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else if (state.phase === 'running' || state.phase === 'paused') keepAwake();
  });

  if (wheel) {
    new ResizeObserver(fitWheel).observe(stage);
    fitWheel();
  }
}

// Quando a página roda como Artifact do Claude, preserva a rodada ao atualizar a página publicada.
window.claude?.hot?.snapshot(() => ({ category: state.category, used: [...state.used] }));
if (window.claude?.hot?.ready) window.claude.hot.ready(start);
else start(window.claude?.hot?.data ?? {});
