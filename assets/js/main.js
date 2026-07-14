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

  /* ---------- 初期化 ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    initSolutionVideo();
    initReveal();
    initSurveyBars();
    initFaq();
    initAllIngredients();
    initStickyCta();
  });
})();
