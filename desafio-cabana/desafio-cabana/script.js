/* =========================================================
   DESAFIO CABANA — script.js
   Jogo web mobile: 10 fases, 3 tipos de desafio.
   Apenas HTML/CSS/JS puro. Sem dependências externas.

   Organização do arquivo:
     1. DADOS / CONFIG       (ingredientes, fases, recompensas, medalhas)
     2. ESTADO + localStorage
     3. MASCOTE (Guinho em SVG)
     4. UTILITÁRIOS (DOM, fx, toast, confete)
     5. ROTEADOR DE TELAS + HUD
     6. SELEÇÃO DE FASE
     7. MOTOR: Montador (fases 1-3)
     8. MOTOR: Coleta (fases 4-6)
     9. MOTOR: Cabana Rush (fases 7-10)
    10. RECOMPENSAS / RANKING / MEDALHAS
    11. FIM DE FASE (vitória/derrota/prêmio)
    12. INICIALIZAÇÃO
   ========================================================= */

'use strict';

/* =========================================================
   1. DADOS / CONFIG
   ========================================================= */

// Catálogo de ingredientes (emoji + nome). Reutilizado em vários mini-games.
const INGREDIENTS = {
  pao:    { emoji:'🍞', name:'Pão' },
  smash:  { emoji:'🥩', name:'Smash' },
  queijo: { emoji:'🧀', name:'Queijo' },
  bacon:  { emoji:'🥓', name:'Bacon' },
  molho:  { emoji:'🥫', name:'Molho' },
  alface: { emoji:'🥬', name:'Alface' },
  tomate: { emoji:'🍅', name:'Tomate' },
  cebola: { emoji:'🧅', name:'Cebola' },
  picles: { emoji:'🥒', name:'Picles' },
  ovo:    { emoji:'🍳', name:'Ovo' },
};
const INGREDIENT_KEYS = Object.keys(INGREDIENTS);

// Itens do mini-game de coleta (fases 4-6)
const GOOD_ITEMS = [
  { emoji:'🥩', name:'Carne' }, { emoji:'🧀', name:'Queijo' },
  { emoji:'🥓', name:'Bacon' }, { emoji:'🍟', name:'Batata' },
  { emoji:'🍞', name:'Pão' },
];
const BAD_ITEMS = [
  { emoji:'🔥', name:'Queimado' }, { emoji:'🤢', name:'Estragado' },
];

// Cardápio do Cabana Rush (fases 7-10)
const MENU = [
  { id:'classic', emoji:'🍔', name:'Combo Classic' },
  { id:'smash',   emoji:'🍔', name:'Smash Duplo' },
  { id:'bacon',   emoji:'🥓', name:'Bacon Burger' },
  { id:'fritas',  emoji:'🍟', name:'Batata' },
  { id:'coca',    emoji:'🥤', name:'Coca-Cola' },
  { id:'suco',    emoji:'🧃', name:'Suco' },
  { id:'milk',    emoji:'🥛', name:'Milkshake' },
  { id:'sobremesa',emoji:'🍰', name:'Sobremesa' },
];

/* Definição das 10 fases.
   type: 'builder' | 'catcher' | 'rush'
   Cada fase tem parâmetros de dificuldade crescente. */
const LEVELS = [
  // ---- Montador (memória) ----
  { id:1, type:'builder', name:'Montador I',   count:3, memTime:4000 },
  { id:2, type:'builder', name:'Montador II',  count:4, memTime:3500 },
  { id:3, type:'builder', name:'Montador III', count:5, memTime:3000 },
  // ---- Coleta ----
  { id:4, type:'catcher', name:'Coleta I',   goal:8,  lives:3, duration:30, spawn:1100, fallSpeed:2.2, badChance:.20 },
  { id:5, type:'catcher', name:'Coleta II',  goal:12, lives:3, duration:32, spawn:850,  fallSpeed:2.9, badChance:.28 },
  { id:6, type:'catcher', name:'Coleta III', goal:16, lives:2, duration:34, spawn:650,  fallSpeed:3.6, badChance:.34 },
  // ---- Cabana Rush ----
  { id:7,  type:'rush', name:'Cabana Rush I',   clients:4, maxOnScreen:2, patience:14, itemsPerOrder:[1,2] },
  { id:8,  type:'rush', name:'Cabana Rush II',  clients:6, maxOnScreen:2, patience:12, itemsPerOrder:[2,2] },
  { id:9,  type:'rush', name:'Cabana Rush III', clients:8, maxOnScreen:3, patience:10, itemsPerOrder:[2,3] },
  { id:10, type:'rush', name:'Cabana Rush IV',  clients:10,maxOnScreen:3, patience:9,  itemsPerOrder:[3,3] },
];

/* Recompensas mockadas. unlockLevel = fase que desbloqueia.
   couponCode é placeholder para futura emissão real de cupons. */
