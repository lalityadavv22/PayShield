import React from 'react';
import { AlertTriangle, Check, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { AnalysisReport } from '../types';

interface JevResultViewProps {
  report: AnalysisReport;
}

export const JevResultView: React.FC<JevResultViewProps> = ({ report }) => {
  const isFake = report.verdict === 'FAKE';
  const isSuspicious = report.verdict === 'SUSPICIOUS';
  const verdictTone = isFake ? 'risk' : isSuspicious ? 'caution' : 'safe';
  const verdictLabel = isFake ? 'Likely altered' : isSuspicious ? 'Needs review' : 'Looks consistent';
  const defaultTitle = isFake
    ? 'This receipt looks altered'
    : isSuspicious
      ? 'We couldn’t verify this receipt'
      : 'No obvious edits found';
  const containsHindi = (text: string) => /[\u0900-\u097F]/u.test(text);
  const verdictTitle = report.verdictTitle && !containsHindi(report.verdictTitle) ? report.verdictTitle : defaultTitle;
  const defaultSummary = isFake
    ? 'This screenshot raises concerns. Check your bank app before handing anything over.'
    : isSuspicious
      ? 'We couldn’t read the payment details. Check your bank app to confirm whether the money arrived.'
      : 'No obvious edits were found. Confirm the payment in your bank app.';
  const summary = report.summary && !containsHindi(report.summary) ? report.summary : defaultSummary;
  const verdictIcon = isFake
    ? <AlertTriangle aria-hidden="true" />
    : isSuspicious
      ? <AlertTriangle aria-hidden="true" />
      : <CheckCircle2 aria-hidden="true" />;
  const extracted = report.extracted;
  const redFlags = (report.redFlags || []).filter((flag) => !containsHindi(flag));
  const greenFlags = (report.greenFlags || []).filter((flag) => !containsHindi(flag));

  return (
    <div className="report-view">
      <section className={`verdict-panel verdict-${verdictTone}`} aria-label={`Receipt result: ${verdictLabel}`}>
        <div className="verdict-main">
          <div className={`verdict-icon verdict-icon-${verdictTone}`}>{verdictIcon}</div>
          <div className="verdict-copy">
            <span className={`verdict-tag verdict-tag-${verdictTone}`}>{verdictLabel}</span>
            <h2>{verdictTitle}</h2>
            <p>{summary}</p>
          </div>
        </div>

        <div className="recommendation-row">
          <span className="recommendation-icon"><ShieldCheck aria-hidden="true" /></span>
          <div>
            <strong>Check your bank app</strong>
            <p>A screenshot alone can’t confirm that the money arrived.</p>
          </div>
        </div>
      </section>

      <div className="report-metrics" aria-label="Details read from the screenshot">
        <article className="metric-card metric-amount">
          <span className="metric-label">Amount</span>
          <strong>{extracted?.amount && extracted.amount !== 'Not extracted' ? extracted.amount : 'Not found'}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Payment app</span>
          <strong>{extracted?.app === 'Spoof App / Unknown' ? 'Unknown app' : extracted?.app || 'Not found'}</strong>
        </article>
        <article className="metric-card metric-reference">
          <span className="metric-label">UPI reference</span>
          <strong title={extracted?.txnId || ''}>{extracted?.txnId || 'Not found'}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Date and time</span>
          <strong>{extracted?.dateTime && extracted.dateTime !== 'Not extracted' ? extracted.dateTime : 'Not found'}</strong>
        </article>
      </div>

      <section className="report-card findings-card">
        <div className="report-card-heading">
          <h3>What we noticed</h3>
        </div>
        <div className="finding-list">
          {redFlags.map((flag, index) => (
            <div className="finding-item finding-risk" key={`red-${index}`}>
              <span className="finding-icon"><X aria-hidden="true" /></span>
              <p>{flag}</p>
            </div>
          ))}
          {greenFlags.map((flag, index) => (
            <div className="finding-item finding-safe" key={`green-${index}`}>
              <span className="finding-icon"><Check aria-hidden="true" /></span>
              <p>{flag}</p>
            </div>
          ))}
          {redFlags.length === 0 && greenFlags.length === 0 && (
            <p className="finding-empty">No clear warning signs were returned. Check your bank app to confirm the payment.</p>
          )}
        </div>
      </section>
    </div>
  );
};
