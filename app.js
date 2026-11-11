// Сайт «Deutsch». Всё содержимое лежит в папке content:
//   content/index.json — список разделов, тем и страниц (меню сайта)
//   content/<раздел>/<страница>.md — сами страницы
// Чтобы добавить страницу, нужен .md-файл и строчка о нём в index.json.

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const bust = '?t=' + Date.now(); // чтобы телефон не показывал старую версию

let INDEX = null;
const pageCache = {};
let searchReady = null;

async function getPage(slug) {
  if (!(slug in pageCache)) {
    const r = await fetch('content/' + slug + '.md' + bust);
    pageCache[slug] = r.ok ? await r.text() : null;
  }
  return pageCache[slug];
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

const plural = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'страница' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'страницы' : 'страниц');
const countPages = (s) => visGroups(s).reduce((a, g) => a + g.pages.length, 0);

// ---------- кирпичики ----------
const TYPE_CLASS = { 'Правило': 't-rule', 'Фразы': 't-phr', 'Разбор ошибок': 't-fix', 'Слова': 't-word' };
const badge = (t) => (t ? `<span class="badge ${TYPE_CLASS[t] || ''}">${esc(t)}</span>` : '');

function pageCard(p, where, sid) {
  return `<a class="pcard" ${sid ? `data-s="${sid}"` : ''} href="#/${p.slug}">
    <div class="pcard-top">${badge(p.type)}${where ? `<span class="pcard-where">${esc(where)}</span>` : ''}</div>
    <div class="pcard-title">${esc(p.title)}</div>
    <div class="pcard-desc">${esc(p.desc || '')}</div>
    <div class="pcard-go">Открыть <span aria-hidden="true">→</span></div>
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
  let html = `<a class="side-home ${!sectionId ? 'active' : ''}" href="#/">🏠 Главная</a>`;
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
  html += `<a class="side-about" href="#/deutsch/o-sajte">Как устроен сайт</a>`;
  $('sidebar').innerHTML = html;
}

function renderCrumbs(parts) {
  let html = `<a href="#/" aria-label="Главная">🏠</a>`;
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
        <div class="bigcard-foot"><span>${n} ${plural(n)}</span><span class="pcard-go">Открыть <span aria-hidden="true">→</span></span></div>
      </a>`;
    })
    .join('');
  const recent = allPages()
    .filter((x) => x.page.updated)
    .sort((a, b) => b.page.updated.localeCompare(a.page.updated))
    .slice(0, 4);
  const recentHtml = recent.length
    ? `<div class="block-title">Недавно добавлено</div><div class="pgrid">${recent.map((x) => pageCard(x.page, x.section.short || x.section.title, x.section.id)).join('')}</div>`
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
  html += groups.length ? groups.map(moduleBlock).join('') : `<p class="muted">Здесь пока пусто.</p>`;
  if (soon.length)
    html += `<div class="soon"><span class="soon-label">Пока пусто:</span>${soon.map((g) => `<span class="chip dim">${g.icon || ''} ${esc(g.title)}</span>`).join('')}</div>`;
  $('doc').className = 'doc wide';
  $('doc').dataset.s = s.id;
  $('doc').innerHTML = html;
}

async function showPage(found, anchor) {
  const { section, group, page } = found;
  document.title = page.title + ' — Deutsch';
  renderTabs(section.id);
  renderSidebar(section.id, page.slug);
  renderCrumbs([{ title: section.short || section.title, href: '#/' + section.id }, { title: group.title }, { title: page.title }]);
  const md = await getPage(page.slug);
  if (md === null) {
    $('doc').className = 'doc';
    $('doc').innerHTML = `<h1>${esc(page.title)}</h1><p class="muted">Файл страницы не найден.</p>`;
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
    meta.innerHTML = badge(page.type) + (page.updated ? `<span>Обновлено: ${fmtDate(page.updated)}</span>` : '');
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
      (prev ? `<a class="pagenav-link" href="#/${prev.page.slug}"><span class="pagenav-dir">← Назад</span><span class="pagenav-title">${esc(prev.page.title)}</span></a>` : '<span></span>') +
      (next ? `<a class="pagenav-link next" href="#/${next.page.slug}"><span class="pagenav-dir">Дальше →</span><span class="pagenav-title">${esc(next.page.title)}</span></a>` : '<span></span>');
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
    ? `<div class="toc-title">На странице</div>` +
      heads.map((h) => `<a class="${h.tagName === 'H3' ? 'lvl3' : ''}" data-id="${h.id}" href="#/${page.slug}">${esc(h.textContent)}</a>`).join('')
    : '';
  watchHeadings(heads);
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
  $('doc').innerHTML = `<h1>Страница не найдена</h1><p><a href="#/">На главную</a></p>`;
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
    : `<div class="empty">Ничего не найдено</div>`;
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

// ---------- запуск ----------
(async function start() {
  try {
    INDEX = await (await fetch('content/index.json' + bust)).json();
  } catch (e) {
    $('doc').innerHTML = '<h1>Не удалось загрузить сайт</h1><p class="muted">Не читается content/index.json.</p>';
    return;
  }
  window.addEventListener('hashchange', route);
  route();
})();