const REWARDS = [
  { level:1,  emoji:'⭐', title:'10 Pontos Cabana', sub:'Bônus de boas-vindas', couponCode:'CABANA-PTS10' },
  { level:3,  emoji:'🥤', title:'Refil Grátis',     sub:'Refrigerante refil',  couponCode:'CABANA-REFIL' },
  { level:5,  emoji:'🍟', title:'Batata Pequena',   sub:'Acompanhamento grátis',couponCode:'CABANA-FRIES' },
  { level:7,  emoji:'🍰', title:'Sobremesa',        sub:'Sobremesa do dia',    couponCode:'CABANA-DOCE' },
  { level:10, emoji:'🍔', title:'Hambúrguer Grátis',sub:'O prêmio máximo!',    couponCode:'CABANA-FREE' },
];

/* Medalhas (conquistas). check(state) decide se está desbloqueada. */
const MEDALS = [
  { id:'smashes',  emoji:'🥩', title:'Mestre dos Smashes', sub:'Conclua as fases 1 a 3', check:s=>[1,2,3].every(n=>s.completed.includes(n)) },
  { id:'bacon',    emoji:'🥓', title:'Rei do Bacon',       sub:'Conclua as fases 4 a 6', check:s=>[4,5,6].every(n=>s.completed.includes(n)) },
  { id:'atend',    emoji:'⭐', title:'Atendimento Perfeito',sub:'Conclua uma fase Rush sem perder cliente', check:s=>s.flags.perfectRush },
  { id:'lenda',    emoji:'👑', title:'Lenda Cabana',       sub:'Conclua todas as 10 fases', check:s=>s.completed.length>=10 },
];

// Ranking local mockado (jogador entra no meio conforme pontos)
const MOCK_RANKING = [
  { name:'Bruna 🔥', score:980 },
  { name:'Diego 🍔', score:870 },
  { name:'Léo 🥓',   score:760 },
  { name:'Marina ⭐',score:640 },
  { name:'Téo 🧀',   score:520 },
  { name:'Sofia 🥤', score:410 },
];

const XP_PER_LEVEL = 100; // XP necessário por nível de jogador

/* =========================================================
   2. ESTADO + localStorage
   ========================================================= */
const STORAGE_KEY = 'desafio-cabana-v1';

// Estado padrão de um jogador novo
function defaultState(){
  return {
    completed:[],          // ids de fases concluídas
    current:1,             // fase desbloqueada mais alta
    points:0,              // pontos totais
    xp:0,                  // experiência acumulada
    stars:{},              // estrelas por fase {faseId: 1-3}
    rewards:[],            // levels de recompensas desbloqueadas
    flags:{ perfectRush:false }, // marcadores para medalhas
  };
}

let state = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){ return Object.assign(defaultState(), JSON.parse(raw)); }
  }catch(e){ console.warn('Falha ao ler progresso:', e); }
  return defaultState();
}

function saveState(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch(e){ console.warn('Falha ao salvar progresso:', e); }
}

function resetState(){
  state = defaultState();
  saveState();
}

// Nível do jogador derivado do XP
function playerLevel(){ return Math.floor(state.xp / XP_PER_LEVEL) + 1; }
function xpProgressPct(){ return (state.xp % XP_PER_LEVEL) / XP_PER_LEVEL * 100; }

/* =========================================================
   3. MASCOTE (Guinho em SVG)
   Hambúrguer "andante" com sinais de paz e tênis rosa.
   Função retorna a string SVG para reutilização.
   ========================================================= */
