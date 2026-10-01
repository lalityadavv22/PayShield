/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { JevResultView } from './components/JevResultView';
import { DeveloperFooter } from './components/DeveloperFooter';
import { CursorGlow } from './components/CursorGlow';
import { AnalysisReport } from './types';
import { soundManager } from './utils/audio';
import { PRESET_RECEIPTS } from './utils/presets';
import { Sparkles, ShieldCheck } from 'lucide-react';

export default function App() {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);

  // Auto-load initial demo receipt so user immediately experiences the Jev AI Decision Engine
  useEffect(() => {
    const defaultPreset = PRESET_RECEIPTS[0]; // Fake GPay ₹45,000 (shows Jev rule violations clearly)
    defaultPreset.getDataUrl().then((dataUrl) => {
      handleFileSelected(dataUrl, `${defaultPreset.id}.png`, false);
    });
  }, []);

  const handleReset = () => {
    setReport(null);
  };

  const handleFileSelected = async (fileOrDataUrl: File | string, customName?: string, playSound = true) => {
    setIsScanning(true);
    if (playSound) {
      soundManager.playScanPulse();
    }

    try {
      let imageBase64 = '';
      let fileName = customName || 'receipt-screenshot.png';
      let mimeType = 'image/png';

      if (typeof fileOrDataUrl === 'string') {
        imageBase64 = fileOrDataUrl;
      } else {
        fileName = fileOrDataUrl.name;
        mimeType = fileOrDataUrl.type || 'image/png';
        const reader = new FileReader();
        const readPromise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
        });
        reader.readAsDataURL(fileOrDataUrl);
        imageBase64 = await readPromise;
      }

      // Backend Jev AI Analysis API
      const res = await fetch('/api/analyze-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          fileName,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data: AnalysisReport = await res.json();
      setReport(data);

      if (data.verdict === 'GENUINE') {
        soundManager.playSuccessChime();
        confetti({
          particleCount: 45,
          spread: 55,
          origin: { y: 0.6 },
          colors: ['#10b981', '#06b6d4', '#3b82f6'],
        });
      } else {
        soundManager.playDangerAlarm();
      }
    } catch (err) {
      console.error('Failed to run Jev AI analysis:', err);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090d] bg-edgedrop-pattern text-slate-100 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-300 relative overflow-x-hidden">
      {/* Smooth Cursor Follower Light (EdgeDrop Luxury Feel) */}
      <CursorGlow />

      {/* Sleek EdgeDrop-style Header */}
      <Header onReset={handleReset} hasResult={!!report} />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-7 relative z-10">
        {/* Minimalist Hero */}
        <div className="text-center max-w-lg mx-auto space-y-3 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-sm animate-pulse-glow">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Jev AI Fraud Decision Engine</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Verify payment authenticity in seconds.
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            Drop any UPI screenshot. Jev AI checks 12-digit UTR syntax, typography tampering, and replay risk.
          </p>
        </div>

        {/* EdgeDrop Dropzone with 1-click test pills */}
        <DropZone
          onFileSelected={handleFileSelected}
          isScanning={isScanning}
        />

        {/* Clean Jev AI Decision Dashboard (No original screenshot or heatmap) */}
        {report && (
          <JevResultView report={report} />
        )}
      </main>

      {/* EdgeDrop-style Developer Footer */}
      <DeveloperFooter />
    </div>
  );
}
