// Сайт «Deutsch». Всё содержимое лежит в папке content:
//   content/index.json — список разделов, тем и страниц (меню сайта), названия на трёх языках
//   content/<язык>/<раздел>/<страница>.md — сами страницы (uk — главный, ru и en — переводы)
// Чтобы добавить страницу, нужны три .md-файла и строчка о ней в index.json.

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const bust = '?t=' + Date.now(); // чтобы телефон не показывал старую версию

// ---------- язык ----------
const LANGS = ['uk', 'ru', 'en'];
let LANG = 'uk';
try { const l = localStorage.getItem('lang'); if (LANGS.includes(l)) LANG = l; } catch (e) {}

const UI = {
  uk: { home: 'Головна', open: 'Відкрити', recent: 'Нещодавно додано', updated: 'Оновлено', prev: '← Назад', next: 'Далі →', onPage: 'На сторінці',
        empty: 'Тут поки порожньо.', soon: 'Поки порожньо:', about: 'Як влаштований сайт', search: 'Пошук…', nothing: 'Нічого не знайдено',
        missing: 'Файл сторінки не знайдено.', notfound: 'Сторінку не знайдено', toHome: 'На головну', loadFail: 'Не вдалося завантажити сайт',
        theme: 'Світла або темна тема', menu: 'Меню',
        types: { rule: 'Правило', phr: 'Фрази', fix: 'Розбір помилок', word: 'Слова' }, one: 'сторінка', few: 'сторінки', many: 'сторінок' },
  ru: { home: 'Главная', open: 'Открыть', recent: 'Недавно добавлено', updated: 'Обновлено', prev: '← Назад', next: 'Дальше →', onPage: 'На странице',
        empty: 'Здесь пока пусто.', soon: 'Пока пусто:', about: 'Как устроен сайт', search: 'Поиск…', nothing: 'Ничего не найдено',
        missing: 'Файл страницы не найден.', notfound: 'Страница не найдена', toHome: 'На главную', loadFail: 'Не удалось загрузить сайт',
        theme: 'Светлая или тёмная тема', menu: 'Меню',
        types: { rule: 'Правило', phr: 'Фразы', fix: 'Разбор ошибок', word: 'Слова' }, one: 'страница', few: 'страницы', many: 'страниц' },
  en: { home: 'Home', open: 'Open', recent: 'Recently added', updated: 'Updated', prev: '← Back', next: 'Next →', onPage: 'On this page',
        empty: 'Nothing here yet.', soon: 'Still empty:', about: 'How the site works', search: 'Search…', nothing: 'Nothing found',
        missing: 'Page file not found.', notfound: 'Page not found', toHome: 'Back to home', loadFail: 'Could not load the site',
        theme: 'Light or dark theme', menu: 'Menu',
        types: { rule: 'Rule', phr: 'Phrases', fix: 'Mistakes', word: 'Words' }, one: 'page', few: 'pages', many: 'pages' },
};
const T = () => UI[LANG];

// Названия в index.json лежат как {uk, ru, en}; выбираем нужный язык (если нет — украинский)
function localize(v) {
  if (Array.isArray(v)) return v.map(localize);
  if (v && typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.includes('uk') && keys.every((k) => LANGS.includes(k))) return v[LANG] || v.uk || '';
    const out = {};
    for (const k of keys) out[k] = localize(v[k]);
    return out;
  }
  return v;
}

let RAW = null;
let INDEX = null;
const pageCache = {};
let searchReady = null;

async function getPage(slug) {
  const key = LANG + '/' + slug;
  if (!(key in pageCache)) {
    let r = await fetch('content/' + key + '.md' + bust);
    if (!r.ok && LANG !== 'uk') r = await fetch('content/uk/' + slug + '.md' + bust); // нет перевода — показываем украинский
    pageCache[key] = r.ok ? await r.text() : null;
  }
  return pageCache[key];
}

// Тема видна в меню, если она не скрытая и в ней есть хотя бы одна страница
const visGroups = (s) => s.groups.filter((g) => !g.hidden && g.pages.length);

// all = true — вместе со скрытыми страницами (нужно, чтобы они открывались по ссылке)
function allPages(all) {
  const out = [];
  for (const s of INDEX.sections)
    for (const g of all ? s.groups : visGroups(s))
      for (const p of g.pages) out.push({ section: s, group: g, page: p });
  return out;
}