function guinhoSVG(){
  return `
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-label="Guinho, mascote da Cabana">
    <ellipse cx="100" cy="186" rx="46" ry="9" fill="rgba(0,0,0,.4)"/>
    <!-- perna esquerda + tênis rosa -->
    <path d="M78 132 q-10 22 -18 30" stroke="#c98a3a" stroke-width="10" fill="none" stroke-linecap="round"/>
    <ellipse cx="58" cy="168" rx="20" ry="12" fill="#e23b8a" stroke="#111" stroke-width="3"/>
    <!-- perna direita + tênis rosa -->
    <path d="M122 132 q12 18 24 22" stroke="#c98a3a" stroke-width="10" fill="none" stroke-linecap="round"/>
    <ellipse cx="150" cy="160" rx="20" ry="12" fill="#e23b8a" stroke="#111" stroke-width="3"/>
    <!-- braço esquerdo com sinal de paz -->
    <path d="M52 96 q-22 -6 -30 -22" stroke="#c98a3a" stroke-width="9" fill="none" stroke-linecap="round"/>
    <circle cx="20" cy="70" r="11" fill="#d99a4a" stroke="#111" stroke-width="3"/>
    <!-- braço direito com sinal de paz -->
    <path d="M148 96 q22 -6 30 -22" stroke="#c98a3a" stroke-width="9" fill="none" stroke-linecap="round"/>
    <circle cx="180" cy="70" r="11" fill="#d99a4a" stroke="#111" stroke-width="3"/>
    <!-- base do pão -->
    <path d="M45 128 q55 22 110 0 l-6 -14 q-49 16 -98 0 z" fill="#c98a3a" stroke="#111" stroke-width="3"/>
    <!-- recheios -->
    <path d="M44 116 q56 16 112 0 q-6 10 -16 10 q-40 8 -80 0 q-10 0 -16 -10z" fill="#5a3a1a"/>
    <path d="M42 108 q58 14 116 0 q-8 9 -20 9 l-76 0 q-12 0 -20 -9z" fill="#7fbf3f" stroke="#111" stroke-width="1"/>
    <rect x="48" y="100" width="104" height="10" rx="4" fill="#f5b324" transform="skewY(-1)"/>
    <path d="M50 100 q50 -10 100 0 q-6 6 -14 6 l-72 0 q-8 0 -14 -6z" fill="#d23a2e"/>
    <!-- topo do pão -->
    <path d="M44 96 q56 -64 112 0 q-56 18 -112 0z" fill="#d99a4a" stroke="#111" stroke-width="3"/>
    <!-- gergelim -->
    <g fill="#fff3d6">
      <ellipse cx="80" cy="70" rx="3" ry="2" transform="rotate(20 80 70)"/>
      <ellipse cx="105" cy="60" rx="3" ry="2" transform="rotate(-15 105 60)"/>
      <ellipse cx="120" cy="78" rx="3" ry="2" transform="rotate(30 120 78)"/>
      <ellipse cx="92" cy="84" rx="3" ry="2"/>
    </g>
    <!-- olhos -->
    <ellipse cx="88" cy="86" rx="9" ry="10" fill="#fff" stroke="#111" stroke-width="2"/>
    <ellipse cx="114" cy="86" rx="9" ry="10" fill="#fff" stroke="#111" stroke-width="2"/>
    <circle cx="90" cy="88" r="4" fill="#111"/>
    <circle cx="116" cy="88" r="4" fill="#111"/>
    <!-- sobrancelhas confiantes -->
    <path d="M80 74 q8 -4 16 -1" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M108 73 q8 -3 16 1" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <!-- sorriso -->
    <path d="M92 100 q9 8 18 0" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </svg>`;
}

/* =========================================================
   4. UTILITÁRIOS
   ========================================================= */
const $  = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const rand = (min,max) => Math.random()*(max-min)+min;
const randInt = (min,max) => Math.floor(rand(min,max+1));
const pick = arr => arr[Math.floor(Math.random()*arr.length)];

// Embaralha uma cópia do array (Fisher–Yates)
function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

// Toast rápido de feedback
function toast(msg, kind=''){
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 1600);
}

// Confete de comemoração
function confetti(amount=40){
  const fx = $('#fx');
  const colors = ['#f5b324','#ffd66b','#d23a2e','#ffffff','#3fbf6f'];
  for(let i=0;i<amount;i++){
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = rand(0,100)+'vw';
    c.style.background = pick(colors);
    c.style.animationDuration = rand(1.4,2.8)+'s';
    c.style.animationDelay = rand(0,.4)+'s';
    fx.appendChild(c);
    setTimeout(()=>c.remove(), 3200);
  }
}

/* =========================================================
   5. ROTEADOR DE TELAS + HUD
   ========================================================= */
let activeGame = null; // referência ao jogo em execução (para limpar timers)

function showScreen(id){
  // Encerra qualquer jogo ativo ao sair da tela de jogo
  if(id !== 'game' && activeGame){ activeGame.destroy(); activeGame = null; }
  $$('.screen').forEach(s=>s.classList.remove('active'));
  $('#screen-'+id).classList.add('active');
  // HUD só aparece fora da tela inicial
  $('#hud').classList.toggle('hidden', id==='home');
  renderHUD();
  // Renderizações específicas por tela
  if(id==='levels')  renderLevels();
  if(id==='rewards') renderRewards();
  if(id==='ranking') renderRanking();
  if(id==='medals')  renderMedals();
}

function renderHUD(){
  $('#hudPoints').textContent = state.points;
  $('#hudLevel').textContent  = playerLevel();
  $('#xpFill').style.width = xpProgressPct() + '%';
}

/* =========================================================
   6. SELEÇÃO DE FASE
   ========================================================= */
const TYPE_LABEL = { builder:'Montar', catcher:'Coletar', rush:'Atender' };

function renderLevels(){
  const grid = $('#levelGrid');
  grid.innerHTML = '';
  LEVELS.forEach(lv=>{
    const done     = state.completed.includes(lv.id);
    const unlocked = lv.id <= state.current;
    const card = document.createElement('div');
    card.className = 'level-card ' + (done?'done':unlocked?'unlocked':'locked');
    const stars = state.stars[lv.id] || 0;
    card.innerHTML = `
      <span class="lv-num">${lv.id}</span>
      <span class="lv-type">${TYPE_LABEL[lv.type]}</span>
      <span class="lv-stars">${'★'.repeat(stars)}</span>`;
    if(unlocked) card.addEventListener('click', ()=>startLevel(lv.id));
    grid.appendChild(card);
  });
  // Barra de progresso global
  const pct = state.completed.length/LEVELS.length*100;
  $('#globalProgress').style.width = pct+'%';
  $('#progressLabel').textContent = `${state.completed.length} / ${LEVELS.length} concluídas`;
}

