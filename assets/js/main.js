/* =========================================================
   JUWARI 通常販売LP — main.js
   方針: CLAUDE.md §5（控えめなフェードのみ）/ §9（A11y・保守性）
   ========================================================= */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- ① ヒーロー動画：3本をフェードで順送り ---------- */
  function initHeroVideos() {
    const videos = Array.from(document.querySelectorAll('.hero__video'));
    if (!videos.length) return;

    let current = 0;
    const SEGMENT = 6000; // 1本あたりの表示時間(ms)。動画尺に合わせて調整可

    videos[0].classList.add('is-active');
    const play = (v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    play(videos[0]);

    // モーション低減時は1本目を静止表示するだけ（切替アニメなし）
    if (reduceMotion || videos.length < 2) return;

    setInterval(() => {
      const next = (current + 1) % videos.length;
      const nextVideo = videos[next];
      try { nextVideo.currentTime = 0; } catch (e) {}
      play(nextVideo);
      nextVideo.classList.add('is-active');
      videos[current].classList.remove('is-active');
      current = next;
    }, SEGMENT);
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
    initHeroVideos();
    initReveal();
    initSurveyBars();
    initFaq();
    initAllIngredients();
    initStickyCta();
  });
})();
