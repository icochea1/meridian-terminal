(() => {
  'use strict';

  const STORE_KEY = 'meridian:v1';

  const DEFAULT_WATCHLIST = [
    { s: 'NASDAQ:AAPL', n: 'Apple Inc.' },
    { s: 'NASDAQ:MSFT', n: 'Microsoft Corp.' },
    { s: 'NASDAQ:NVDA', n: 'NVIDIA Corp.' },
    { s: 'NASDAQ:AMZN', n: 'Amazon.com Inc.' },
    { s: 'NASDAQ:GOOGL', n: 'Alphabet Inc. Class A' },
    { s: 'NASDAQ:META', n: 'Meta Platforms Inc.' },
    { s: 'NASDAQ:TSLA', n: 'Tesla Inc.' },
    { s: 'NYSE:JPM', n: 'JPMorgan Chase & Co.' },
    { s: 'NYSE:V', n: 'Visa Inc.' },
    { s: 'NYSE:XOM', n: 'Exxon Mobil Corp.' },
    { s: 'AMEX:SPY', n: 'SPDR S&P 500 ETF' },
    { s: 'NASDAQ:QQQ', n: 'Invesco QQQ Trust' },
  ];

  const TAPE_SYMBOLS = [
    { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
    { proName: 'FOREXCOM:NSXUSD', title: 'Nasdaq 100' },
    { proName: 'FOREXCOM:DJI', title: 'Dow 30' },
    { proName: 'CBOE:VIX', title: 'VIX' },
    { proName: 'TVC:US10Y', title: 'US 10Y' },
    { proName: 'TVC:DXY', title: 'Dollar Index' },
    { proName: 'TVC:GOLD', title: 'Gold' },
    { proName: 'TVC:USOIL', title: 'WTI Crude' },
    { proName: 'BITSTAMP:BTCUSD', title: 'Bitcoin' },
    { proName: 'FX:EURUSD', title: 'EUR/USD' },
  ];

  // ---------- State ----------
  const state = load() || {
    theme: matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
    watchlist: DEFAULT_WATCHLIST,
    active: 'NASDAQ:AAPL',
    interval: 'D',
    tab: 'heatmap',
    news: 'market',
  };

  // A symbol passed in by a TradingView widget link (movers / heatmap) wins.
  const linked = new URLSearchParams(location.search).get('tvwidgetsymbol');
  if (linked) {
    state.active = linked.toUpperCase();
    history.replaceState(null, '', location.pathname);
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  }

  const $ = (sel) => document.querySelector(sel);
  const ticker = (sym) => sym.split(':').pop();
  const selfUrl = location.origin + location.pathname;

  // ---------- Widget mounting ----------
  function mount(hostId, widget, config) {
    const host = document.getElementById(hostId);
    host.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'tradingview-widget-container';
    const inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = `https://s3.tradingview.com/external-embedding/embed-widget-${widget}.js`;
    script.text = JSON.stringify({ locale: 'en', colorTheme: state.theme, isTransparent: true, ...config });
    wrap.append(inner, script);
    host.append(wrap);
  }

  function renderTape() {
    mount('w-tape', 'ticker-tape', {
      symbols: TAPE_SYMBOLS,
      showSymbolLogo: true,
      displayMode: 'adaptive',
    });
  }

  function renderIndices() {
    mount('w-indices', 'market-overview', {
      dateRange: '1D',
      showChart: false,
      showSymbolLogo: true,
      showFloatingTooltip: false,
      width: '100%',
      height: '100%',
      tabs: [
        {
          title: 'Indices',
          symbols: [
            { s: 'FOREXCOM:SPXUSD', d: 'S&P 500' },
            { s: 'FOREXCOM:NSXUSD', d: 'Nasdaq 100' },
            { s: 'FOREXCOM:DJI', d: 'Dow 30' },
            { s: 'CBOE:VIX', d: 'VIX' },
            { s: 'INDEX:NKY', d: 'Nikkei 225' },
            { s: 'INDEX:DEU40', d: 'DAX' },
          ],
        },
        {
          title: 'Futures',
          symbols: [
            { s: 'CME_MINI:ES1!', d: 'S&P 500 E-mini' },
            { s: 'CME_MINI:NQ1!', d: 'Nasdaq E-mini' },
            { s: 'CBOT_MINI:YM1!', d: 'Dow E-mini' },
            { s: 'COMEX:GC1!', d: 'Gold' },
            { s: 'NYMEX:CL1!', d: 'Crude Oil' },
          ],
        },
        {
          title: 'Rates',
          symbols: [
            { s: 'TVC:US02Y', d: 'US 2Y' },
            { s: 'TVC:US10Y', d: 'US 10Y' },
            { s: 'TVC:US30Y', d: 'US 30Y' },
            { s: 'TVC:DXY', d: 'Dollar Index' },
          ],
        },
      ],
    });
  }

  function renderSymbol() {
    const sym = state.active;
    $('#chartTitle').textContent = `${ticker(sym)} · Chart`;
    $('#newsSymbolBtn').textContent = ticker(sym);
    document.title = `${ticker(sym)} · Meridian Terminal`;

    mount('w-symbol-info', 'symbol-info', { symbol: sym, width: '100%' });
    renderChart();
    mount('w-ta', 'technical-analysis', {
      symbol: sym,
      interval: '1D',
      showIntervalTabs: true,
      displayMode: 'single',
      width: '100%',
      height: '100%',
    });
    mount('w-fin', 'financials', {
      symbol: sym,
      displayMode: 'regular',
      width: '100%',
      height: '100%',
    });
    if (state.tab === 'profile') renderBottom();
    if (state.news === 'symbol') renderNews();
  }

  function renderChart() {
    const dark = state.theme === 'dark';
    mount('w-chart', 'advanced-chart', {
      autosize: true,
      symbol: state.active,
      interval: state.interval,
      timezone: 'America/New_York',
      theme: state.theme,
      style: '1',
      allow_symbol_change: false,
      withdateranges: true,
      hide_side_toolbar: false,
      details: false,
      calendar: false,
      studies: ['STD;MA%Ribbon'],
      backgroundColor: dark ? '#131823' : '#ffffff',
      gridColor: dark ? 'rgba(34,42,58,0.6)' : 'rgba(227,231,239,0.8)',
      support_host: 'https://www.tradingview.com',
    });
  }

  function renderBottom() {
    const base = { width: '100%', height: '100%' };
    switch (state.tab) {
      case 'heatmap':
        return mount('w-bottom', 'stock-heatmap', {
          ...base,
          dataSource: 'SPX500',
          exchanges: [],
          grouping: 'sector',
          blockSize: 'market_cap_basic',
          blockColor: 'change',
          symbolUrl: selfUrl,
          hasTopBar: true,
          isDataSetEnabled: false,
          isZoomEnabled: true,
          hasSymbolTooltip: true,
          isMonoSize: false,
        });
      case 'screener':
        return mount('w-bottom', 'screener', {
          ...base,
          market: 'america',
          defaultColumn: 'overview',
          defaultScreen: 'most_capitalized',
          showToolbar: true,
          largeChartUrl: selfUrl,
        });
      case 'calendar':
        return mount('w-bottom', 'events', {
          ...base,
          importanceFilter: '0,1',
          countryFilter: 'us,eu,gb,jp,cn',
        });
      case 'profile':
        return mount('w-bottom', 'symbol-profile', { ...base, symbol: state.active });
    }
  }

  function renderMovers() {
    mount('w-movers', 'hotlists', {
      exchange: 'US',
      dateRange: '1D',
      showChart: true,
      showSymbolLogo: true,
      showFloatingTooltip: false,
      largeChartUrl: selfUrl,
      width: '100%',
      height: '100%',
    });
  }

  function renderNews() {
    const symbolScope = state.news === 'symbol';
    mount('w-news', 'timeline', {
      feedMode: symbolScope ? 'symbol' : 'market',
      ...(symbolScope ? { symbol: state.active } : { market: 'stock' }),
      displayMode: 'regular',
      width: '100%',
      height: '100%',
    });
  }

  function renderAllWidgets() {
    renderTape();
    renderIndices();
    renderSymbol();
    renderBottom();
    renderMovers();
    renderNews();
  }

  // ---------- Watchlist ----------
  function renderWatchlist() {
    const ul = $('#watchlist');
    ul.innerHTML = '';
    for (const item of state.watchlist) {
      const li = document.createElement('li');
      li.tabIndex = 0;
      li.dataset.sym = item.s;
      if (item.s === state.active) li.classList.add('active');
      const tk = ticker(item.s);
      li.innerHTML = `
        <span class="logo">${escapeHtml(tk.slice(0, 2))}</span>
        <span class="meta">
          <div class="tk">${escapeHtml(tk)}</div>
          <div class="nm">${escapeHtml(item.n || item.s)}</div>
        </span>
        <button class="rm" aria-label="Remove ${escapeHtml(tk)}" title="Remove">×</button>`;
      ul.append(li);
    }
    $('#wlCount').textContent = state.watchlist.length;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function normalize(raw) {
    return raw.trim().toUpperCase().replace(/\s+/g, '');
  }

  function selectSymbol(sym) {
    if (!sym || sym === state.active) return;
    state.active = sym;
    save();
    renderWatchlist();
    renderSymbol();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $('#watchlist').addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    if (e.target.closest('.rm')) {
      state.watchlist = state.watchlist.filter((w) => w.s !== li.dataset.sym);
      save();
      renderWatchlist();
      return;
    }
    selectSymbol(li.dataset.sym);
  });
  $('#watchlist').addEventListener('keydown', (e) => {
    const li = e.target.closest('li');
    if (li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); selectSymbol(li.dataset.sym); }
  });

  $('#wlAddForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#wlAddInput');
    const sym = normalize(input.value);
    if (!sym) return;
    if (!state.watchlist.some((w) => w.s === sym || ticker(w.s) === sym)) {
      state.watchlist.push({ s: sym, n: '' });
      save();
    }
    input.value = '';
    selectSymbol(sym);
    renderWatchlist();
  });

  $('#searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#searchInput');
    const sym = normalize(input.value);
    if (!sym) return;
    const known = state.watchlist.find((w) => ticker(w.s) === sym);
    selectSymbol(known ? known.s : sym);
    input.value = '';
    input.blur();
  });

  // Press "/" anywhere to jump to search.
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
      e.preventDefault();
      $('#searchInput').focus();
    }
  });

  // ---------- Segmented controls ----------
  function bindSeg(id, attr, getter, onPick) {
    const seg = document.getElementById(id);
    const sync = () => seg.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset[attr] === getter()));
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || b.dataset[attr] === getter()) return;
      onPick(b.dataset[attr]);
      save();
      sync();
    });
    sync();
  }

  bindSeg('intervalSeg', 'interval', () => state.interval, (v) => { state.interval = v; renderChart(); });
  bindSeg('bottomTabs', 'tab', () => state.tab, (v) => { state.tab = v; renderBottom(); });
  bindSeg('newsSeg', 'scope', () => state.news, (v) => { state.news = v; renderNews(); });

  // ---------- Theme ----------
  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
  }
  $('#themeToggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    save();
    applyTheme();
    renderAllWidgets();
  });

  // ---------- Market session clock (NYSE regular hours, holidays ignored) ----------
  const nyFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23', weekday: 'short',
  });

  function tick() {
    const parts = Object.fromEntries(nyFmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
    const h = +parts.hour, m = +parts.minute;
    const mins = h * 60 + m;
    const weekend = parts.weekday === 'Sat' || parts.weekday === 'Sun';
    $('#clockTime').textContent = `${parts.hour}:${parts.minute}:${parts.second}`;

    let label, cls;
    if (weekend) { label = 'Closed · Weekend'; cls = 'closed'; }
    else if (mins >= 570 && mins < 960) { label = `Market Open · closes in ${fmtDur(960 - mins)}`; cls = 'open'; }
    else if (mins >= 240 && mins < 570) { label = `Pre-market · opens in ${fmtDur(570 - mins)}`; cls = 'ext'; }
    else if (mins >= 960 && mins < 1200) { label = 'After-hours'; cls = 'ext'; }
    else { label = 'Market Closed'; cls = 'closed'; }

    const el = $('#session');
    el.className = `session ${cls}`;
    $('#sessionLabel').textContent = label;
  }
  function fmtDur(min) {
    const h = Math.floor(min / 60), m = min % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
  }

  // ---------- Boot ----------
  applyTheme();
  renderWatchlist();
  renderAllWidgets();
  tick();
  setInterval(tick, 1000);
})();
