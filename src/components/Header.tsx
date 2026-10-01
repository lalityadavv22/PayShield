import React from 'react';
import { ArrowUpRight, RefreshCw, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onReset: () => void;
  hasResult: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onReset, hasResult }) => {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand-lockup" href="#top" aria-label="PayShield home">
          <span className="brand-mark">
            <ShieldCheck aria-hidden="true" />
          </span>
          <span className="brand-copy">
            <span className="brand-name">PayShield<span className="brand-period">.</span></span>
          </span>
        </a>

        <nav className="header-nav" aria-label="Main navigation">
          <a href="#process">How it works</a>
          <a href="#developer">Developer</a>
        </nav>

        <div className="header-actions">
          {hasResult ? (
            <button className="header-cta" onClick={onReset} type="button">
              <RefreshCw aria-hidden="true" />
              <span>New receipt</span>
            </button>
          ) : (
            <a className="header-cta" href="#upload">
              <span>Check a receipt</span>
              <ArrowUpRight aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </header>
  );
};
