import React from 'react';
import { ArrowUpRight, Github, Linkedin } from 'lucide-react';

const portfolioUrl = 'https://lalityadav.vercel.app/';

export const DeveloperFooter: React.FC = () => {
  return (
    <footer className="site-footer" id="developer">
      <div className="footer-inner">
        <div className="footer-main">
          <p className="developer-credit">
            Developed by{' '}
            <a
              className="developer-name"
              href={portfolioUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Lalit Yadav’s portfolio"
            >
              Lalit Yadav <ArrowUpRight aria-hidden="true" />
            </a>
          </p>

          <nav className="developer-socials" aria-label="Lalit Yadav’s social profiles">
            <a
              href="https://github.com/lalityadavv22"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Lalit Yadav on GitHub"
            >
              <Github aria-hidden="true" />
              <span>GitHub</span>
              <ArrowUpRight aria-hidden="true" />
            </a>
            <a
              href="https://www.linkedin.com/in/lalit-yadav-823349327/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Lalit Yadav on LinkedIn"
            >
              <Linkedin aria-hidden="true" />
              <span>LinkedIn</span>
              <ArrowUpRight aria-hidden="true" />
            </a>
          </nav>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} PayShield</span>
        </div>
      </div>
    </footer>
  );
};
