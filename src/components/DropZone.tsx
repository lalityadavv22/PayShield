import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, Zap, Sparkles, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { PRESET_RECEIPTS, PresetItem } from '../utils/presets';

interface DropZoneProps {
  onFileSelected: (file: File | string, fileName?: string) => void;
  isScanning: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFileSelected, isScanning }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clipboard paste listener (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isScanning) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            onFileSelected(file, 'clipboard-payment.png');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isScanning, onFileSelected]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isScanning) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onFileSelected(file);
      }
    }
  };

  const handlePresetClick = async (preset: PresetItem) => {
    if (isScanning) return;
    const dataUrl = await preset.getDataUrl();
    onFileSelected(dataUrl, `${preset.id}.png`);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {/* EdgeDrop-inspired Ultra-Clean Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isScanning && fileInputRef.current?.click()}
        className={`relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer p-8 sm:p-12 text-center ${
          isDragOver
            ? 'border-emerald-400/80 bg-emerald-950/20 shadow-2xl shadow-emerald-500/10 scale-[1.008]'
            : isScanning
            ? 'border-cyan-400/60 bg-cyan-950/20 shadow-2xl shadow-cyan-500/10'
            : 'border-white/[0.08] hover:border-white/[0.18] bg-[#0b101d]/60 hover:bg-[#0d1424]/80 shadow-xl backdrop-blur-sm'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              onFileSelected(e.target.files[0]);
            }
          }}
        />

        {/* Ambient Subtle Scan Line */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none z-20">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-scan" />
            <div className="absolute inset-0 bg-cyan-500/[0.03]" />
          </div>
        )}

        <div className="relative z-10 flex flex-col items-center max-w-sm mx-auto">
          {/* Animated Minimal Icon */}
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
              isScanning
                ? 'bg-cyan-500/20 text-cyan-400 scale-105'
                : 'bg-white/[0.04] text-slate-300 border border-white/[0.08] group-hover:border-emerald-500/40 group-hover:text-emerald-400'
            }`}
          >
            {isScanning ? (
              <Zap className="w-6 h-6 animate-pulse text-cyan-300" />
            ) : (
              <UploadCloud className="w-6 h-6 text-slate-300" />
            )}
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-1.5">
            {isScanning ? 'Jev AI is evaluating receipt...' : 'Drop payment screenshot here'}
          </h3>

          <p className="text-xs sm:text-sm text-slate-400 mb-5 leading-relaxed">
            {isScanning
              ? 'Analyzing 12-digit UTR syntax, font weights, and Jev fraud decision matrix'
              : 'Supports Google Pay, PhonePe, and Paytm receipts. Paste or click to upload.'}
          </p>

          {!isScanning && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.07] text-[11px] font-mono text-slate-400">
              <span>Click to browse</span>
              <span className="text-slate-600">•</span>
              <span>or press Ctrl + V</span>
            </div>
          )}
        </div>
      </div>

      {/* Instant 1-Click Samples Bar */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Test with ready samples:</span>
          </span>
          <span className="text-[10px] font-mono text-slate-500">1-click test</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESET_RECEIPTS.map((preset) => (
            <button
              key={preset.id}
              disabled={isScanning}
              onClick={() => handlePresetClick(preset)}
              className="text-left p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.14] transition-all group disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[9px] font-bold font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${preset.badgeColor}`}
                >
                  {preset.badge === 'Fake' ? 'FAKE' : 'REAL'}
                </span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {preset.amount}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-300 group-hover:text-emerald-400 transition-colors truncate">
                {preset.app}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
