import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = () => matchMedia('(pointer: coarse)').matches;

/**
 * The front page's motion: smooth scroll, word reveals, the pinned before/after scene, the sideways gallery,
 * a gold cursor and magnetic buttons. Returns a cleanup for when the page unmounts (she signed in).
 * With reduced motion nothing moves and everything is simply shown.
 */
export function startMotion(root: HTMLElement): () => void {
  if (calm()) {
    root.classList.add('still');
    return () => root.classList.remove('still');
  }
  root.classList.add('moving');
  // the demo switch bar sits on top; pinned scenes start just under it
  const top = (document.querySelector('.demo-bar') as HTMLElement | null)?.offsetHeight ?? 0;
  const rtl = document.documentElement.dir !== 'ltr';

  const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  const raf = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  const cleanups: (() => void)[] = [];
  // in-page links glide to their section and stop just under the top bar; the booking form takes the focus
  const jump = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    const target = a && root.querySelector<HTMLElement>(a.getAttribute('href')!);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, {
      offset: -top - 96, // room for the gold monogram that sits on top of the form
      duration: 1.6,
      onComplete: () => target.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true }),
    });
  };
  root.addEventListener('click', jump);
  cleanups.push(() => root.removeEventListener('click', jump));
  const ctx = gsap.context(() => {
    gsap.defaults({ ease: 'power3.out', duration: 0.9 });

    // hero: the logo surfaces from the dark, then the line, then the buttons
    gsap
      .timeline({ delay: 0.15 })
      .fromTo('.hero-logo', { autoAlpha: 0, scale: 0.92, filter: 'blur(14px)' }, { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 1.8, ease: 'expo.out' })
      .fromTo('.hero [data-hero]', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.12, ease: 'power4.out' }, '-=1.1');
    // and drifts up a little slower than the page as she scrolls away
    gsap.to('.hero-logo', { yPercent: -14, scale: 0.94, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.2 } });

    // words rise one after another
    gsap.utils.toArray<HTMLElement>('[data-words]').forEach((el) => {
      const words = el.querySelectorAll('.w > i');
      gsap.fromTo(words, { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.06, scrollTrigger: { trigger: el, start: 'top 84%', once: true } });
    });
    gsap.utils.toArray<HTMLElement>('[data-rise]').forEach((el) => {
      gsap.fromTo(el, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1.05, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
    });
    gsap.utils.toArray<HTMLElement>('[data-stagger]').forEach((el) => {
      gsap.fromTo(el.children, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.95, ease: 'power4.out', stagger: 0.07, scrollTrigger: { trigger: el, start: 'top 84%', once: true } });
    });

    // before/after: the scene holds still while scrolling wipes "after" across "before", one client after another
    const scene = root.querySelector<HTMLElement>('.ba-scene');
    if (scene) {
      const pairs = gsap.utils.toArray<HTMLElement>('.ba-scene .pair');
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: scene, start: `top ${top}px`, end: () => `+=${pairs.length * window.innerHeight * 1.1}`, scrub: 1, pin: true, anticipatePin: 1, invalidateOnRefresh: true },
      });
      const from = rtl ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)';
      pairs.forEach((p, n) => {
        const after = p.querySelector('.after');
        const line = p.querySelector('.wipe-line');
        // the next client fades in over the last one (each pair sits above the one before it)
        if (n > 0) tl.fromTo(p, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45 });
        tl.fromTo(after, { clipPath: from }, { clipPath: 'inset(0 0% 0 0%)', duration: 1 }, n > 0 ? '<0.1' : 0)
          .fromTo(line, { [rtl ? 'right' : 'left']: '0%', autoAlpha: 1 }, { [rtl ? 'right' : 'left']: '100%', autoAlpha: 0.0, duration: 1 }, '<')
          .fromTo(p.querySelector('.lbl-before'), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.4 }, '<0.3')
          .fromTo(p.querySelector('.lbl-after'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.4 }, '<0.2')
          .to(root.querySelectorAll('.ba-dots i')[n], { backgroundColor: '#e9cf8a', scale: 1.4, duration: 0.2 }, '<')
          .to({}, { duration: 0.35 });
      });
    }

    // gallery: on a desktop the strip slides sideways while the section holds; on a phone it is a swipe strip
    const gal = root.querySelector<HTMLElement>('.gallery');
    const track = root.querySelector<HTMLElement>('.gallery .track');
    if (gal && track && !touch()) {
      gsap.to(track, {
        x: () => (rtl ? 1 : -1) * Math.max(0, track.scrollWidth - gal.clientWidth),
        ease: 'none',
        scrollTrigger: { trigger: gal, start: `top ${top}px`, end: () => `+=${track.scrollWidth}`, scrub: 1, pin: true, anticipatePin: 1, invalidateOnRefresh: true },
      });
    }

    // magnetic buttons and the gold cursor, for a mouse only
    if (!touch()) {
      root.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
        const xTo = gsap.quickTo(el, 'x', { duration: 0.45 });
        const yTo = gsap.quickTo(el, 'y', { duration: 0.45 });
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          xTo((e.clientX - r.left - r.width / 2) * 0.2);
          yTo((e.clientY - r.top - r.height / 2) * 0.3);
        };
        const leave = () => (xTo(0), yTo(0));
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);
        cleanups.push(() => (el.removeEventListener('pointermove', move), el.removeEventListener('pointerleave', leave)));
      });
      const cursor = root.querySelector<HTMLElement>('.cursor');
      if (cursor) {
        const cx = gsap.quickTo(cursor, 'x', { duration: 0.35 });
        const cy = gsap.quickTo(cursor, 'y', { duration: 0.35 });
        const move = (e: PointerEvent) => (cx(e.clientX), cy(e.clientY));
        const over = (e: PointerEvent) => cursor.classList.toggle('big', !!(e.target as HTMLElement).closest('a, button, label'));
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerover', over);
        cleanups.push(() => (window.removeEventListener('pointermove', move), window.removeEventListener('pointerover', over)));
      }
    }
  }, root);

  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener('load', refresh);
  document.fonts?.ready.then(refresh);

  return () => {
    window.removeEventListener('load', refresh);
    cleanups.forEach((c) => c());
    ctx.revert();
    gsap.ticker.remove(raf);
    lenis.destroy();
    root.classList.remove('moving');
  };
}