// Inicia a fase escolhida, escolhendo o motor correto
function startLevel(id){
  const lv = LEVELS.find(l=>l.id===id);
  if(!lv || id > state.current) return;
  showScreen('game');
  $('#gameTitle').textContent = `Fase ${lv.id} · ${lv.name}`;
  $('#gameArea').innerHTML = '';
  $('#gameControls').innerHTML = '';
  $('#gameStats').innerHTML = '';
  if(lv.type==='builder') activeGame = new BuilderGame(lv);
  if(lv.type==='catcher') activeGame = new CatcherGame(lv);
  if(lv.type==='rush')    activeGame = new RushGame(lv);
  activeGame.start();
}

/* =========================================================
   7. MOTOR: Montador (fases 1-3) — memória de ingredientes
   ========================================================= */
class BuilderGame{
  constructor(lv){
    this.lv = lv;
    this.timers = [];
    // Sequência-alvo: N ingredientes aleatórios (pode repetir tipos? não, mais claro sem repetir)
    this.target = shuffle(INGREDIENT_KEYS).slice(0, lv.count);
    this.picked = [];
  }
  // helper para registrar timers e limpá-los depois
  after(fn, ms){ const t=setTimeout(fn,ms); this.timers.push(t); return t; }

  start(){ this.showBriefing(); }

  // Mostra o pedido por alguns segundos com contagem regressiva
  showBriefing(){
    const area = $('#gameArea');
    const secs = Math.ceil(this.lv.memTime/1000);
    area.innerHTML = `
      <div class="briefing" id="brief">
        <h3>Memorize o pedido!</h3>
        <div class="order-display">${this.target.map(k=>this.ingHTML(k)).join('')}</div>
        <div class="countdown-num" id="cd">${secs}</div>
      </div>`;
    let n = secs;
    const tick = ()=>{
      n--;
      if(n>0){ $('#cd').textContent = n; $('#cd').style.animation='none'; void $('#cd').offsetWidth; $('#cd').style.animation='pop .8s ease'; this.after(tick,1000); }
      else { this.startSelection(); }
    };
    this.after(tick, 1000);
  }

  ingHTML(key, cls=''){
    const ing = INGREDIENTS[key];
    return `<div class="ingredient ${cls}" data-key="${key}">
      <span>${ing.emoji}</span><span class="ing-name">${ing.name}</span></div>`;
  }

  // Fase de seleção: jogador toca os ingredientes na ordem
  startSelection(){
    const area = $('#gameArea');
    // Opções = alvo + alguns distratores, embaralhados
    const distractors = shuffle(INGREDIENT_KEYS.filter(k=>!this.target.includes(k)))
                        .slice(0, Math.min(3, INGREDIENT_KEYS.length-this.lv.count));
    const options = shuffle([...this.target, ...distractors]);
    area.innerHTML = `
      <div class="builder-hint">Toque os ingredientes na <b>ordem do pedido</b></div>
      <div class="build-stack" id="stack"></div>
      <div class="builder-tray" id="tray">${options.map(k=>this.ingHTML(k)).join('')}</div>`;
    $('#gameStats').innerHTML = `<span class="chip" id="builderProg">0/${this.target.length}</span>`;
    $$('#tray .ingredient').forEach(el=>{
      el.addEventListener('click', ()=>this.choose(el));
    });
  }

  choose(el){
    const key = el.dataset.key;
    const idx = this.picked.length;
    if(key === this.target[idx]){
      // Acerto parcial
      this.picked.push(key);
      el.classList.add('correct');
      this.after(()=>el.classList.remove('correct'), 400);
      const stack = $('#stack');
      const item = document.createElement('div');
      item.className = 'stack-item';
      item.textContent = `${INGREDIENTS[key].emoji} ${INGREDIENTS[key].name}`;
      stack.appendChild(item);
      $('#builderProg').textContent = `${this.picked.length}/${this.target.length}`;
      if(this.picked.length === this.target.length){
        // Montou tudo certo!
        confetti(50);
        this.after(()=>finishLevel(this.lv, { win:true, score: 30 + this.lv.count*10, stars:3 }), 500);
      }
    } else {
      // Errou a ordem → recomeça seleção
      el.classList.add('wrong');
      toast('Ordem errada! Tente de novo 🍔', 'bad');
      this.picked = [];
      this.after(()=>{ this.startSelection(); }, 700);
    }
  }

  destroy(){ this.timers.forEach(clearTimeout); this.timers=[]; }
}

/* =========================================================
   8. MOTOR: Coleta (fases 4-6) — itens caindo
   ========================================================= */
class CatcherGame{
  constructor(lv){
    this.lv = lv;
    this.collected = 0;
    this.lives = lv.lives;
    this.timeLeft = lv.duration;
    this.playerX = 50;          // posição em % (centro)
    this.items = [];            // {el,x,y,bad}
    this.raf = null;
    this.spawnTimer = null;
    this.clockTimer = null;
    this.running = false;
    this.held = 0;              // direção mantida: -1, 0, 1
  }