function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}

const plural = (n) => {
  const t = T();
  if (LANG === 'en') return n === 1 ? t.one : t.many;
  return n % 10 === 1 && n % 100 !== 11 ? t.one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? t.few : t.many;
};
const countPages = (s) => visGroups(s).reduce((a, g) => a + g.pages.length, 0);

// ---------- кирпичики ----------
const TYPE_CLASS = { rule: 't-rule', phr: 't-phr', fix: 't-fix', word: 't-word' };
const badge = (t) => (t ? `<span class="badge ${TYPE_CLASS[t] || ''}">${esc(T().types[t] || t)}</span>` : '');

function pageCard(p, where, sid) {
  return `<a class="pcard" ${sid ? `data-s="${sid}"` : ''} href="#/${p.slug}">
    <div class="pcard-top">${badge(p.type)}${where ? `<span class="pcard-where">${esc(where)}</span>` : ''}</div>
    <div class="pcard-title">${esc(p.title)}</div>
    <div class="pcard-desc">${esc(p.desc || '')}</div>
    <div class="pcard-go">${T().open} <span aria-hidden="true">→</span></div>
  </a>`;
}

function moduleBlock(g) {
  return `<section class="module">
    <div class="module-head">
      <span class="module-icon">${g.icon || ''}</span>
      <div class="module-text"><div class="module-title">${esc(g.title)}</div><div class="module-desc">${esc(g.desc || '')}</div></div>
      <span class="module-count">${g.pages.length}</span>
    </div>
    <div class="pgrid">${g.pages.map((p) => pageCard(p)).join('')}</div>
  </section>`;
}

// ---------- меню ----------
function renderTabs(sectionId) {
  $('tabs').innerHTML = INDEX.sections
    .map((s) => `<a href="#/${s.id}" class="${s.id === sectionId ? 'active' : ''}">${esc(s.short || s.title)}</a>`)
    .join('');
}

function renderSidebar(sectionId, slug) {
  let html = `<a class="side-home ${!sectionId ? 'active' : ''}" href="#/">🏠 ${T().home}</a>`;
  for (const s of INDEX.sections) {
    const current = s.id === sectionId;
    html += `<a class="side-section ${current && !slug ? 'active' : ''}" href="#/${s.id}"><span>${s.icon || ''} ${esc(s.short || s.title)}</span><span class="side-count">${countPages(s)}</span></a>`;
    // темы показываем у открытого раздела, а на главной — у обоих
    if (sectionId && !current) continue;
    for (const g of visGroups(s)) {
      html += `<div class="side-group">${esc(g.title)}</div>`;
      html += g.pages.map((p) => `<a class="side-page ${p.slug === slug ? 'active' : ''}" href="#/${p.slug}">${esc(p.title)}</a>`).join('');
    }
  }
  html += `<a class="side-about" href="#/deutsch/o-sajte">${T().about}</a>`;
  $('sidebar').innerHTML = html;
}

function renderCrumbs(parts) {
  let html = `<a href="#/" aria-label="${T().home}">🏠</a>`;
  parts.forEach((p, i) => {
    html += `<span class="sep">›</span>`;
    html += i === parts.length - 1 ? `<span class="here">${esc(p.title)}</span>` : p.href ? `<a href="${p.href}">${esc(p.title)}</a>` : `<span>${esc(p.title)}</span>`;
  });
  $('crumbs').innerHTML = parts.length ? html : '';
}

