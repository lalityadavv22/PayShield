import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertOctagon, AlertTriangle, Cpu, Building2, Search, Check, X, Shield, ArrowRight } from 'lucide-react';
import { AnalysisReport } from '../types';

interface JevResultViewProps {
  report: AnalysisReport;
}

export const JevResultView: React.FC<JevResultViewProps> = ({ report }) => {
  const [searchUtr, setSearchUtr] = useState<string>(report.extracted.txnId || '');
  const [bankResult, setBankResult] = useState<{
    checked: boolean;
    found: boolean;
    message: string;
  } | null>(null);
  const [isCheckingBank, setIsCheckingBank] = useState<boolean>(false);

  const isFake = report.verdict === 'FAKE';
  const isSuspicious = report.verdict === 'SUSPICIOUS';
  const isGenuine = report.verdict === 'GENUINE';

  useEffect(() => {
    setSearchUtr(report.extracted.txnId || '');
    setBankResult(null);
  }, [report.extracted.txnId]);

  const handleBankCheck = async () => {
    if (!searchUtr) return;
    setIsCheckingBank(true);
    try {
      const res = await fetch('/api/reconcile-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utrNumber: searchUtr.trim(),
          amount: report.extracted.amount,
        }),
      });
      const data = await res.json();
      setBankResult({
        checked: true,
        found: data.found,
        message: data.message,
      });
    } catch {
      setBankResult({
        checked: true,
        found: false,
        message: 'Could not connect to bank gateway.',
      });
    } finally {
      setIsCheckingBank(false);
    }
  };

  // Jev AI Rules evaluated dynamically
  const jevRules = [
    {
      code: 'JEV-R101',
      name: '12-Digit NPCI UTR Standard',
      desc: 'Checks 12-digit numeric length and gateway character structure.',
      passed: report.extracted.isTxnIdStandardLength,
    },
    {
      code: 'JEV-R204',
      name: 'Typography & Layout Alignment',
      desc: 'Evaluates Google Sans / Roboto font weight, alignment, and kerning.',
      passed: !report.redFlags.some((f) => f.toLowerCase().includes('font')),
    },
    {
      code: 'JEV-R302',
      name: 'Compression Uniformity & Canva Tags',
      desc: 'Detects isolated patch compression around amount text.',
      passed: !report.redFlags.some((f) => f.toLowerCase().includes('compression') || f.toLowerCase().includes('canva')),
    },
    {
      code: 'JEV-R408',
      name: 'Timestamp & Calendar Validity',
      desc: 'Flags impossible future dates and non-standard timestamp formats.',
      passed: !report.extracted.isFutureDate,
    },
    {
      code: 'JEV-R512',
      name: 'Spoof App Template Signatures',
      desc: 'Screens for FakePay, SpoofPay, and prank app template artifacts.',
      passed: !report.redFlags.some((f) => f.toLowerCase().includes('spoof') || f.toLowerCase().includes('fakepay')),
    },
    {
      code: 'JEV-R601',
      name: 'Replay / Duplicate Cache Guard',
      desc: 'Identifies previously seen receipt hashes and duplicate UTR reuse.',
      passed: !report.redFlags.some((f) => f.toLowerCase().includes('duplicate')),
    },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* 1. EdgeDrop-style Verdict Card */}
      <div
        className={`rounded-2xl border p-6 sm:p-7 backdrop-blur-xl transition-all ${
          isFake
            ? 'bg-rose-950/20 border-rose-500/30'
            : isSuspicious
            ? 'bg-amber-950/20 border-amber-500/30'
            : 'bg-emerald-950/20 border-emerald-500/30'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pb-5 border-b border-white/[0.08]">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                isFake
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : isSuspicious
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {isFake ? (
                <AlertOctagon className="w-6 h-6" />
              ) : isSuspicious ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isFake
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : isSuspicious
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  Jev Decision: {report.verdict}
                </span>
                <span className="text-[11px] font-mono text-slate-500">• Model v3.8</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {report.verdictTitle}
              </h2>

              <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                {report.summary}
              </p>
            </div>
          </div>

          {/* Jev Trust Score */}
          <div className="flex sm:flex-col items-center justify-between sm:justify-center p-3.5 sm:p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] w-full sm:w-28 shrink-0 text-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Jev Score
            </span>
            <div
              className={`text-3xl font-extrabold font-mono tracking-tight my-0.5 ${
                isFake ? 'text-rose-400' : isSuspicious ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {report.overallScore}
            </div>
            <span className="text-[10px] font-mono text-slate-500">out of 100</span>
          </div>
        </div>

        {/* Actionable Advice */}
        <div className="pt-4 flex items-start gap-2 text-xs text-slate-200">
          <span className="text-sm">💡</span>
          <div>
            <strong className="text-white mr-1.5">Action Advice:</strong>
            <span>{report.recommendation}</span>
          </div>
        </div>
      </div>

      {/* 2. Extracted Attributes Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-xl bg-[#0b101d]/60 border border-white/[0.07]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
            Claimed Amount
          </span>
          <span className="text-base font-bold font-mono text-emerald-400">
            {report.extracted.amount || 'N/A'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0b101d]/60 border border-white/[0.07]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
            Payment App
          </span>
          <span className="text-xs font-bold text-white truncate block">
            {report.extracted.app || 'Unknown'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0b101d]/60 border border-white/[0.07]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
            UPI Ref / UTR
          </span>
          <span className="text-xs font-mono font-semibold text-slate-200 break-all block">
            {report.extracted.txnId || 'Not Found'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0b101d]/60 border border-white/[0.07]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
            Timestamp
          </span>
          <span className="text-xs text-slate-300 truncate block">
            {report.extracted.dateTime || 'Not visible'}
          </span>
        </div>
      </div>

      {/* 3. Jev AI Rule Evaluation Engine Matrix */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0b101d]/60 p-5 space-y-3.5 backdrop-blur-xl">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Jev AI Rule Evaluation Engine
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {jevRules.filter((r) => r.passed).length} / {jevRules.length} Rules Passed
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {jevRules.map((rule) => (
            <div
              key={rule.code}
              className={`p-3 rounded-xl border flex items-start gap-2.5 transition-colors ${
                rule.passed
                  ? 'bg-emerald-500/[0.03] border-emerald-500/20'
                  : 'bg-rose-500/[0.04] border-rose-500/25'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                  rule.passed
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {rule.passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {rule.code}
                  </span>
                  <span className="text-xs font-semibold text-slate-200">
                    {rule.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {rule.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Bank Ledger Matcher (Real Proof) */}
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/[0.12] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-cyan-400" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Bank Ledger Cross-Check (Final Proof)
            </h4>
            <p className="text-[11px] text-slate-400">
              Screenshots can be edited. Only money credited in your bank account is the true proof.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={searchUtr}
            onChange={(e) => setSearchUtr(e.target.value)}
            placeholder="Enter 12-digit UTR (e.g. 427189012345)"
            className="flex-1 px-3.5 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            onClick={handleBankCheck}
            disabled={isCheckingBank || !searchUtr}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Search className="w-3 h-3" />
            <span>{isCheckingBank ? 'Checking...' : 'Match in Bank'}</span>
          </button>
        </div>

        {bankResult && (
          <div
            className={`p-3 rounded-xl border text-xs leading-relaxed animate-in fade-in duration-200 ${
              bankResult.found
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="font-bold mb-0.5">
              {bankResult.found ? '✓ Verified in Bank Account!' : '⚠ Not Recorded in Bank Statement!'}
            </div>
            <div>{bankResult.message}</div>
          </div>
        )}
      </div>
    </div>
  );
};
