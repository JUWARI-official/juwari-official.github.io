/* =========================================================
   JUWARI 通常販売LP — main.js
   方針: CLAUDE.md §5（控えめなフェードのみ）/ §9（A11y・保守性）
   ========================================================= */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- ③ 解決策セクションの動画（旧FVのヒーロー動画を移設） ----------
     preload="none" のまま IntersectionObserver で「近づいた時だけ」srcを注入して読み込み・再生。
     FVの表示速度と一切競合しない。画面外に出たら一時停止して通信・電池を節約。
     モーション低減設定時は動画を読み込まず、背景の静止画（WebP）を表示し続ける */
  function initSolutionVideo() {
    const video = document.querySelector('.solution__video');
    if (!video) return;
    if (reduceMotion || !('IntersectionObserver' in window)) return; // 静止画のまま

    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      [['srcWebm', 'video/webm'], ['srcMp4', 'video/mp4']].forEach(([key, type]) => {
        const src = video.dataset[key];
        if (!src) return;
        const source = document.createElement('source');
        source.src = src;
        source.type = type;
        video.appendChild(source);
      });
      video.load();
    };

    video.addEventListener('playing', () => video.classList.add('is-playing'));

    new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          load();
          const p = video.play();
          if (p && p.catch) p.catch(() => {});
        } else {
          video.pause();
        }
      });
    }, { rootMargin: '300px 0px' }).observe(video);
  }

  /* ---------- スクロール・フェードイン（IntersectionObserver） ---------- */
  function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => io.observe(el));
  }

  /* ---------- ⑥ アンケートのバーを可視時にアニメーション ---------- */
  function initSurveyBars() {
    const fills = document.querySelectorAll('.survey__stats .fill');
    if (!fills.length) return;
    const set = (el) => { el.style.width = (el.dataset.pct || 0) + '%'; };
    if (reduceMotion || !('IntersectionObserver' in window)) { fills.forEach(set); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { set(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.4 });
    fills.forEach((el) => io.observe(el));
  }

  /* ---------- ⑩ FAQ アコーディオン ---------- */
  function initFaq() {
    const items = document.querySelectorAll('.faq__item');
    items.forEach((item) => {
      const btn = item.querySelector('.faq__q');
      const panel = item.querySelector('.faq__a');
      btn.addEventListener('click', () => {
        const isOpen = item.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(isOpen));
        panel.style.maxHeight = isOpen ? panel.scrollHeight + 'px' : '0px';
      });
    });
    // ウィンドウ幅変更で開いている項目の高さを再計算
    window.addEventListener('resize', () => {
      document.querySelectorAll('.faq__item.is-open .faq__a').forEach((p) => {
        p.style.maxHeight = p.scrollHeight + 'px';
      });
    });
  }

  /* ---------- 全成分アコーディオン（「全成分はこちら」） ---------- */
  function initAllIngredients() {
    document.querySelectorAll('.allingr').forEach((box) => {
      const btn = box.querySelector('.allingr__head');
      const body = box.querySelector('.allingr__body');
      if (!btn || !body) return;
      btn.addEventListener('click', () => {
        const isOpen = box.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(isOpen));
        body.style.maxHeight = isOpen ? body.scrollHeight + 'px' : '0px';
      });
    });
  }

  /* ---------- スマホ固定CTA：ヒーローを過ぎたら表示／フッター到達で退避 ---------- */
  function initStickyCta() {
    const cta = document.querySelector('.sticky-cta');
    const hero = document.querySelector('.hero');
    const footer = document.querySelector('.footer');
    if (!cta || !hero) return;
    if (!('IntersectionObserver' in window)) { cta.classList.add('is-shown'); return; }

    let pastHero = false;   // ヒーローを過ぎたか
    let atFooter = false;   // フッターが見えているか
    const update = () => cta.classList.toggle('is-shown', pastHero && !atFooter);

    new IntersectionObserver((e) => {
      pastHero = !e[0].isIntersecting;
      update();
    }, { threshold: 0.05 }).observe(hero);

    // フッターが少しでも見えたら固定CTAを隠し、最下部コンテンツとの重なりを防ぐ
    if (footer) {
      new IntersectionObserver((e) => {
        atFooter = e[0].isIntersecting;
        update();
      }, { threshold: 0 }).observe(footer);
    }
  }

  /* ---------- ① FVスライダー（CSSスクロールスナップ＋自動送り） ----------
     スワイプはブラウザネイティブ（JS介在なし＝ヌルヌル）。JSは「4.5秒ごとの自動送り」と
     「ドットの同期」だけを担当。触っている間は自動送りを止め、モーション低減設定では自動送りしない */
  function initHeroSlider() {
    const wrap = document.querySelector('.js-hero-slides');
    if (!wrap) return;
    const count = wrap.children.length;
    const dots = Array.from(document.querySelectorAll('.hero__dot'));
    let idx = 0;
    let timer = null;

    const go = (i) => {
      idx = (i + count) % count;
      wrap.scrollTo({ left: wrap.clientWidth * idx, behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    const sync = () => {
      const i = Math.round(wrap.scrollLeft / wrap.clientWidth);
      if (i >= 0 && i < count) idx = i;
      dots.forEach((d, k) => d.classList.toggle('is-on', k === idx));
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const start = () => {
      if (reduceMotion) return;           // モーション低減時は自動送りしない
      stop();
      timer = setInterval(() => go(idx + 1), 4500);
    };

    wrap.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
    // 指で触れたら自動送りを停止し、離れて少し経ったら再開
    wrap.addEventListener('touchstart', stop, { passive: true });
    wrap.addEventListener('touchend', () => setTimeout(start, 6000), { passive: true });
    dots.forEach((d, k) => d.addEventListener('click', () => { stop(); go(k); start(); }));

    sync();
    start();
  }

  /* ---------- ⑤ VOICE：JEWELの声（長文レビュー・HTML直書き） ----------
     HTMLに書かれた .voice-card を、初期は先頭2件だけ表示 →「もっと見る」で残りをその場で展開。
     全件表示したらボタンは消える。カードを増減してもJS側の修正は不要 */
  function initVoiceReviews() {
    const list = document.querySelector('.js-voice-list');
    const moreBtn = document.querySelector('.js-voice-more');
    if (!list || !moreBtn) return;

    const INITIAL = 2;   // 最初に見せる件数
    const cards = Array.from(list.querySelectorAll('.voice-card'));
    if (cards.length <= INITIAL) { moreBtn.style.display = 'none'; return; }

    cards.forEach((card, i) => { if (i >= INITIAL) card.hidden = true; });
    moreBtn.style.display = '';
    moreBtn.addEventListener('click', () => {
      cards.forEach((card) => { card.hidden = false; });
      moreBtn.style.display = 'none';
    });
  }

  /* ---------- ①-2 FV直下：吹き出しカードの自動スクロール ----------
     カード一式をJSで複製して2セットにし、CSSアニメーションで「1セット分」だけ左へ流す。
     1セット流し終えた瞬間に先頭へ戻るため、継ぎ目なくループして見える。
     速度は data-speed（1秒あたりの移動px）で調整。指を置く／マウスを載せる間は停止。
     モーション低減設定時は流さず、横スクロールで読める形（CSS側で制御） */
  function initBubbles() {
    const area = document.querySelector('.js-bubbles');
    const track = document.querySelector('.js-bubbles-track');
    if (!area || !track) return;
    if (reduceMotion) return;   // 流さない（CSSで横スクロール表示に切り替わる）

    const originals = Array.from(track.children);
    if (!originals.length) return;

    // 2セット目を複製（読み上げ・タブ移動の重複を避けるため支援技術からは隠す）
    originals.forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('a').forEach((a) => a.setAttribute('tabindex', '-1'));
      track.appendChild(clone);
    });

    // 1セット分の幅（＝移動距離）を「1枚目」と「複製した1枚目」の左端の差から実測する。
    // gapや端数の計算に頼らないので、フォント差・折り返し差があってもズレない
    const setup = () => {
      const first = track.children[0];
      const firstClone = track.children[originals.length];
      if (!first || !firstClone) return;
      const width = firstClone.getBoundingClientRect().left - first.getBoundingClientRect().left;
      if (width <= 0) return;
      const speed = parseFloat(area.dataset.speed) || 34;   // px / 秒
      track.style.setProperty('--bubbles-shift', width + 'px');
      track.style.setProperty('--bubbles-duration', (width / speed) + 's');
      area.classList.add('is-ready');
    };

    // Webフォントの反映・画面回転・リサイズでカード幅が変わると距離がズレるため、
    // 幅が変わるたびに測り直す（ResizeObserverが使えない環境はresizeイベントで代用）
    setup();
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => setup()).observe(track);
    } else {
      let timer;
      window.addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(setup, 200); }, { passive: true });
    }

    // 読んでいる間は止める
    const pause = () => area.classList.add('is-paused');
    const resume = () => area.classList.remove('is-paused');
    area.addEventListener('pointerenter', pause);
    area.addEventListener('pointerleave', resume);
    area.addEventListener('touchstart', pause, { passive: true });
    area.addEventListener('touchend', () => setTimeout(resume, 2500), { passive: true });
    // 画面外では動かさない（電池・CPUの節約）
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((e) => area.classList.toggle('is-paused', !e.isIntersecting));
      }, { threshold: 0 }).observe(area);
    }
  }

  /* ---------- アンカー着地の補正（LINEリッチメニュー等の #voice 直リンク用） ----------
     読み込み直後はレビュー等の非同期コンテンツで上部の高さが変わり、アンカー位置がズレるため、
     レイアウトが落ち着くタイミングで数回だけ着地位置を補正する。
     ユーザーが自分でスクロールし始めたら補正しない（操作を奪わない） */
  function initAnchorLanding() {
    if (!location.hash) return;
    let target;
    try { target = document.querySelector(location.hash); } catch (e) { return; }
    if (!target) return;
    let userMoved = false;
    const markMoved = () => { userMoved = true; };
    ['wheel', 'touchmove', 'pointerdown', 'keydown'].forEach((ev) =>
      window.addEventListener(ev, markMoved, { passive: true, once: true }));
    [500, 1400, 2600, 4200].forEach((ms) => setTimeout(() => {
      if (userMoved) return;
      const top = target.getBoundingClientRect().top;
      if (Math.abs(top - 24) > 30) target.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, ms));
  }

  /* ---------- 初期化 ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    initHeroSlider();
    initSolutionVideo();
    initReveal();
    initSurveyBars();
    initFaq();
    initAllIngredients();
    initStickyCta();
    initVoiceReviews();
    initBubbles();
    initAnchorLanding();
  });
})();