// ---------- экраны ----------
function showHome() {
  document.title = INDEX.title;
  renderTabs(null);
  renderSidebar(null, null);
  renderCrumbs([]);
  $('toc').innerHTML = '';
  const cards = INDEX.sections
    .map((s) => {
      const n = countPages(s);
      const topics = visGroups(s).map((g) => `<span class="chip">${g.icon || ''} ${esc(g.title)}</span>`).join('');
      return `<a class="bigcard" data-s="${s.id}" href="#/${s.id}">
        <div class="bigcard-icon">${s.icon || ''}</div>
        <div class="bigcard-title">${esc(s.title)}</div>
        <div class="bigcard-desc">${esc(s.description || '')}</div>
        <div class="chips">${topics}</div>
        <div class="bigcard-foot"><span>${n} ${plural(n)}</span><span class="pcard-go">${T().open} <span aria-hidden="true">→</span></span></div>
      </a>`;
    })
    .join('');
  const recent = allPages()
    .filter((x) => x.page.updated)
    .sort((a, b) => b.page.updated.localeCompare(a.page.updated))
    .slice(0, 4);
  const recentHtml = recent.length
    ? `<div class="block-title">${T().recent}</div><div class="pgrid">${recent.map((x) => pageCard(x.page, x.section.short || x.section.title, x.section.id)).join('')}</div>`
    : '';
  $('doc').className = 'doc wide';
  $('doc').innerHTML = `<div class="hero"><h1>${esc(INDEX.title)}</h1><p>${esc(INDEX.subtitle || '')}</p></div><div class="bigcards">${cards}</div>${recentHtml}`;
}

function showSection(s) {
  document.title = s.title + ' — Deutsch';
  renderTabs(s.id);
  renderSidebar(s.id, null);
  renderCrumbs([{ title: s.short || s.title }]);
  $('toc').innerHTML = '';
  const groups = visGroups(s);
  const soon = s.groups.filter((g) => !g.hidden && !g.pages.length);
  let html = `<h1>${s.icon || ''} ${esc(s.title)}</h1><p class="lead">${esc(s.description || '')}</p>`;
  html += groups.length ? groups.map(moduleBlock).join('') : `<p class="muted">${T().empty}</p>`;
  if (soon.length)
    html += `<div class="soon"><span class="soon-label">${T().soon}</span>${soon.map((g) => `<span class="chip dim">${g.icon || ''} ${esc(g.title)}</span>`).join('')}</div>`;
  $('doc').className = 'doc wide';
  $('doc').dataset.s = s.id;
  $('doc').innerHTML = html;
}


// ---------- плеер: диалоги и тексты с озвучкой ----------
// В странице .md стоит блок <div class="player" data-src="content/players/x.json" data-audio="audio/x"></div>,
// а сюда он превращается в плеер. Файлы озвучки лежат в audio/<имя>/<набор голосов>/<раздел>-<строка>.mp3
const PL = {
  uk: { section: 'Діалог', voices: 'Голоси', setDe: 'Німеччина (Tanja і Christoph)', setAt: 'Австрія (Ingrid і Jonas)', speed: 'Темп', play: '▶ Слухати', pause: '❚❚ Пауза', stop: '■ Стоп', again: '↻ Ще раз фразу',
        gap: 'Пауза після кожної фрази (щоб повторювати вголос)', tip: 'Торкнись фрази, щоб слухати з неї.', task: 'Завдання', variant: 'Варіант', questions: 'Можливі питання', desc: 'На фото', err: 'Не вдалося відтворити звук' },
  ru: { section: 'Диалог', voices: 'Голоса', setDe: 'Германия (Tanja и Christoph)', setAt: 'Австрия (Ingrid и Jonas)', speed: 'Темп', play: '▶ Слушать', pause: '❚❚ Пауза', stop: '■ Стоп', again: '↻ Ещё раз фразу',
        gap: 'Пауза после каждой фразы (чтобы повторять вслух)', tip: 'Нажми на фразу, чтобы слушать с неё.', task: 'Задание', variant: 'Вариант', questions: 'Возможные вопросы', desc: 'На фото', err: 'Не удалось воспроизвести звук' },
  en: { section: 'Dialogue', voices: 'Voices', setDe: 'Germany (Tanja and Christoph)', setAt: 'Austria (Ingrid and Jonas)', speed: 'Speed', play: '▶ Listen', pause: '❚❚ Pause', stop: '■ Stop', again: '↻ Repeat line',
        gap: 'Pause after each line (to repeat aloud)', tip: 'Tap a line to listen from there.', task: 'Task', variant: 'Variant', questions: 'Possible questions', desc: 'In the photo', err: 'Could not play the audio' },
};
let plStop = null; // функция, которая останавливает текущий плеер при уходе со страницы
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

async function initPlayers(root) {
  for (const box of root.querySelectorAll('.player[data-src]')) {
    let data;
    try { data = await (await fetch(box.dataset.src + bust)).json(); } catch (e) { continue; }
    buildPlayer(box, data.sections, box.dataset.audio);
  }
}

