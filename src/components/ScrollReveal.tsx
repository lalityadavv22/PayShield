import React, { useEffect, useRef } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({ children, className = '', delay = 0 }) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      element.classList.add('is-visible');
      return;
    }

    element.style.setProperty('--reveal-delay', `${delay}ms`);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        element.classList.add('is-visible');
        observer.disconnect();
      },
      { threshold: 0.14, rootMargin: '0px 0px -32px 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [delay]);

  return <div ref={elementRef} className={`scroll-reveal ${className}`}>{children}</div>;
};
