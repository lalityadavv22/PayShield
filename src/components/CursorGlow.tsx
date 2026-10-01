import React, { useEffect, useState, useRef } from 'react';

export const CursorGlow: React.FC = () => {
  const [position, setPosition] = useState({ x: -200, y: -200 });
  const [isVisible, setIsVisible] = useState(false);
  const targetRef = useRef({ x: -200, y: -200 });
  const currentRef = useRef({ x: -200, y: -200 });
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Only run on devices with a mouse/fine pointer
    if (typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    // Smooth lerp loop for buttery cursor animation
    const animate = () => {
      const ease = 0.12; // Smooth damping
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * ease;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * ease;

      setPosition({
        x: Math.round(currentRef.current.x),
        y: Math.round(currentRef.current.y),
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className="pointer-events-none fixed z-30 transition-opacity duration-500 will-change-transform"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
        opacity: isVisible ? 1 : 0,
      }}
    >
      {/* Primary soft emerald ambient spotlight */}
      <div className="w-[480px] h-[480px] rounded-full bg-emerald-500/[0.045] blur-[100px]" />
      {/* Inner subtle glow */}
      <div className="absolute inset-0 w-[240px] h-[240px] m-auto rounded-full bg-teal-400/[0.035] blur-[60px]" />
    </div>
  );
};
