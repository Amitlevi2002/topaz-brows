import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = () => matchMedia('(pointer: coarse)').matches;

/**
 * The front page's motion. Scrolling itself is left alone: nothing pins, nothing takes over the wheel.
 * Things only appear as she reaches them: the logo surfacing, headings rising, the gold cursor and magnetic buttons.
 * Returns a cleanup for when the page unmounts (she signed in). With reduced motion nothing moves at all.
 */
export function startMotion(root: HTMLElement): () => void {
  const top = (document.querySelector('.demo-bar') as HTMLElement | null)?.offsetHeight ?? 0;
  const cleanups: (() => void)[] = [];

  // in-page links go to their section just under the top bar; the booking form takes the focus
  const jump = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    const target = a && root.querySelector<HTMLElement>(a.getAttribute('href')!);
    if (!target) return;
    e.preventDefault();
    const y = target.getBoundingClientRect().top + window.scrollY - top - 90; // room for the monogram above the form
    window.scrollTo({ top: y, behavior: calm() ? 'auto' : 'smooth' });
    setTimeout(() => target.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true }), calm() ? 0 : 700);
  };
  root.addEventListener('click', jump);
  cleanups.push(() => root.removeEventListener('click', jump));

  if (calm()) {
    root.classList.add('still');
    return () => (cleanups.forEach((c) => c()), root.classList.remove('still'));
  }
  root.classList.add('moving');

  const ctx = gsap.context(() => {
    gsap.defaults({ ease: 'power3.out', duration: 0.9 });

    // hero: the logo surfaces from the dark, then the line, then the buttons
    gsap
      .timeline({ delay: 0.15 })
      .fromTo('.hero-logo', { autoAlpha: 0, scale: 0.92, filter: 'blur(14px)' }, { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 1.8, ease: 'expo.out' })
      .fromTo('.hero [data-hero]', { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.12, ease: 'power4.out' }, '-=1.1');

    // headings rise line by line, blocks and lists fade up, once, as she reaches them
    gsap.utils.toArray<HTMLElement>('[data-words]').forEach((el) => {
      gsap.fromTo(el.querySelectorAll('.w > i'), { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.06, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    gsap.utils.toArray<HTMLElement>('[data-rise]').forEach((el) => {
      gsap.fromTo(el, { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    gsap.utils.toArray<HTMLElement>('[data-stagger]').forEach((el) => {
      gsap.fromTo(el.children, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power4.out', stagger: 0.06, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });

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
    root.classList.remove('moving');
  };
}