  start(){
    const area = $('#gameArea');
    area.innerHTML = `<div class="catcher-stage" id="stage">
        <div class="player-basket" id="player">🍔</div>
      </div>`;
    $('#gameStats').innerHTML = `
      <span class="chip" id="cCount">0/${this.lv.goal}</span>
      <span class="chip lives" id="cLives">${'❤'.repeat(this.lives)}</span>
      <span class="chip" id="cTime">${this.timeLeft}s</span>`;
    // Controles esquerda/direita
    $('#gameControls').innerHTML = `
      <button class="ctrl-btn" id="left">◀</button>
      <button class="ctrl-btn" id="right">▶</button>`;
    this.bindControls();
    this.stage = $('#stage');
    this.player = $('#player');
    this.running = true;
    // Loop de spawn
    this.spawnTimer = setInterval(()=>this.spawn(), this.lv.spawn);
    // Relógio
    this.clockTimer = setInterval(()=>{
      this.timeLeft--;
      $('#cTime').textContent = this.timeLeft+'s';
      if(this.timeLeft<=0) this.end();
    }, 1000);
    // Loop de animação
    this.lastT = performance.now();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  bindControls(){
    const press = dir => { this.held = dir; };
    const release = () => { this.held = 0; };
    const L=$('#left'), R=$('#right');
    // Suporte a toque e mouse
    ['touchstart','mousedown'].forEach(ev=>{
      L.addEventListener(ev, e=>{e.preventDefault();press(-1);});
      R.addEventListener(ev, e=>{e.preventDefault();press(1);});
    });
    ['touchend','mouseup','mouseleave','touchcancel'].forEach(ev=>{
      L.addEventListener(ev, release);
      R.addEventListener(ev, release);
    });
    // Teclado (desktop)
    this.keyHandler = e=>{
      if(e.key==='ArrowLeft') this.held=-1;
      if(e.key==='ArrowRight') this.held=1;
    };
    this.keyUpHandler = e=>{ if(e.key==='ArrowLeft'||e.key==='ArrowRight') this.held=0; };
    window.addEventListener('keydown', this.keyHandler);
    window.addEventListener('keyup', this.keyUpHandler);
  }

  spawn(){
    if(!this.running) return;
    const bad = Math.random() < this.lv.badChance;
    const item = bad ? pick(BAD_ITEMS) : pick(GOOD_ITEMS);
    const el = document.createElement('div');
    el.className = 'falling';
    el.textContent = item.emoji;
    const x = rand(5,85);
    el.style.left = x+'%';
    el.style.top = '-40px';
    this.stage.appendChild(el);
    this.items.push({ el, x, y:-40, bad });
  }

  loop(t){
    if(!this.running) return;
    const dt = (t - this.lastT)/16.67; // normaliza ~60fps
    this.lastT = t;

    // Move jogador
    if(this.held){ this.playerX = Math.max(4, Math.min(88, this.playerX + this.held*2.4*dt)); }
    this.player.style.left = this.playerX+'%';

    const h = this.stage.clientHeight;
    const catchY = h - 60; // altura aproximada do "prato"

    for(let i=this.items.length-1;i>=0;i--){
      const it = this.items[i];
      it.y += this.lv.fallSpeed*dt;
      it.el.style.transform = `translateY(${it.y}px)`;
      // Colisão simples por proximidade horizontal + altura
      if(it.y >= catchY && it.y <= catchY+40){
        if(Math.abs(it.x - this.playerX) < 11){
          this.collect(it);
          this.items.splice(i,1);
          it.el.remove();
          continue;
        }
      }
      // Saiu da tela
      if(it.y > h+40){ it.el.remove(); this.items.splice(i,1); }
    }
    this.raf = requestAnimationFrame(this.loop);
  }

  collect(it){
    if(it.bad){
      this.lives--;
      $('#cLives').textContent = '❤'.repeat(Math.max(0,this.lives));
      toast('-1 vida! 🤢','bad');
      if(this.lives<=0) return this.end();
    } else {
      this.collected++;
      $('#cCount').textContent = `${this.collected}/${this.lv.goal}`;
      if(this.collected>=this.lv.goal){ confetti(50); this.end(true); }
    }
  }

  end(forceWin){
    if(!this.running) return;
    this.running = false;
    this.cleanup();
    const win = forceWin || this.collected >= this.lv.goal;
    if(win){
      const stars = this.lives>=this.lv.lives?3:this.lives>=2?2:1;
      finishLevel(this.lv, { win:true, score: this.collected*5 + this.lives*10, stars });
    } else {
      finishLevel(this.lv, { win:false });
    }
  }

  cleanup(){
    cancelAnimationFrame(this.raf);
    clearInterval(this.spawnTimer);
    clearInterval(this.clockTimer);
    window.removeEventListener('keydown', this.keyHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
  }

  destroy(){ this.running=false; this.cleanup(); }
}

/* =========================================================
   9. MOTOR: Cabana Rush (fases 7-10) — atendimento
   ========================================================= */
class RushGame{
  constructor(lv){
    this.lv = lv;
    this.served = 0;          // clientes atendidos com sucesso
    this.lost = 0;            // clientes perdidos (impaciência/erro)
    this.spawned = 0;         // clientes que já apareceram
    this.clients = [];        // clientes ativos na tela
    this.selectedClient = null;
    this.tray = [];           // itens montados no momento
    this.tickTimer = null;
    this.spawnTimer = null;
    this.running = false;
    this.nextId = 1;
  }

  start(){
    const area = $('#gameArea');
    area.innerHTML = `
      <div class="rush-clients" id="clients"></div>
      <div class="rush-selected" id="rushSel">Toque em um cliente para atendê-lo</div>
      <div class="rush-tray" id="tray"></div>
      <div class="rush-menu" id="menu">
        ${MENU.map(m=>`<button class="menu-btn" data-id="${m.id}">
          <span class="m-emoji">${m.emoji}</span><span>${m.name}</span></button>`).join('')}
      </div>`;
    $('#gameControls').innerHTML = `
      <button class="btn btn-success" id="serveBtn" style="flex:1">✅ Entregar pedido</button>
      <button class="btn btn-ghost" id="clearBtn">🗑️</button>`;
    $('#gameStats').innerHTML = `
      <span class="chip" id="rServed">0/${this.lv.clients}</span>
      <span class="chip lives" id="rLost">😡 0</span>`;

    // Eventos do cardápio
    $$('#menu .menu-btn').forEach(b=>b.addEventListener('click',()=>this.addItem(b.dataset.id)));
    $('#serveBtn').addEventListener('click',()=>this.serve());
    $('#clearBtn').addEventListener('click',()=>{ this.tray=[]; this.renderTray(); });

    this.running = true;
    this.spawnClient(); // primeiro cliente imediato
    this.spawnTimer = setInterval(()=>this.spawnClient(), Math.max(2500, this.lv.patience*450));
    this.tickTimer = setInterval(()=>this.tick(), 250);
  }

  spawnClient(){
    if(!this.running) return;
    if(this.spawned >= this.lv.clients) return;          // já apareceram todos
    if(this.clients.length >= this.lv.maxOnScreen) return;// tela cheia
    this.spawned++;
    const n = randInt(this.lv.itemsPerOrder[0], this.lv.itemsPerOrder[1]);
    const order = [];
    for(let i=0;i<n;i++) order.push(pick(MENU).id);
    const faces = ['😀','🙂','😋','🤤','😎','🥳'];
    const client = {
      id:this.nextId++, order, patience:this.lv.patience, max:this.lv.patience,
      face:pick(faces), el:null, served:false,
    };
    this.clients.push(client);
    this.renderClients();
  }

  renderClients(){
    const wrap = $('#clients');
    wrap.innerHTML = '';
    this.clients.forEach(c=>{
      const card = document.createElement('div');
      card.className = 'client-card' + (this.selectedClient===c.id?' angry-none':'');
      if(this.selectedClient===c.id) card.style.borderColor = 'var(--gold)';
      const orderHTML = c.order.map(id=>{
        const m = MENU.find(x=>x.id===id);
        return `${m.emoji} ${m.name}`;
      }).join('<br>');
      card.innerHTML = `
        <div class="client-face">${c.face}</div>
        <div class="client-order">${orderHTML}</div>
        <div class="patience-bar"><div class="patience-fill" style="width:${c.patience/c.max*100}%"></div></div>`;
      card.addEventListener('click',()=>this.selectClient(c.id));
      c.el = card;
      wrap.appendChild(card);
    });
  }

  selectClient(id){
    this.selectedClient = id;
    this.tray = [];
    this.renderTray();
    const c = this.clients.find(x=>x.id===id);
    $('#rushSel').textContent = c ? `Atendendo cliente ${c.face} — monte o pedido` : '';
    this.renderClients();
  }

  addItem(id){
    if(!this.selectedClient){ toast('Escolha um cliente primeiro!','bad'); return; }
    this.tray.push(id);
    this.renderTray();
  }

  renderTray(){
    const tray = $('#tray');
    if(!this.tray.length){ tray.innerHTML = '<span class="rush-selected">Bandeja vazia</span>'; return; }
    tray.innerHTML = this.tray.map(id=>{
      const m = MENU.find(x=>x.id===id);
      return `<span class="tray-chip">${m.emoji} ${m.name}</span>`;
    }).join('');
  }

  serve(){
    if(!this.selectedClient){ toast('Escolha um cliente!','bad'); return; }
    const c = this.clients.find(x=>x.id===this.selectedClient);
    if(!c) return;
    // Compara pedido (sem ordem) com a bandeja
    const want = c.order.slice().sort().join(',');
    const got  = this.tray.slice().sort().join(',');
    if(want===got){
      c.served = true;
      this.served++;
      $('#rServed').textContent = `${this.served}/${this.lv.clients}`;
      confetti(20);
      toast('Pedido certo! 🎉','good');
      this.removeClient(c.id);
      if(this.served >= this.lv.clients) return this.end(true);
    } else {
      toast('Pedido errado! 😬','bad');
      // penalidade: cliente perde paciência mais rápido
      c.patience = Math.max(1, c.patience-2);
    }
    this.tray = [];
    this.selectedClient = null;
    $('#rushSel').textContent = 'Toque em um cliente para atendê-lo';
    this.renderTray();
    this.renderClients();
  }

  removeClient(id){
    const c = this.clients.find(x=>x.id===id);
    if(c && c.el){ c.el.classList.add('served'); }
    this.clients = this.clients.filter(x=>x.id!==id);
    if(this.selectedClient===id) this.selectedClient=null;
    this.renderClients();
  }

  tick(){
    if(!this.running) return;
    let needRender = false;
    this.clients.forEach(c=>{
      c.patience -= 0.25;
      const fill = c.el && c.el.querySelector('.patience-fill');
      if(fill){
        const pct = Math.max(0, c.patience/c.max*100);
        fill.style.width = pct+'%';
        fill.style.background = pct<30?'var(--red)':pct<60?'var(--gold)':'var(--green)';
        if(pct<30) c.el.classList.add('angry');
      }
    });
    // Clientes que perderam a paciência
    const expired = this.clients.filter(c=>c.patience<=0);
    expired.forEach(c=>{
      this.lost++;
      $('#rLost').textContent = `😡 ${this.lost}`;
      toast('Cliente foi embora! 😡','bad');
      this.removeClient(c.id);
    });
    // Fim: todos os clientes da fase já passaram e nenhum ativo
    if(this.spawned>=this.lv.clients && this.clients.length===0){
      this.end(this.served >= Math.ceil(this.lv.clients*0.7));
    }
    // Perdeu muitos clientes → derrota
    if(this.lost > Math.floor(this.lv.clients*0.3)){
      this.end(false);
    }
  }

  end(win){
    if(!this.running) return;
    this.running=false;
    this.cleanup();
    if(win){
      // Medalha "Atendimento Perfeito" se não perdeu ninguém
      if(this.lost===0){ state.flags.perfectRush = true; }
      const stars = this.lost===0?3:this.lost<=1?2:1;
      finishLevel(this.lv, { win:true, score:this.served*15 + (this.lost===0?30:0), stars });
    } else {
      finishLevel(this.lv, { win:false });
    }
  }

  cleanup(){ clearInterval(this.tickTimer); clearInterval(this.spawnTimer); }
  destroy(){ this.running=false; this.cleanup(); }
}

/* =========================================================
   10. RECOMPENSAS / RANKING / MEDALHAS
   ========================================================= */
function renderRewards(){
  const list = $('#rewardList');
  list.innerHTML = '';
  REWARDS.forEach(r=>{
    const unlocked = state.rewards.includes(r.level);
    const card = document.createElement('div');
    card.className = 'reward-card ' + (unlocked?'unlocked':'locked');
    card.innerHTML = `
      <span class="r-emoji">${r.emoji}</span>
      <div class="r-info">
        <div class="r-title">${r.title}</div>
        <div class="r-sub">${r.sub} · Fase ${r.level}</div>
      </div>
      <span class="badge ${unlocked?'badge-unlocked':'badge-locked'}">${unlocked?'Liberado':'Bloqueado'}</span>`;
    if(unlocked){
      card.style.cursor='pointer';
      card.addEventListener('click',()=>showReward(r));
    }
    list.appendChild(card);
  });
}

function renderRanking(){
  const list = $('#rankingList');
  // Insere o jogador no ranking mockado conforme pontuação
  const me = { name:'Você 🍔', score:state.points, me:true };
  const all = [...MOCK_RANKING, me].sort((a,b)=>b.score-a.score);
  list.innerHTML = '';
  all.forEach((r,i)=>{
    const row = document.createElement('div');
    row.className = 'rank-row' + (r.me?' me':'');
    row.innerHTML = `
      <span class="r-pos">${i+1}º</span>
      <span class="r-name">${r.name}</span>
      <span class="r-score">${r.score} pts</span>`;
    list.appendChild(row);
  });
}

function renderMedals(){
  const list = $('#medalList');
  list.innerHTML = '';
  MEDALS.forEach(m=>{
    const got = m.check(state);
    const card = document.createElement('div');
    card.className = 'medal-card ' + (got?'unlocked':'locked');
    card.innerHTML = `
      <span class="m-emoji">${m.emoji}</span>
      <div class="m-info">
        <div class="m-title">${m.title}</div>
        <div class="m-sub">${m.sub}</div>
      </div>
      <span class="badge ${got?'badge-unlocked':'badge-locked'}">${got?'Conquistada':'Bloqueada'}</span>`;
    list.appendChild(card);
  });
}

/* =========================================================
   11. FIM DE FASE (vitória/derrota/prêmio)
   ========================================================= */
function finishLevel(lv, result){
  if(activeGame){ activeGame.destroy(); activeGame=null; }

  if(!result.win){
    showOverlay({
      icon:'😵', title:'Quase lá!', text:'Você não bateu a meta. Bora tentar de novo?',
      buttons:[
        { label:'🔄 Tentar de novo', cls:'btn-primary', action:()=>{ hideOverlay(); startLevel(lv.id); } },
        { label:'Voltar às fases', cls:'btn-ghost', action:()=>{ hideOverlay(); showScreen('levels'); } },
      ]
    });
    return;
  }

  // ----- Vitória: atualiza estado -----
  const firstTime = !state.completed.includes(lv.id);
  if(firstTime) state.completed.push(lv.id);
  // melhor estrela
  state.stars[lv.id] = Math.max(state.stars[lv.id]||0, result.stars||1);
  // pontos e XP
  state.points += result.score||0;
  state.xp += (result.score||0) + (firstTime?30:0);
  // desbloqueia próxima fase
  if(lv.id === state.current && state.current < LEVELS.length){ state.current++; }

  // recompensa associada a esta fase?
  const reward = REWARDS.find(r=>r.level===lv.id);
  if(reward && !state.rewards.includes(reward.level)) state.rewards.push(reward.level);

  saveState();
  renderHUD();
  confetti(60);

  // Botões de continuidade
  const nextExists = lv.id < LEVELS.length;
  const buttons = [];
  if(nextExists){
    buttons.push({ label:'➡️ Próxima fase', cls:'btn-primary', action:()=>{ hideOverlay(); startLevel(lv.id+1); } });
  } else {
    buttons.push({ label:'🏆 Ver ranking', cls:'btn-primary', action:()=>{ hideOverlay(); showScreen('ranking'); } });
  }
  buttons.push({ label:'Mapa de fases', cls:'btn-ghost', action:()=>{ hideOverlay(); showScreen('levels'); } });

  showOverlay({
    icon: lv.id===10?'👑':'🎉',
    title: lv.id===10?'LENDA CABANA!':'Fase concluída!',
    text: `+${result.score} pontos · ${'★'.repeat(result.stars||1)}`,
    reward,
    buttons,
  });

  // Checa medalhas recém-conquistadas
  checkNewMedals();
}

let _knownMedals = MEDALS.filter(m=>m.check(state)).map(m=>m.id);
function checkNewMedals(){
  MEDALS.forEach(m=>{
    if(m.check(state) && !_knownMedals.includes(m.id)){
      _knownMedals.push(m.id);
      setTimeout(()=>toast(`🏅 Medalha: ${m.title}!`,'good'), 800);
    }
  });
}

/* ---------- Overlay genérico ---------- */
function showOverlay({icon,title,text,reward,buttons}){
  $('#overlayIcon').textContent = icon||'';
  $('#overlayTitle').textContent = title||'';
  $('#overlayText').textContent = text||'';
  const rEl = $('#overlayReward');
  if(reward){
    rEl.classList.remove('hidden');
    rEl.innerHTML = `
      <div class="or-emoji">${reward.emoji}</div>
      <div class="or-title">🎁 ${reward.title}</div>
      <div class="r-sub" style="color:var(--gold-soft);font-size:12px">${reward.sub}</div>
      <div class="or-code">Cupom (demo): ${reward.couponCode}</div>`;
  } else {
    rEl.classList.add('hidden'); rEl.innerHTML='';
  }
  const bWrap = $('#overlayButtons');
  bWrap.innerHTML = '';
  (buttons||[]).forEach(b=>{
    const btn = document.createElement('button');
    btn.className = 'btn ' + (b.cls||'btn-ghost');
    btn.textContent = b.label;
    btn.addEventListener('click', b.action);
    bWrap.appendChild(btn);
  });
  $('#overlay').classList.remove('hidden');
}
function hideOverlay(){ $('#overlay').classList.add('hidden'); }

function showReward(r){
  showOverlay({
    icon:r.emoji, title:r.title, text:r.sub, reward:r,
    buttons:[{ label:'Fechar', cls:'btn-primary', action:hideOverlay }]
  });
}

/* =========================================================
   12. INICIALIZAÇÃO
   ========================================================= */
function init(){
  // Injeta o mascote na tela inicial
  const mh = $('#mascot-home');
  mh.innerHTML = guinhoSVG();
  mh.classList.add('mascot-bounce');

  // Delegação de cliques para botões com data-action
  document.body.addEventListener('click', e=>{
    const btn = e.target.closest('[data-action]');
    if(!btn) return;
    const a = btn.dataset.action;
    if(a==='play')    showScreen('levels');
    if(a==='home')    showScreen('home');
    if(a==='rewards') showScreen('rewards');
    if(a==='ranking') showScreen('ranking');
    if(a==='medals')  showScreen('medals');
  });

  // Botão início no HUD
  $('#btnHome').addEventListener('click',()=>showScreen('home'));

  // Reiniciar progresso
  $('#btnReset').addEventListener('click',()=>{
    if(confirm('Apagar todo o progresso e recomeçar?')){
      resetState();
      _knownMedals = [];
      renderHUD();
      toast('Progresso reiniciado!','good');
    }
  });

  renderHUD();
  showScreen('home');
}

document.addEventListener('DOMContentLoaded', init);
