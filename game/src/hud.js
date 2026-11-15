// HUD: DOM + canvas minimap. Top bar, killfeed, radio, health/armour/cash, weapon,
// grenades, crosshair, hitmarker, damage direction, banner, buy menu, scoreboard.
export class HUD {
  constructor(map) {
    this.map = map;
    this.el = {};
    const mk = (tag, cls, parent) => { const e = document.createElement(tag); e.className = cls; (parent || document.body).appendChild(e); return e; };
    const root = mk('div', 'hud'); this.root = root;
    this.el.topbar = mk('div', 'topbar', root);
    this.el.topbar.innerHTML = `<div class="tb-team ember"><span class="tb-name">EMBER</span><span class="tb-score" id="scoreE">0</span><span class="tb-pips" id="pipsE"></span></div>
      <div class="tb-mid"><div class="tb-time" id="roundTime">1:40</div><div class="tb-round" id="roundLabel">ROUND 1 OF 12</div><div class="tb-obj" id="objective">PLANT AT SITE A</div></div>
      <div class="tb-team slate"><span class="tb-pips" id="pipsS"></span><span class="tb-score" id="scoreS">0</span><span class="tb-name">SLATE</span></div>`;
    this.el.minimap = mk('div', 'minimap', root);
    this.el.minimap.innerHTML = `<canvas id="mm" width="176" height="132"></canvas><div class="mm-label">CINDERLINE YARD</div>`;
    this.mm = this.el.minimap.querySelector('#mm').getContext('2d');
    this.el.killfeed = mk('div', 'killfeed', root);
    this.el.radio = mk('div', 'radio', root);
    this.el.threat = mk('div', 'threat', root);
    this.el.crosshair = mk('div', 'crosshair', root);
    this.el.crosshair.innerHTML = '<i class="ch t"></i><i class="ch b"></i><i class="ch l"></i><i class="ch r"></i><i class="ch dot"></i>';
    this.el.hitmarker = mk('div', 'hitmarker', root);
    this.el.hitmarker.innerHTML = '<i></i><i></i><i></i><i></i>';
    this.el.dmg = mk('div', 'dmg', root);
    this.el.banner = mk('div', 'banner', root);
    this.el.bl = mk('div', 'bl', root);
    this.el.bl.innerHTML = `<div class="stat"><label>HEALTH</label><b id="hp">100</b><div class="bar"><i id="hpBar"></i></div></div>
      <div class="stat"><label>ARMOUR</label><b id="ar">100</b><div class="bar"><i id="arBar"></i></div></div>
      <div class="stat cash"><label>CASH</label><b id="cash">$800</b></div>`;
    this.el.br = mk('div', 'br', root);
    this.el.br.innerHTML = `<div class="wname" id="wname">LONGSHOT AR</div>
      <div class="ammo"><b id="ammo">30</b><span id="reserve">/ 90</span></div>
      <div class="slots" id="slots"></div>
      <div class="nades" id="nades"></div>`;
    this.el.buy = mk('div', 'buy hidden', root);
    this.el.buy.innerHTML = `<div class="buy-title">BUY PHASE — <span id="buyTime">15</span>s &nbsp;·&nbsp; CASH <b id="buyCash">$800</b></div>
      <div class="buy-grid" id="buyGrid"></div>
      <div class="buy-hint">[B] close · click or press 1–6 to buy · armour &amp; grenades below</div>`;
    this.el.score = mk('div', 'score hidden', root);
    this.el.menu = mk('div', 'menu', root);
    this.el.menu.innerHTML = `<div class="menu-card">
      <div class="menu-kicker">MAKE.FUN · THREE.JS TACTICAL FPS</div>
      <h1>CINDERLINE<br>YARD</h1>
      <div class="menu-sub">5v5 round-based · plant / defuse · buy economy</div>
      <div class="menu-teams"><span class="ember">EMBER — attack</span><span class="vs">VS</span><span class="slate">SLATE — defend</span></div>
      <button id="startBtn">▶ DEPLOY — CLICK TO PLAY</button>
      <div class="menu-controls">WASD move · Mouse aim · SHIFT sprint · C crouch · RMB aim-down-sights<br>R reload · B buy · 1–3 weapons · 4 smoke · 5 frag · TAB scoreboard · G drop bomb</div>
      <label class="menu-sens">Sensitivity <input id="sens" type="range" min="0.4" max="2.4" step="0.1" value="1"> <span id="sensV">1.0</span></label>
      </div>`;
    this.el.end = mk('div', 'end hidden', root);
    this.kills = []; this.radios = [];
    this._buildBuy();
  }
  _buildBuy() {
    const items = [
      ['1', 'LONGSHOT AR', '$2700', '30-rnd rifle · high damage'],
      ['2', 'HORNET SMG', '$1500', 'fast · close quarters'],
      ['3', 'WREN-9 PISTOL', '$700', 'sidearm · reliable'],
      ['4', 'KEVLAR + HELMET', '$1000', 'armour 100'],
      ['5', 'FRAG GRENADE', '$300', 'explosive · 90 dmg radius'],
      ['6', 'SMOKE GRENADE', '$300', 'vision block · 12s'],
    ];
    this.el.buy.querySelector('#buyGrid').innerHTML = items.map(([k, n, p, d]) =>
      `<div class="buy-item" data-k="${k}"><b>${k}</b><span class="bi-n">${n}</span><span class="bi-p">${p}</span><span class="bi-d">${d}</span></div>`).join('');
  }
  setScore(e, s) {
    this.el.topbar.querySelector('#scoreE').textContent = e;
    this.el.topbar.querySelector('#scoreS').textContent = s;
    const pips = (n, col) => Array.from({ length: 7 }, (_, i) => `<i class="${i < n ? 'on ' + col : ''}"></i>`).join('');
    this.el.topbar.querySelector('#pipsE').innerHTML = pips(e, 'ember');
    this.el.topbar.querySelector('#pipsS').innerHTML = pips(s, 'slate');
  }
  setTime(sec, round, obj) {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    this.el.topbar.querySelector('#roundTime').textContent = `${m}:${String(s).padStart(2, '0')}`;
    this.el.topbar.querySelector('#roundLabel').textContent = `ROUND ${round} OF 12`;
    this.el.topbar.querySelector('#objective').textContent = obj;
  }
  setVitals(hp, ar, cash) {
    this.el.bl.querySelector('#hp').textContent = Math.max(0, Math.ceil(hp));
    this.el.bl.querySelector('#hpBar').style.width = clamp0(hp) + '%';
    this.el.bl.querySelector('#hpBar').style.background = hp > 50 ? '#7ee787' : hp > 25 ? '#ffb224' : '#ff5a3c';
    this.el.bl.querySelector('#ar').textContent = Math.max(0, Math.ceil(ar));
    this.el.bl.querySelector('#arBar').style.width = clamp0(ar) + '%';
    this.el.bl.querySelector('#cash').textContent = '$' + cash;
    const bc = this.el.buy.querySelector('#buyCash'); if (bc) bc.textContent = '$' + cash;
  }
  setWeapon(name, mag, reserve, slots, nades) {
    this.el.br.querySelector('#wname').textContent = name;
    this.el.br.querySelector('#ammo').textContent = mag;
    this.el.br.querySelector('#reserve').textContent = '/ ' + reserve;
    this.el.br.querySelector('#slots').innerHTML = slots.map((s, i) =>
      `<span class="${s.cur ? 'cur' : ''}">${i + 1} ${s.name}</span>`).join('');
    this.el.br.querySelector('#nades').innerHTML = nades.map(n =>
      `<span>${n.key} ${n.name} ${n.n}</span>`).join('') + '<span>Kit</span>';
  }
  setCrosshairGap(px, ads) {
    this.root.style.setProperty('--ch', (ads ? 3 : px) + 'px');
  }
  hitmark(head) {
    const h = this.el.hitmarker;
    h.classList.remove('show', 'hs'); void h.offsetWidth;
    h.classList.add('show'); if (head) h.classList.add('hs');
    setTimeout(() => h.classList.remove('show'), 180);
  }
  damageDir(angleDeg) {
    const d = this.el.dmg;
    d.style.setProperty('--rot', angleDeg + 'deg');
    d.classList.remove('show'); void d.offsetWidth; d.classList.add('show');
    setTimeout(() => d.classList.remove('show'), 700);
  }
  killfeedAdd(killer, victim, weapon, head) {
    const line = document.createElement('div');
    line.className = 'kf';
    line.innerHTML = `<span class="kf-k">${killer}</span> <span class="kf-w">${weapon}${head ? ' ⌖ HS' : ''}</span> <span class="kf-v">${victim}</span>`;
    this.el.killfeed.prepend(line);
    while (this.el.killfeed.children.length > 5) this.el.killfeed.lastChild.remove();
    setTimeout(() => { line.style.opacity = '0'; setTimeout(() => line.remove(), 600); }, 6000);
  }
  radioAdd(name, text) {
    const line = document.createElement('div');
    line.className = 'rd';
    line.innerHTML = `<b>RADIO</b> ${name}: ${text}`;
    this.el.radio.prepend(line);
    while (this.el.radio.children.length > 3) this.el.radio.lastChild.remove();
    setTimeout(() => { line.style.opacity = '0'; setTimeout(() => line.remove(), 600); }, 7000);
  }
  threat(text) { this.el.threat.textContent = text; this.el.threat.style.opacity = text ? '1' : '0'; }
  banner(main, sub, ms = 2600) {
    this.el.banner.innerHTML = `<div class="bn-main">${main}</div><div class="bn-sub">${sub}</div>`;
    this.el.banner.classList.add('show');
    clearTimeout(this._bt);
    this._bt = setTimeout(() => this.el.banner.classList.remove('show'), ms);
  }
  showBuy(show, secs) {
    this.el.buy.classList.toggle('hidden', !show);
    if (show) this.el.buy.querySelector('#buyTime').textContent = secs;
  }
  showScore(show, rows) {
    this.el.score.classList.toggle('hidden', !show);
    if (!show) return;
    const row = r => `<tr class="${r.you ? 'you' : ''} ${r.team}"><td>${r.name}</td><td>${r.k}</td><td>${r.a}</td><td>${r.d}</td><td>${r.hs}</td><td>${r.dmg}</td><td>$${r.cash}</td></tr>`;
    this.el.score.innerHTML = `<div class="sc-title">SCOREBOARD — CINDERLINE YARD</div>
      <table><tr><th>PLAYER</th><th>K</th><th>A</th><th>D</th><th>HS</th><th>DMG</th><th>CASH</th></tr>
      ${rows.filter(r => r.team === 'ember').map(row).join('')}
      <tr class="sep"><td colspan="7">SLATE — DEFEND</td></tr>
      ${rows.filter(r => r.team === 'slate').map(row).join('')}</table>`;
  }
  showMenu(show) { this.el.menu.classList.toggle('hidden', !show); }
  showEnd(show, title, sub) {
    this.el.end.classList.toggle('hidden', !show);
    if (show) this.el.end.innerHTML = `<div class="end-card"><h2>${title}</h2><div>${sub}</div><button onclick="location.reload()">↻ PLAY AGAIN</button></div>`;
  }
  drawMinimap(player, allies, enemies, bombSite, planted) {
    const g = this.mm, W = 176, H = 132;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(16,20,24,.88)'; g.fillRect(0, 0, W, H);
    const sx = W / 64, sz = H / 48, X = x => (x + 32) * sx, Z = z => (z + 24) * sz;
    // ground
    g.fillStyle = '#2c2f33'; g.fillRect(2, 2, W - 4, H - 4);
    // rails
    g.strokeStyle = '#8a7a55'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, Z(-6)); g.lineTo(W, Z(-6)); g.moveTo(0, Z(6)); g.lineTo(W, Z(6)); g.stroke();
    // walls / cover
    g.fillStyle = '#565b60';
    for (const r of this.map.wallRects) g.fillRect(X(r.x - r.w / 2), Z(r.z - r.d / 2), Math.max(2, r.w * sx), Math.max(2, r.d * sz));
    // water tower
    g.fillStyle = '#b0483a'; g.beginPath(); g.arc(X(-22), Z(-14), 5, 0, 7); g.fill();
    // sites
    g.font = 'bold 13px Arial'; g.textAlign = 'center';
    g.fillStyle = '#ffd23e'; g.fillText('A', X(-22), Z(-11) + 4);
    g.fillText('B', X(20), Z(11) + 4);
    if (planted) { g.fillStyle = '#ff5a3c'; g.beginPath(); g.arc(X(bombSite.x), Z(bombSite.z), 4, 0, 7); g.fill(); }
    // dots
    const dot = (x, z, col, r = 3) => { g.fillStyle = col; g.beginPath(); g.arc(X(x), Z(z), r, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.stroke(); };
    for (const b of allies) if (b.alive) dot(b.pos.x, b.pos.z, '#7ee787');
    for (const b of enemies) if (b.alive && b.seenT > 0) dot(b.pos.x, b.pos.z, '#ff5a3c');
    // player arrow
    if (player) {
      g.save(); g.translate(X(player.pos.x), Z(player.pos.z)); g.rotate(-player.yaw);
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -6); g.lineTo(4.5, 5); g.lineTo(-4.5, 5); g.closePath(); g.fill(); g.restore();
    }
  }
}
function clamp0(v) { return Math.max(0, Math.min(100, v)); }
