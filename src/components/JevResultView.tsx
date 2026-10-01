import React from 'react';
import { AlertTriangle, Check, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { AnalysisReport, PipelineStepResult } from '../types';
import { ScrollReveal } from './ScrollReveal';

interface JevResultViewProps {
  report: AnalysisReport;
}

type RuleStatus = 'passed' | 'warning' | 'failed';

interface RuleCheck {
  code: string;
  name: string;
  detail: string;
  status: RuleStatus;
}

const containsHindi = (text: string) => /[\u0900-\u097F]/u.test(text);
const safeCopy = (text: string | undefined, fallback: string) =>
  text && !containsHindi(text) ? text : fallback;

const ruleStatusLabel: Record<RuleStatus, string> = {
  passed: 'Clear',
  warning: 'Review',
  failed: 'Flagged',
};

const pipelineStatus = (step: PipelineStepResult) => {
  if (step.status === 'passed') return 'passed';
  if (step.status === 'failed') return 'failed';
  return 'warning';
};

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
  const verdictTitle = safeCopy(report.verdictTitle, defaultTitle);
  const defaultSummary = isFake
    ? 'This screenshot raises concerns. Check your bank app before handing anything over.'
    : isSuspicious
      ? 'We couldn’t read the payment details. Check your bank app to confirm whether the money arrived.'
      : 'No obvious edits were found. Confirm the payment in your bank app.';
  const summary = safeCopy(report.summary, defaultSummary);
  const defaultRecommendation = isFake
    ? 'Wait until the money appears in your bank app before handing anything over.'
    : 'A screenshot alone cannot confirm that the money arrived. Check your bank app or statement.';
  const recommendation = safeCopy(report.recommendation, defaultRecommendation);
  const verdictIcon = isFake
    ? <AlertTriangle aria-hidden="true" />
    : isSuspicious
      ? <AlertTriangle aria-hidden="true" />
      : <CheckCircle2 aria-hidden="true" />;
  const extracted = report.extracted;
  const redFlags = (report.redFlags || []).filter((flag) => !containsHindi(flag));
  const greenFlags = (report.greenFlags || []).filter((flag) => !containsHindi(flag));
  const pipelineSteps = (report.pipelineSteps || []).filter((step) => !containsHindi(step.name || ''));
  const score = Number.isFinite(report.overallScore) ? Math.max(0, Math.min(100, report.overallScore)) : 0;
  const scoreStyle = { '--score': `${score}%` } as React.CSSProperties;

  const hasReference = Boolean(extracted?.txnId && !containsHindi(extracted.txnId));
  const hasDate = Boolean(extracted?.dateTime && extracted.dateTime !== 'Not extracted' && !containsHindi(extracted.dateTime));
  const isDuplicate = Boolean(report.metadataInfo?.isDuplicateScreenshot || redFlags.some((flag) => /duplicate|already checked|re-used|reused/i.test(flag)));
  const hasVisualConcern = redFlags.some((flag) => /font|typography|layout|checkmark|tick mark/i.test(flag));
  const hasEditingConcern = redFlags.some((flag) => /edit|artifact|patch|photoshop|canva|compression/i.test(flag));
  const hasSpoofConcern = redFlags.some((flag) => /spoof|fakepay|fake app|fake-payment|template|prank/i.test(flag));
  const unknownScan = isSuspicious && !hasReference && !hasDate;

  const rules: RuleCheck[] = [
    {
      code: 'JEV-R101',
      name: 'Payment reference',
      detail: !hasReference
        ? 'No payment reference could be read.'
        : extracted.isTxnIdStandardLength
          ? 'The reference follows the expected format.'
          : 'The reference may be incomplete or unusual.',
      status: !hasReference ? 'warning' : extracted.isTxnIdStandardLength ? 'passed' : 'failed',
    },
    {
      code: 'JEV-R204',
      name: 'Layout and text',
      detail: hasVisualConcern
        ? 'A visual mismatch was noted in the screenshot.'
        : unknownScan ? 'There was not enough detail to compare the layout.' : 'No layout mismatch was reported.',
      status: hasVisualConcern ? 'failed' : unknownScan ? 'warning' : 'passed',
    },
    {
      code: 'JEV-R302',
      name: 'Editing signs',
      detail: hasEditingConcern
        ? 'Possible editing marks were found.'
        : unknownScan ? 'There was not enough detail to check for editing.' : 'No editing marks were reported.',
      status: hasEditingConcern ? 'failed' : unknownScan ? 'warning' : 'passed',
    },
    {
      code: 'JEV-R408',
      name: 'Date and time',
      detail: extracted?.isFutureDate
        ? 'The receipt date appears to be in the future.'
        : hasDate ? 'The date does not appear to be in the future.' : 'No date could be checked.',
      status: extracted?.isFutureDate ? 'failed' : hasDate ? 'passed' : 'warning',
    },
    {
      code: 'JEV-R512',
      name: 'Fake-app signals',
      detail: hasSpoofConcern
        ? 'A known fake-payment pattern was reported.'
        : unknownScan ? 'There was not enough detail to check the app.' : 'No fake-app pattern was reported.',
      status: hasSpoofConcern ? 'failed' : unknownScan ? 'warning' : 'passed',
    },
    {
      code: 'JEV-R601',
      name: 'Repeat screenshot',
      detail: isDuplicate ? 'This screenshot was already checked in this session.' : 'No repeat screenshot was found in this session.',
      status: isDuplicate ? 'failed' : 'passed',
    },
  ];

  const metrics = [
    { label: 'Amount', value: extracted?.amount && extracted.amount !== 'Not extracted' && !containsHindi(extracted.amount) ? extracted.amount : 'Not found', className: 'metric-amount' },
    { label: 'Payment app', value: extracted?.app === 'Spoof App / Unknown' ? 'Unknown app' : extracted?.app || 'Not found', className: '' },
    { label: 'UPI reference', value: hasReference ? extracted.txnId : 'Not found', className: 'metric-reference' },
    { label: 'Date and time', value: hasDate ? extracted.dateTime : 'Not found', className: '' },
    ...(extracted?.recipientName && !containsHindi(extracted.recipientName) ? [{ label: 'Paid to', value: extracted.recipientName, className: '' }] : []),
    ...(extracted?.senderName && !containsHindi(extracted.senderName) ? [{ label: 'Paid by', value: extracted.senderName, className: '' }] : []),
    ...(extracted?.upiId && !containsHindi(extracted.upiId) ? [{ label: 'UPI ID', value: extracted.upiId, className: 'metric-reference' }] : []),
    ...(extracted?.statusText && extracted.statusText !== 'Unverified' && !containsHindi(extracted.statusText) ? [{ label: 'Receipt status', value: extracted.statusText, className: '' }] : []),
  ];

  return (
    <div className="report-view">
      <ScrollReveal className="report-reveal" delay={40}>
        <section className={`verdict-panel verdict-${verdictTone}`} aria-label={`JEV result: ${verdictLabel}`}>
          <div className="verdict-main">
            <div className={`verdict-icon verdict-icon-${verdictTone}`}>{verdictIcon}</div>
            <div className="verdict-copy">
              <span className={`verdict-tag verdict-tag-${verdictTone}`}>{verdictLabel}</span>
              <h2>{verdictTitle}</h2>
              <p>{summary}</p>
            </div>
            <div className="score-gauge" style={scoreStyle} aria-label={`JEV score ${score} out of 100`}>
              <div className="score-gauge-inner">
                <span className="score-label">JEV score</span>
                <strong>{score}</strong>
                <span className="score-out-of">/ 100</span>
              </div>
            </div>
          </div>

          <div className="recommendation-row">
            <span className="recommendation-icon"><ShieldCheck aria-hidden="true" /></span>
            <div>
              <strong>What to do next</strong>
              <p>{recommendation}</p>
            </div>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal className="report-reveal" delay={90}>
        <div className="report-metrics" aria-label="Details read from the screenshot">
          {metrics.map((metric) => (
            <article className={`metric-card ${metric.className}`} key={metric.label}>
              <span className="metric-label">{metric.label}</span>
              <strong title={metric.value}>{metric.value}</strong>
            </article>
          ))}
        </div>
      </ScrollReveal>

      <ScrollReveal className="report-detail-grid" delay={140}>
        <section className="report-card findings-card result-findings">
          <div className="report-card-heading"><h3>What JEV noticed</h3></div>
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
              <p className="finding-empty">No clear warning signs were returned. Confirm the payment in your bank app.</p>
            )}
          </div>
        </section>

        <section className="report-card rules-card">
          <div className="report-card-heading">
            <div>
              <h3>JEV checks</h3>
              <p>Conditions used for this result</p>
            </div>
            <span className="rule-count">{rules.filter((rule) => rule.status === 'passed').length}<span> / {rules.length} clear</span></span>
          </div>
          <div className="rule-list">
            {rules.map((rule) => (
              <div className={`rule-row rule-${rule.status}`} key={rule.code}>
                <span className="rule-code">{rule.code}</span>
                <span className="rule-name">{rule.name}<small>{rule.detail}</small></span>
                <span className={`rule-status-label rule-status-${rule.status}`}>
                  {rule.status === 'passed' ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
                  {ruleStatusLabel[rule.status]}
                </span>
              </div>
            ))}
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal className="pipeline-reveal" delay={210}>
        <section className="report-card pipeline-card">
          <div className="report-card-heading">
            <div>
              <h3>JEV tool results</h3>
              <p>Seven steps behind this receipt check</p>
            </div>
            <span className="pipeline-total">{pipelineSteps.length || 0} steps</span>
          </div>
          {pipelineSteps.length > 0 ? (
            <div className="pipeline-grid">
              {pipelineSteps.map((step) => {
                const status = pipelineStatus(step);
                const statusLabel = status === 'passed' ? 'Clear' : status === 'failed' ? 'Flagged' : 'Review';
                const stepName = safeCopy(step.name, `Step ${step.id}`);
                const stepDescription = safeCopy(step.details, safeCopy(step.description, 'No extra details for this step.'));
                const stepScore = Number.isFinite(step.score) ? Math.max(0, Math.min(100, step.score)) : 0;
                return (
                  <article className={`pipeline-step pipeline-${status}`} key={step.id}>
                    <div className="pipeline-step-topline">
                      <span className="pipeline-number">Step {String(step.id).padStart(2, '0')}</span>
                      <span className="pipeline-status">{statusLabel}</span>
                    </div>
                    <h4>{stepName}</h4>
                    <p>{stepDescription}</p>
                    <div className="pipeline-score-row">
                      <span className="pipeline-score-track"><span style={{ width: `${stepScore}%` }} /></span>
                      <span>{stepScore}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="finding-empty">Step-by-step details were not returned for this scan.</p>
          )}
        </section>
      </ScrollReveal>
    </div>
  );
};