function buildPlayer(box, secs, audioDir) {
  const L = PL[LANG];
  const au = new Audio();
  let cur = 0, idx = 0, playing = false, timer = null, token = 0;
  const set = () => lsGet('plset') === 'at' ? 'at' : 'de';
  box.innerHTML = `
    <div class="pl-bar">
      <select class="pl-sec" aria-label="${esc(L.section)}">${secs.map((s, i) => `<option value="${i}">${esc(s.title)}</option>`).join('')}</select>
      <div class="pl-row">
        <button class="pl-play primary" type="button"></button>
        <button class="pl-stop" type="button">${L.stop}</button>
        <button class="pl-again" type="button">${L.again}</button>
      </div>
      <div class="pl-row">
        <label>${L.voices}
          <select class="pl-set"><option value="de">${esc(L.setDe)}</option><option value="at">${esc(L.setAt)}</option></select>
        </label>
        <label class="pl-speed">${L.speed} <input class="pl-rate" type="range" min="0.6" max="1.3" step="0.05" value="1"> <span class="pl-rv">1.00</span></label>
      </div>
      <label class="pl-chk"><input class="pl-gap" type="checkbox"> ${L.gap}</label>
    </div>
    <div class="pl-task"></div>
    <div class="pl-lines"></div>
    <div class="pl-extra"></div>
    <p class="pl-tip muted">${L.tip}</p>`;
  const q = (c) => box.querySelector(c);
  const btn = q('.pl-play');
  const label = () => { btn.textContent = playing ? L.pause : L.play; };
  q('.pl-set').value = set();
  const rate = parseFloat(lsGet('plrate'));
  if (rate >= 0.6 && rate <= 1.3) { q('.pl-rate').value = rate; q('.pl-rv').textContent = rate.toFixed(2); }
  q('.pl-gap').checked = lsGet('plgap') === '1';

  function render() {
    const s = secs[cur];
    const parts = [];
    if (s.task) parts.push(`<b>${s.lines.some((l) => l.w === 'M') ? esc(L.desc) : esc(L.task)}:</b> ${esc(s.task)}`);
    q('.pl-task').innerHTML = parts.join('');
    q('.pl-lines').innerHTML = s.lines.map((l, i) =>
      `<div class="pl-line" data-i="${i}"><span class="pl-who ${l.w}">${l.w === 'M' ? '🗣' : l.w}</span><span class="pl-txt">${l.w === 'M' && l.n ? `<b class="pl-tag">${esc(l.n)}</b> ` : ''}${esc(l.t)}${l.w !== 'M' && l.n ? `<em class="pl-note">${esc(l.n)}</em>` : ''}</span></div>`).join('');
    let extra = '';
    if (s.variant) extra += `<p><b>${esc(L.variant)}:</b> ${esc(s.variant)}</p>`;
    if (s.questions) extra += `<p><b>${esc(L.questions)}:</b> ${esc(s.questions)}</p>`;
    q('.pl-extra').innerHTML = extra;
    q('.pl-lines').querySelectorAll('.pl-line').forEach((el) => el.addEventListener('click', () => start(+el.dataset.i)));
    mark(-1);
  }
  function mark(i) {
    box.querySelectorAll('.pl-line').forEach((e) => e.classList.toggle('on', +e.dataset.i === i));
    const a = box.querySelector('.pl-line.on');
    if (a) { const r = a.getBoundingClientRect(); if (r.top < 90 || r.bottom > innerHeight - 40) a.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }
  function stop() { token++; clearTimeout(timer); au.pause(); playing = false; label(); }
  plStop = stop;
  function speak(i, once) {
    const s = secs[cur];
    if (i >= s.lines.length) { stop(); idx = 0; mark(-1); return; }
    idx = i; mark(i);
    const my = token;
    au.src = `${audioDir}/${set()}/${cur}-${i}.mp3`;
    au.playbackRate = +q('.pl-rate').value;
    au.onended = () => {
      if (my !== token || !playing) return;
      if (once) { playing = false; label(); return; }
      const wait = q('.pl-gap').checked ? Math.max(2500, au.duration * 1000 * 1.1) : 350;
      timer = setTimeout(() => { if (my === token && playing) speak(i + 1, false); }, wait);
    };
    au.onerror = () => { if (my === token) { stop(); q('.pl-tip').textContent = L.err; } };
    au.play().catch(() => {});
  }
  function start(i, once) { token++; clearTimeout(timer); au.pause(); playing = true; label(); speak(i, once); }
  btn.onclick = () => { if (playing) { stop(); } else start(idx >= secs[cur].lines.length ? 0 : idx); };
  q('.pl-stop').onclick = () => { stop(); idx = 0; mark(-1); };
  q('.pl-again').onclick = () => start(idx, true);
  q('.pl-sec').onchange = (e) => { stop(); cur = +e.target.value; idx = 0; render(); };
  q('.pl-set').onchange = (e) => { lsSet('plset', e.target.value); if (playing) start(idx); };
  q('.pl-rate').oninput = (e) => { q('.pl-rv').textContent = (+e.target.value).toFixed(2); au.playbackRate = +e.target.value; lsSet('plrate', e.target.value); };
  q('.pl-gap').onchange = (e) => lsSet('plgap', e.target.checked ? '1' : '0');
  label(); render();
}

async function showPage(found, anchor) {
  if (plStop) { plStop(); plStop = null; }
  const { section, group, page } = found;
  document.title = page.title + ' — Deutsch';
  renderTabs(section.id);
  renderSidebar(section.id, page.slug);
  renderCrumbs([{ title: section.short || section.title, href: '#/' + section.id }, { title: group.title }, { title: page.title }]);
  const md = await getPage(page.slug);
  if (md === null) {
    $('doc').className = 'doc';
    $('doc').innerHTML = `<h1>${esc(page.title)}</h1><p class="muted">${T().missing}</p>`;
    $('toc').innerHTML = '';
    return;
  }
  const doc = $('doc');
  doc.className = 'doc';
  doc.dataset.s = section.id;
  doc.innerHTML = marked.parse(md);
  const h1 = doc.querySelector('h1');
  if (h1) {
    const meta = document.createElement('div');
    meta.className = 'page-meta';
    meta.innerHTML = badge(page.type) + (page.updated ? `<span>${T().updated}: ${fmtDate(page.updated)}</span>` : '');
    h1.after(meta);
  }
  // внизу — переход к соседним страницам раздела
  const list = allPages().filter((x) => x.section.id === section.id);
  const i = list.findIndex((x) => x.page.slug === page.slug);
  if (i >= 0) {
    const prev = list[i - 1], next = list[i + 1];
    const nav = document.createElement('div');
    nav.className = 'pagenav';
    nav.innerHTML =
      (prev ? `<a class="pagenav-link" href="#/${prev.page.slug}"><span class="pagenav-dir">${T().prev}</span><span class="pagenav-title">${esc(prev.page.title)}</span></a>` : '<span></span>') +
      (next ? `<a class="pagenav-link next" href="#/${next.page.slug}"><span class="pagenav-dir">${T().next}</span><span class="pagenav-title">${esc(next.page.title)}</span></a>` : '<span></span>');
    doc.append(nav);
  }
  // широкие таблицы листаются вбок, а не ломают страницу на телефоне
  doc.querySelectorAll('table').forEach((t) => {
    const w = document.createElement('div');
    w.className = 'table-wrap';
    t.replaceWith(w);
    w.append(t);
  });
  // оглавление справа из заголовков
  const heads = [...doc.querySelectorAll('h2, h3')];
  heads.forEach((h, i) => (h.id = 's' + (i + 1)));
  $('toc').innerHTML = heads.length
    ? `<div class="toc-title">${T().onPage}</div>` +
      heads.map((h) => `<a class="${h.tagName === 'H3' ? 'lvl3' : ''}" data-id="${h.id}" href="#/${page.slug}">${esc(h.textContent)}</a>`).join('')
    : '';
  watchHeadings(heads);
  initPlayers(doc);
  if (anchor && document.getElementById(anchor)) document.getElementById(anchor).scrollIntoView();
}

let observer = null;
function watchHeadings(heads) {
  if (observer) observer.disconnect();
  if (!heads.length || !('IntersectionObserver' in window)) return;
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        document.querySelectorAll('.toc a').forEach((a) => a.classList.toggle('active', a.dataset.id === e.target.id));
      }
    },
    { rootMargin: '-70px 0px -70% 0px' }
  );
  heads.forEach((h) => observer.observe(h));
}

