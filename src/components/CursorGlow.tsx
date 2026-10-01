import React, { useEffect, useRef } from 'react';

export const CursorGlow: React.FC = () => {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = glowRef.current;
    const canHover = window.matchMedia('(pointer: fine)').matches;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!glow || !canHover || reduceMotion) return;

    let frame = 0;
    let visible = false;
    const target = { x: -240, y: -240 };
    const current = { x: -240, y: -240 };

    const onPointerMove = (event: PointerEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;
      if (!visible) {
        visible = true;
        glow.classList.add('is-visible');
      }
    };

    const onPointerLeave = () => {
      visible = false;
      glow.classList.remove('is-visible');
    };

    const animate = () => {
      current.x += (target.x - current.x) * 0.16;
      current.y += (target.y - current.y) * 0.16;
      glow.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
      frame = window.requestAnimationFrame(animate);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);
    frame = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={glowRef} className="cursor-glow" aria-hidden="true">
      <span className="cursor-glow-outer" />
      <span className="cursor-glow-inner" />
      <span className="cursor-glow-point" />
    </div>
  );
};
