import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ImagePlus, LoaderCircle, ShieldAlert, UploadCloud } from 'lucide-react';
import { PRESET_RECEIPTS, PresetItem } from '../utils/presets';

interface DropZoneProps {
  onFileSelected: (file: File | string, fileName?: string) => void;
  isScanning: boolean;
  errorMessage?: string | null;
  onError?: (message: string) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFileSelected,
  isScanning,
  errorMessage,
  onError,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (isScanning) return;
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (!item.type.startsWith('image/')) continue;
        const file = item.getAsFile();
        if (!file) continue;
        event.preventDefault();
        setSampleError(null);
        onFileSelected(file, 'clipboard-payment.png');
        return;
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isScanning, onFileSelected]);

  const openFilePicker = () => {
    if (!isScanning) fileInputRef.current?.click();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    if (isScanning) return;

    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onError?.('Please choose an image such as PNG, JPG, or WebP.');
      return;
    }
    setSampleError(null);
    onFileSelected(file);
  };

  const handlePresetClick = async (preset: PresetItem) => {
    if (isScanning || loadingPreset) return;
    setSampleError(null);
    setLoadingPreset(preset.id);
    try {
      const dataUrl = await preset.getDataUrl();
      onFileSelected(dataUrl, `${preset.id}.png`);
    } catch {
      setSampleError('We could not prepare this sample. Please try uploading an image instead.');
    } finally {
      setLoadingPreset(null);
    }
  };

  const visibleError = errorMessage || sampleError;

  return (
    <section className="receipt-dropzone" aria-label="Upload a payment screenshot">
      <div className="dropzone-heading">
        <h2>Add a receipt</h2>
        {isScanning && (
          <span className="scan-state" role="status">
            <span className="scan-state-dot" /> Checking…
          </span>
        )}
      </div>

      <div
        id="upload"
        className={`dropzone-surface ${isDragOver ? 'is-drag-over' : ''} ${isScanning ? 'is-scanning' : ''}`}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!isScanning) setIsDragOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!isScanning) setIsDragOver(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDragOver(false);
          }
        }}
        onDrop={handleDrop}
        aria-busy={isScanning}
      >
        <input
          ref={fileInputRef}
          className="visually-hidden-input"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/*"
          aria-label="Choose a receipt image"
          disabled={isScanning}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              setSampleError(null);
              onFileSelected(file);
            }
            // Let users choose the same screenshot again after resetting.
            event.currentTarget.value = '';
          }}
        />

        <div className="upload-art" aria-hidden="true">
          <span className="upload-art-ring upload-art-ring-one" />
          <span className="upload-art-ring upload-art-ring-two" />
          <span className="upload-art-icon">
            {isScanning ? <LoaderCircle className="is-spinning" /> : <UploadCloud />}
          </span>
          <span className="upload-art-spark upload-art-spark-one">✦</span>
          <span className="upload-art-spark upload-art-spark-two">✧</span>
        </div>

        <h3>{isScanning ? 'Reading your screenshot…' : isDragOver ? 'Drop it here' : 'Drop a screenshot here'}</h3>
        <p className="dropzone-description">
          {isScanning
            ? 'Checking the payment details for anything unusual.'
            : 'Drag an image here, paste it, or choose one from your device.'}
        </p>

        <button
          className="upload-button"
          type="button"
          onClick={openFilePicker}
          disabled={isScanning}
        >
          {isScanning ? <LoaderCircle className="is-spinning" /> : <ImagePlus />}
          <span>{isScanning ? 'Checking screenshot…' : 'Choose screenshot'}</span>
          {!isScanning && <ArrowUpRight className="upload-button-arrow" />}
        </button>

        <p className="file-hint">PNG, JPG or WebP <span>·</span> Up to 20 MB</p>

        {isScanning && <div className="scan-sweep" aria-hidden="true" />}
      </div>

      {visibleError && (
        <div className="upload-error" role="alert">
          <ShieldAlert aria-hidden="true" />
          <span>{visibleError}</span>
        </div>
      )}

      <div className="sample-heading">
        <span className="sample-heading-title">Or try a sample</span>
      </div>

      <div className="sample-grid">
        {PRESET_RECEIPTS.map((preset) => {
          const isFake = preset.badge === 'Fake';
          const isLoading = loadingPreset === preset.id;
          return (
            <button
              key={preset.id}
              className={`sample-card ${isFake ? 'sample-card-risk' : 'sample-card-safe'}`}
              type="button"
              disabled={isScanning || Boolean(loadingPreset)}
              onClick={() => void handlePresetClick(preset)}
              aria-label={`Analyze ${preset.title}`}
            >
              <span className="sample-card-topline">
                <span className={`sample-badge ${isFake ? 'sample-badge-risk' : 'sample-badge-safe'}`}>
                  {isFake ? 'Fake sample' : 'Example'}
                </span>
                <span className="sample-open-icon" aria-hidden="true">
                  {isLoading ? <LoaderCircle className="is-spinning" /> : <ArrowUpRight />}
                </span>
              </span>
              <span className="sample-amount">{preset.amount}</span>
              <span className="sample-app">{preset.app}</span>
            </button>
          );
        })}
      </div>
      <p className="sample-footnote">Samples are for testing only. Confirm real payments in your bank app.</p>
    </section>
  );
};