// ---------- переходы ----------
async function route() {
  closeMenu();
  const path = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  if (!path) { showHome(); window.scrollTo(0, 0); return; }
  const section = INDEX.sections.find((s) => s.id === path);
  if (section) { showSection(section); window.scrollTo(0, 0); return; }
  const found = allPages(true).find((x) => x.page.slug === path);
  if (found) { window.scrollTo(0, 0); await showPage(found); return; }
  $('doc').innerHTML = `<h1>${T().notfound}</h1><p><a href="#/">${T().toHome}</a></p>`;
}

// ---------- поиск ----------
function prepareSearch() {
  if (!searchReady) searchReady = Promise.all(allPages().map(async (x) => ({ ...x, text: (await getPage(x.page.slug)) || '' })));
  return searchReady;
}

async function runSearch(q) {
  const box = $('searchResults');
  q = q.trim().toLowerCase();
  if (q.length < 2) { box.hidden = true; return; }
  const docs = await prepareSearch();
  const hits = [];
  for (const d of docs) {
    const inTitle = d.page.title.toLowerCase().includes(q);
    const pos = d.text.toLowerCase().indexOf(q);
    if (!inTitle && pos < 0) continue;
    let snip = '';
    if (pos >= 0) {
      const from = Math.max(0, pos - 40);
      const raw = d.text.slice(from, pos + q.length + 60).replace(/[#*`>|\n]+/g, ' ');
      const p = raw.toLowerCase().indexOf(q);
      snip = p >= 0 ? esc(raw.slice(0, p)) + '<mark>' + esc(raw.slice(p, p + q.length)) + '</mark>' + esc(raw.slice(p + q.length)) : esc(raw);
      snip = (from > 0 ? '…' : '') + snip + '…';
    }
    hits.push({ d, snip, rank: inTitle ? 0 : 1 });
  }
  hits.sort((a, b) => a.rank - b.rank);
  box.innerHTML = hits.length
    ? hits.slice(0, 20).map((h) => `<a href="#/${h.d.page.slug}"><div class="where">${esc(h.d.section.short || h.d.section.title)} · ${esc(h.d.group.title)}</div><div>${esc(h.d.page.title)}</div><div class="snip">${h.snip}</div></a>`).join('')
    : `<div class="empty">${T().nothing}</div>`;
  box.hidden = false;
}

// ---------- кнопки ----------
function closeMenu() { document.body.classList.remove('menu-open'); $('scrim').hidden = true; }
$('menuBtn').onclick = () => { document.body.classList.add('menu-open'); $('scrim').hidden = false; };
$('scrim').onclick = closeMenu;

$('themeBtn').onclick = () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch (e) {}
};

$('search').addEventListener('input', (e) => runSearch(e.target.value));
$('search').addEventListener('focus', prepareSearch);
$('searchResults').addEventListener('click', () => { $('searchResults').hidden = true; $('search').value = ''; $('search').blur(); });
document.addEventListener('click', (e) => { if (!e.target.closest('.search')) $('searchResults').hidden = true; });

$('toc').addEventListener('click', (e) => {
  const a = e.target.closest('a[data-id]');
  if (!a) return;
  e.preventDefault();
  const el = document.getElementById(a.dataset.id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
});

// ---------- переключатель языка ----------
function applyLang() {
  document.documentElement.lang = LANG;
  INDEX = localize(RAW);
  const t = T();
  $('search').placeholder = t.search;
  $('themeBtn').setAttribute('aria-label', t.theme);
  $('menuBtn').setAttribute('aria-label', t.menu);
  document.querySelectorAll('#lang button').forEach((b) => b.classList.toggle('active', b.dataset.lang === LANG));
}

$('lang').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-lang]');
  if (!b || b.dataset.lang === LANG) return;
  LANG = b.dataset.lang;
  try { localStorage.setItem('lang', LANG); } catch (err) {}
  searchReady = null;
  $('searchResults').hidden = true;
  applyLang();
  route();
});

// ---------- запуск ----------
(async function start() {
  try {
    RAW = await (await fetch('content/index.json' + bust)).json();
  } catch (e) {
    $('doc').innerHTML = `<h1>${T().loadFail}</h1><p class="muted">content/index.json</p>`;
    return;
  }
  applyLang();
  window.addEventListener('hashchange', route);
  route();
})();
