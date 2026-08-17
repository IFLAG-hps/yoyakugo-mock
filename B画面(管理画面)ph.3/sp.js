/* ==========================================================================
   予約GO 管理画面 / スマートフォン対応スクリプト
   --------------------------------------------------------------------------
   既存のHTMLを書き換えずにスマホ対応を成立させるための補助スクリプトです。
   やっていることは次の4つだけです。

     (1) 上部バー（ハンバーガー）・暗幕・下部タブを生成して差し込む
     (2) サイドメニューの開閉（ハンバーガー／暗幕タップ／Escキー）
     (3) 一覧テーブルの各セルに data-label（＝見出しのテキスト）を付ける
         → カード表示にしたときの項目名として CSS 側で表示します
     (4) 受付・予約画面はスマホ幅のとき初期表示を「1日」に切り替える

   本番実装では (1) と (3) はサーバー側テンプレートに直接書いてしまうのが
   望ましい形です（詳細は「スマホ対応_調整内容.md」を参照）。
   ========================================================================== */

(function () {
  'use strict';

  var NAV_BP = 1024;   // これ以下でサイドメニューを引き出しにする
  var CARD_BP = 768;   // これ以下でテーブルをカード表示にする

  /* ------------------------------------------------------------------
     下部タブの項目（よく使う画面への近道）
     ------------------------------------------------------------------ */
  var BOTTOM_NAV = [
    { label: 'ホーム',   href: 'admin_index.html',        icon: 'home' },
    { label: '受付・予約', href: 'admin_reservations.html', icon: 'calendar' },
    { label: '顧客',     href: 'admin_customers.html',    icon: 'person' },
    { label: 'メニュー',  href: 'admin_menus.html',        icon: 'list' }
  ];

  var ICONS = {
    home:     '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    person:   '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    list:     '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1.2"/><circle cx="3.5" cy="12" r="1.2"/><circle cx="3.5" cy="18" r="1.2"/>',
    menu:     '<path d="M4 7h16M4 12h16M4 17h16"/>'
  };

  function svg(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
  }

  function currentFile() {
    var p = location.pathname.split('/').pop();
    return p || 'admin_index.html';
  }

  /* ==================================================================
     (1)(2) ナビゲーション
     ================================================================== */
  function buildNavigation() {
    var app = document.querySelector('.app');
    var sidebar = document.querySelector('.sidebar');
    // ログイン画面など、サイドメニューを持たない画面では何もしない
    if (!app || !sidebar) return;

    if (!sidebar.id) sidebar.id = 'spSidebar';

    /* --- 上部バー --------------------------------------------------- */
    var title = (document.title || '').split('｜')[0].trim() || '管理画面';

    var appbar = document.createElement('header');
    appbar.className = 'sp-appbar';
    appbar.innerHTML =
      '<button type="button" class="sp-appbar-btn" id="spNavToggle" ' +
        'aria-label="メニューを開く" aria-expanded="false" aria-controls="' + sidebar.id + '">' +
        '<span class="sp-burger-icon"><span></span><span></span><span></span></span>' +
      '</button>' +
      '<span class="sp-appbar-title">' + title + '</span>';
    app.insertBefore(appbar, sidebar.nextSibling);

    /* --- 暗幕 ------------------------------------------------------- */
    var scrim = document.createElement('div');
    scrim.className = 'sp-scrim';
    scrim.id = 'spScrim';
    document.body.appendChild(scrim);

    /* --- 引き出し内：閉じるボタン ------------------------------------ */
    var head = document.createElement('div');
    head.className = 'sp-drawer-head';
    head.innerHTML = '<button type="button" class="sp-drawer-close" aria-label="メニューを閉じる">×</button>';
    sidebar.insertBefore(head, sidebar.firstChild);

    /* --- 引き出し内：アカウント操作（PCでは topbar にあるもの） -------- */
    var nav = sidebar.querySelector('.nav');
    var account = document.createElement('div');
    account.className = 'sp-drawer-account';
    account.innerHTML =
      '<a href="./admin_password.html">🔑 パスワード変更</a>' +
      '<a href="./admin_login.html">↩ ログアウト</a>';
    if (nav && nav.parentNode) {
      nav.parentNode.insertBefore(account, nav.nextSibling);
    } else {
      sidebar.appendChild(account);
    }

    /* --- 下部タブ ---------------------------------------------------- */
    var here = currentFile();
    var bottom = document.createElement('nav');
    bottom.className = 'sp-bottomnav';
    bottom.setAttribute('aria-label', 'よく使う画面');
    bottom.innerHTML = BOTTOM_NAV.map(function (item) {
      var active = (item.href === here) ? ' is-active' : '';
      return '<a class="' + active.trim() + '" href="./' + item.href + '"' +
             (active ? ' aria-current="page"' : '') + '>' +
             svg(item.icon) + '<span>' + item.label + '</span></a>';
    }).join('') +
      '<button type="button" id="spNavToggleBottom" aria-controls="' + sidebar.id + '" aria-expanded="false">' +
      svg('menu') + '<span>すべて</span></button>';
    document.body.appendChild(bottom);

    /* --- 開閉 -------------------------------------------------------- */
    var toggles = [document.getElementById('spNavToggle'), document.getElementById('spNavToggleBottom')];
    var closeBtn = head.querySelector('.sp-drawer-close');

    function setOpen(open) {
      document.body.classList.toggle('sp-nav-open', open);
      toggles.forEach(function (b) {
        if (b) b.setAttribute('aria-expanded', String(open));
      });
      var top = toggles[0];
      if (top) top.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
      if (open) {
        var first = sidebar.querySelector('.nav a');
        if (first) first.focus();
      } else if (top && document.activeElement && sidebar.contains(document.activeElement)) {
        top.focus();
      }
    }
    function isOpen() { return document.body.classList.contains('sp-nav-open'); }

    toggles.forEach(function (b) {
      if (b) b.addEventListener('click', function () { setOpen(!isOpen()); });
    });
    closeBtn.addEventListener('click', function () { setOpen(false); });
    scrim.addEventListener('click', function () { setOpen(false); });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) setOpen(false);
    });

    // 引き出し内のリンクを押したら閉じる（同一ページ内リンク対策）
    sidebar.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    // PC幅に戻したら開閉状態をリセットする
    var mq = window.matchMedia('(min-width: ' + (NAV_BP + 1) + 'px)');
    var onChange = function (ev) { if (ev.matches) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
  }

  /* ==================================================================
     (3) 一覧テーブルのカード化用ラベル付与
     ================================================================== */
  var TITLE_RE = /(名|件名|タイトル|内容|項目)/;
  var ID_RE = /^(ID|Ｉ?Ｄ|No\.?|番号)$/i;

  function labelOneTable(table) {
    var thead = table.tHead;
    if (!thead || !thead.rows.length) return;

    var headRow = thead.rows[thead.rows.length - 1];
    var ths = Array.prototype.slice.call(headRow.cells);

    // 結合セルがある表はカード化に向かないため対象外（横スクロールのまま）
    var merged = ths.some(function (th) { return th.colSpan > 1; });
    if (merged) {
      table.classList.add('sp-no-card');
      return;
    }

    var labels = ths.map(function (th) {
      return th.textContent.replace(/\s+/g, ' ').trim();
    });

    var idIdx = ID_RE.test(labels[0]) ? 0 : -1;
    var titleIdx = -1;
    for (var i = 0; i < labels.length; i++) {
      if (i === idIdx) continue;
      if (/操作/.test(labels[i])) continue;
      if (TITLE_RE.test(labels[i])) { titleIdx = i; break; }
    }

    Array.prototype.forEach.call(table.tBodies, function (tbody) {
      Array.prototype.forEach.call(tbody.rows, function (row) {
        if (row.cells.length !== labels.length) return;   // 「データなし」行などは触らない
        Array.prototype.forEach.call(row.cells, function (td, idx) {
          if (td.colSpan > 1) return;
          var label = labels[idx];

          if (idx === titleIdx) {
            td.classList.add('sp-card-title');
            td.removeAttribute('data-label');
            return;
          }
          if (idx === idIdx) {
            td.classList.add('sp-card-id');
            td.setAttribute('data-label', label);
            return;
          }
          if (/操作/.test(label)) {
            td.classList.add('action-cell');
            td.removeAttribute('data-label');
            return;
          }
          if (label) td.setAttribute('data-label', label);
        });
      });
    });
  }

  function labelTables() {
    Array.prototype.forEach.call(document.querySelectorAll('table.results-table'), labelOneTable);
  }

  // JavaScript で描画される一覧（検索結果など）にも追従させる
  function watchTables() {
    if (!('MutationObserver' in window)) return;
    var timer = null;
    var mo = new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(labelTables, 60);
    });
    Array.prototype.forEach.call(document.querySelectorAll('table.results-table tbody'), function (tbody) {
      mo.observe(tbody, { childList: true });
    });
  }

  /* ==================================================================
     (4) 受付・予約画面：スマホ幅では初期表示を「1日」に
     ================================================================== */
  function preferOneDayView() {
    if (window.innerWidth > CARD_BP) return;
    var btn = document.getElementById('view1Day');
    if (btn && !btn.classList.contains('active')) btn.click();
  }

  /* ------------------------------------------------------------------ */
  function init() {
    buildNavigation();
    labelTables();
    watchTables();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.addEventListener('load', preferOneDayView);
})();
