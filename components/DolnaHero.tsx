'use client';

import { useEffect, useRef } from 'react';
import styles from './DolnaHero.module.css';

type Axis = 'depth' | 'flat' | 'both';

// Fraction of the vertical OVERFLOW (art height minus container height,
// after zoom) to shift the centered art down, rather than a fraction of
// container height. zoomFor() makes the overflow itself much bigger on
// narrow screens (1.9x/1.55x zoom vs 1x on desktop); anchoring the offset to
// that overflow — instead of to container height — keeps the top/bottom
// crop split at the same ratio (0.5 - ART_Y_OFFSET) / (0.5 + ART_Y_OFFSET)
// at every breakpoint, so one tuned value holds everywhere.
// Positive = down (more bottom crop, less top crop). Negative = up.
// Must stay in (-0.5, 0.5) — at ±0.5 one edge's crop hits zero.
const ART_Y_OFFSET = 0.06;

export type DolnaHeroProps = {
  /** swing angle in degrees at full amplitude */
  amplitude?: number;
  /** seconds for one full back-and-forth */
  period?: number;
  /** how fast it settles; higher = stops sooner */
  damping?: number;
  /** negative value that feeds energy in while active */
  pump?: number;
  /** how much the swing grows coming toward the viewer (0.05 - 1.2) */
  depth?: number;
  /** pixels it sinks coming toward the viewer */
  drop?: number;
  /** pivot on the artwork, as % of the 16:9 stage */
  pivotX?: number;
  pivotY?: number;
  /** desktop crop scale on top of the 16:9 cover box (narrow screens override this) */
  zoom?: number;
  /** 'depth' = forward/back, 'flat' = side to side, 'both' = mostly forward with a tilt */
  axis?: Axis;
  /** keep swinging forever instead of settling to rest */
  loop?: boolean;
  bgSrc?: string;
  swingSrc?: string;
  className?: string;
};

export default function DolnaHero({
  amplitude = 5,
  period = 3.2,
  damping = 1.2,
  pump = -0.1,
  depth = 0.3,
  drop = 26,
  pivotX = 52.2,
  pivotY = 25,
  zoom = 1,
  axis = 'depth',
  loop = true,
  bgSrc = '/images/dolna-bg.webp',
  swingSrc = '/images/dolna-swing.webp',
  className = '',
}: DolnaHeroProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const swingRef = useRef<HTMLImageElement>(null);
  const stagesRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    const el = swingRef.current;
    if (!root || !el) return;

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

    // ---- narrow screens need a tighter crop than desktop to keep the
    //      couple framed; based on the root's own width, not the viewport.
    //      1.3 on both mobile and tablet — 1.9/1.55 cropped too deep into
    //      the swing seat even with the ART_Y_OFFSET nudge below.
    const zoomFor = (w: number) => (w < 640 ? 1.3 : w < 1024 ? 1.3 : zoom);

    // ---- keep every stage an exact 16:9 box that covers the hero, so the
    //      pivot percentages land on the artwork and not on letterbox bars
    const layout = () => {
      const w = root.clientWidth;
      const h = root.clientHeight;
      const R = 16 / 9;
      const z = zoomFor(w);
      const [bw, bh] = w / h >= R ? [w, w / R] : [h * R, h];
      const sw = bw * z;
      const sh = bh * z;
      const excess = sh - h; // vertical overflow to crop, after zoom
      const yOffset = -excess / 2 + excess * ART_Y_OFFSET;
      stagesRef.current.forEach((n) => {
        if (!n) return;
        n.style.width = `${sw}px`;
        n.style.height = `${sh}px`;
        n.style.transform = `translate(-50%, ${yOffset.toFixed(2)}px)`;
      });
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(root);

    // ---- damped harmonic oscillator, interruptible from any angle
    let theta = 0;
    let vel = 0;
    let state: 'REST' | 'SWINGING' | 'SETTLING' = 'REST';
    let raf = 0;
    let last = 0;
    let tapTimer: ReturnType<typeof setTimeout> | undefined;

    const start = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    function tick(now: number) {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.05) dt = 0.05; // guard against tab-switch jumps

      const w = (2 * Math.PI) / period;
      const pumping = state === 'SWINGING' && Math.abs(theta) < amplitude;
      const c = pumping ? pump : damping;

      const acc = -(w * w) * theta - c * vel;
      vel += acc * dt;
      theta += vel * dt;

      const sn = Math.sin((theta * Math.PI) / 180);
      const sc = 1 + depth * sn;
      const dy = drop * sn;

      el!.style.transform =
        axis === 'depth'
          ? `translateY(${dy.toFixed(2)}px) scale(${sc.toFixed(5)})`
          : axis === 'both'
            ? `translateY(${dy.toFixed(2)}px) scale(${sc.toFixed(5)}) rotate(${(theta * 0.4).toFixed(3)}deg)`
            : `rotate(${theta.toFixed(4)}deg)`;

      if (state !== 'SWINGING' && Math.abs(theta) < 0.05 && Math.abs(vel) < 0.05) {
        theta = 0;
        vel = 0;
        el!.style.transform = 'none';
        state = 'REST';
        stop();
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    // a pendulum at dead rest needs a push — negative damping cannot start it
    const seed = () => {
      if (Math.abs(theta) < 0.02 && Math.abs(vel) < 0.02) {
        vel = amplitude * ((2 * Math.PI) / period) * 0.6;
      }
    };
    const swing = () => {
      state = 'SWINGING';
      seed();
      start();
    };
    const settle = () => {
      if (loop) return;
      if (state === 'SWINGING') state = 'SETTLING';
    };
    const intro = () => {
      theta = amplitude * 1.5;
      vel = 0;
      state = 'SETTLING';
      start();
    };

    let io: IntersectionObserver | undefined;

    if (!reduce) {
      if (canHover) {
        root.addEventListener('mouseenter', swing);
        root.addEventListener('mouseleave', settle);
        loop ? swing() : intro();
      } else {
        io = new IntersectionObserver(
          (e) => {
            if (e[0].isIntersecting) {
              loop ? swing() : intro();
              io?.disconnect();
            }
          },
          { threshold: 0.4 },
        );
        io.observe(root);
        root.addEventListener('click', () => {
          swing();
          clearTimeout(tapTimer);
          tapTimer = setTimeout(settle, period * 3000);
        });
      }
    }

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (state !== 'REST') start();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      ro.disconnect();
      io?.disconnect();
      clearTimeout(tapTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      root.removeEventListener('mouseenter', swing);
      root.removeEventListener('mouseleave', settle);
    };
  }, [amplitude, period, damping, pump, depth, drop, zoom, axis, loop]);

  const setStage = (i: number) => (n: HTMLDivElement | null) => {
    if (n) stagesRef.current[i] = n;
  };

  return (
    <div ref={rootRef} className={`${styles.root} ${className}`} aria-hidden="true">
      <div ref={setStage(0)} className={styles.stage}>
        <img className={styles.layer} src={bgSrc} alt="" draggable={false} />
        <img
          ref={swingRef}
          className={styles.layer}
          src={swingSrc}
          alt=""
          draggable={false}
          style={{ transformOrigin: `${pivotX}% ${pivotY}%` }}
        />
      </div>
      <div className={styles.scrim} />
    </div>
  );
}
