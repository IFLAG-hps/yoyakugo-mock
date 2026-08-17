/* ==========================================================================
   モック閲覧用 PINゲート
   --------------------------------------------------------------------------
   ・GitHub Pages 等で公開したときに、URLを知っているだけの相手に
     中身が見えてしまうのを防ぐための簡易ゲートです。
   ・ローカルでファイルを直接開いた場合（file://）はゲートを出しません。
     開発時に毎回PINを聞かれると邪魔なためです。
   ・sp_preview.html のプレビュー枠（iframe）の中でも出しません。
     親ページで一度解錠すれば中身も見られます。

   【重要】これは「URLを知られただけの相手に対する目隠し」であって、
   セキュリティ対策ではありません。静的サイトである以上、
   ページのソースを見られれば突破されます。本当に見せたくない場合は
   リポジトリを private にしてください。
   ========================================================================== */

(function () {
  'use strict';

  var STORAGE_KEY = 'yoyakugo-mock-unlocked';
  var PIN_HASH = 2088332156;   // djb2ハッシュ。平文をソースに置かないための最低限の措置
  var PIN_LENGTH = 4;

  /* ゲートを出さないケース ------------------------------------------------ */
  if (location.protocol === 'file:') return;   // ローカルで直接開いたとき
  if (window.top !== window.self) return;      // iframe（プレビュー枠）の中

  try {
    if (sessionStorage.getItem(STORAGE_KEY) === '1') return;   // 解錠済み
  } catch (e) {
    return;   // sessionStorage が使えない環境ではゲートを出さない
  }

  function hash(s) {
    var x = 5381;
    for (var i = 0; i < s.length; i++) {
      x = ((x << 5) + x + s.charCodeAt(i)) >>> 0;
    }
    return x;
  }

  /* 描画前に本文を隠す（PIN入力前に中身が一瞬見えるのを防ぐ） -------------- */
  var hider = document.createElement('style');
  hider.textContent =
    'html{visibility:hidden!important}' +
    '#mockGate,#mockGate *{visibility:visible!important}';
  document.documentElement.appendChild(hider);

  var STYLE = [
    '#mockGate{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;',
    '  justify-content:center;padding:24px;background:#0b1f3a;',
    '  font:14px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,"Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif}',
    '#mockGate .g-card{width:100%;max-width:340px;text-align:center;color:#e5efff}',
    '#mockGate .g-mark{font-size:26px;font-weight:800;letter-spacing:.04em;margin:0 0 6px}',
    '#mockGate .g-mark span{color:#10B981}',
    '#mockGate .g-sub{margin:0 0 28px;font-size:12px;color:#9fb6ff}',
    '#mockGate label{display:block;margin:0 0 10px;font-size:13px;font-weight:600;color:#c9d6ff}',
    '#mockGate input{width:100%;height:60px;padding:0 16px;border:2px solid #23406b;border-radius:12px;',
    '  background:#0e2748;color:#fff;text-align:center;',
    '  font-size:30px;font-weight:700;letter-spacing:.55em;text-indent:.55em;',
    '  outline:none;-webkit-appearance:none;appearance:none}',
    '#mockGate input:focus{border-color:#10B981}',
    '#mockGate input::-webkit-outer-spin-button,#mockGate input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}',
    '#mockGate .g-err{min-height:20px;margin:12px 0 0;font-size:13px;color:#fca5a5}',
    '#mockGate button{width:100%;height:52px;margin-top:8px;border:0;border-radius:12px;',
    '  background:#10B981;color:#fff;font-size:16px;font-weight:700;cursor:pointer}',
    '#mockGate button:disabled{background:#2c4a3f;color:#7d8f88;cursor:default}',
    '#mockGate .g-note{margin:26px 0 0;font-size:11px;line-height:1.7;color:#7f93bb}',
    '@keyframes gShake{10%,90%{transform:translateX(-2px)}30%,70%{transform:translateX(4px)}50%{transform:translateX(-4px)}}',
    '#mockGate .shake{animation:gShake .4s}'
  ].join('');

  function build() {
    var style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    var gate = document.createElement('div');
    gate.id = 'mockGate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-label', 'PINコードの入力');
    gate.innerHTML =
      '<div class="g-card">' +
        '<p class="g-mark">予約<span>GO</span></p>' +
        '<p class="g-sub">管理画面モック（社内確認用）</p>' +
        '<label for="gatePin">PINコードを入力してください</label>' +
        '<input id="gatePin" type="password" inputmode="numeric" autocomplete="off" ' +
               'maxlength="' + PIN_LENGTH + '" aria-describedby="gateErr">' +
        '<p class="g-err" id="gateErr" role="alert"></p>' +
        '<button type="button" id="gateBtn" disabled>開く</button>' +
        '<p class="g-note">このページは開発中のモックです。<br>PINは社内および開発部の担当者にご確認ください。</p>' +
      '</div>';
    document.body.appendChild(gate);

    var input = gate.querySelector('#gatePin');
    var btn = gate.querySelector('#gateBtn');
    var err = gate.querySelector('#gateErr');

    function unlock() {
      try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
      gate.remove();
      style.remove();
      hider.remove();
    }

    function submit() {
      if (hash(input.value) === PIN_HASH) {
        unlock();
      } else {
        err.textContent = 'PINコードが違います';
        gate.querySelector('.g-card').classList.add('shake');
        setTimeout(function () {
          gate.querySelector('.g-card').classList.remove('shake');
        }, 400);
        input.value = '';
        btn.disabled = true;
        input.focus();
      }
    }

    input.addEventListener('input', function () {
      input.value = input.value.replace(/\D/g, '').slice(0, PIN_LENGTH);
      err.textContent = '';
      btn.disabled = input.value.length !== PIN_LENGTH;
      if (input.value.length === PIN_LENGTH) submit();   // 4桁そろったら自動判定
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });
    btn.addEventListener('click', submit);

    input.focus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
