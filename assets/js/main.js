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

  /* ---------- ⑤ VOICE：Judge.me公式Widgets APIによるカスタムレビュー表示 ----------
     公開トークンのWidgets API（CORS許可済み・Publishedレビューのみ返る）から実レビューHTMLを取得。
     仕様: 読み込み時に全件をランダム順へ並び替え（閲覧中は順序固定）→1件だけ表示→
     「もっと見る」で5件ずつその場展開（重複なし・リロードなし）→全件表示後はボタン非表示。
     レビューが増えても自動反映（ハードコーディングなし） */
  function initVoiceReviews() {
    const list = document.querySelector('.js-voice-list');
    const moreBtn = document.querySelector('.js-voice-more');
    if (!list || !moreBtn) return;

    const TOKEN = 'LHK6Tu4tuP8HMSigYrlookmAwbk';
    const SHOP = 'qzkx7z-qc.myshopify.com';
    const PER_PAGE = 10;   // APIの1ページあたり件数（Judge.me既定）
    const STEP = 5;        // 「もっと見る」1回で追加する件数
    let pool = [];
    let shown = 0;

    // カード内の不要要素を除去し、ウィジェットJSなしでも完全表示になるよう整える
    const clean = (rev) => {
      rev.querySelectorAll('.jdgm-rev__prod-info-wrapper, .jdgm-rev__transparency-badge-wrapper, .jdgm-rev__actions, .jdgm-rev__reply, .jdgm-rev__custom-form').forEach((e) => e.remove());
      const ts = rev.querySelector('.jdgm-rev__timestamp');
      if (ts) {
        const d = new Date((ts.dataset.content || '').replace(' UTC', ' GMT').replace(/-/g, '/'));
        ts.textContent = isNaN(d) ? '' : ((d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear());
        ts.classList.remove('jdgm-spinner');
      }
      rev.querySelectorAll('img[data-src]').forEach((img) => { img.src = img.getAttribute('data-src'); });
      rev.querySelectorAll('.jdgm--loading').forEach((e) => e.classList.remove('jdgm--loading'));
      return rev;
    };

    const show = (n) => {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < n && shown < pool.length; i++, shown++) frag.appendChild(clean(pool[shown]));
      list.appendChild(frag);
      moreBtn.style.display = shown < pool.length ? '' : 'none';
    };

    const fetchPage = (page) =>
      fetch('https://api.judge.me/api/v1/widgets/all_reviews_page?api_token=' + TOKEN + '&shop_domain=' + SHOP + '&page=' + page)
        .then((r) => r.json())
        .then((j) => {
          const tmp = document.createElement('div');
          tmp.innerHTML = j.all_reviews || '';
          return Array.from(tmp.querySelectorAll('.jdgm-rev'));
        });

    (async () => {
      try {
        // 全ページ取得（安全上限10ページ=100件）→ Fisher-Yatesでランダム順に
        let all = [];
        for (let page = 1; page <= 10; page++) {
          const revs = await fetchPage(page);
          all = all.concat(revs);
          if (revs.length < PER_PAGE) break;
        }
        for (let i = all.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const t = all[i]; all[i] = all[j]; all[j] = t;
        }
        pool = all;
        if (!pool.length) { moreBtn.style.display = 'none'; return; }
        // 最初の1件は★5レビュー限定：シャッフル済み配列の先頭に、最初に見つかった★5を移動
        // （シャッフル後なので「★5の中からランダムに1件」と等価。★5が無い場合はそのまま先頭を表示）
        const idx5 = pool.findIndex((rev) => {
          const r = rev.querySelector('.jdgm-rev__rating');
          return r && r.getAttribute('data-score') === '5';
        });
        if (idx5 > 0) { const t = pool[0]; pool[0] = pool[idx5]; pool[idx5] = t; }
        show(1);   // 初期表示は★5からランダムに1件
      } catch (e) {
        moreBtn.style.display = 'none';
      }
    })();

    moreBtn.addEventListener('click', () => show(STEP));
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
  });
})();
