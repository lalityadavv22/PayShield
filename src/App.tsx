/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { JevResultView } from './components/JevResultView';
import { DeveloperFooter } from './components/DeveloperFooter';
import { CursorGlow } from './components/CursorGlow';
import { ScrollReveal } from './components/ScrollReveal';
import { AnalysisReport } from './types';
import { soundManager } from './utils/audio';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
// Vercel Functions have a small request-body cap. Keep the base64 JSON comfortably below it.
const MAX_DATA_URL_LENGTH = 3.55 * 1024 * 1024;
const MAX_IMAGE_EDGE = 2200;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('This image could not be read. Try saving it as a PNG or JPG.'));
    };
    reader.onerror = () => reject(new Error('This image could not be read. Try saving it as a PNG or JPG.'));
    reader.readAsDataURL(file);
  });
}

async function prepareImage(fileOrDataUrl: File | string): Promise<{ dataUrl: string; mimeType: string }> {
  let dataUrl: string;
  let mimeType: string;

  if (typeof fileOrDataUrl === 'string') {
    dataUrl = fileOrDataUrl;
    mimeType = dataUrl.match(/^data:([^;,]+)/)?.[1] || 'image/png';
  } else {
    if (!fileOrDataUrl.type.startsWith('image/')) {
      throw new Error('Please choose an image file such as PNG, JPG, or WebP.');
    }
    if (fileOrDataUrl.size > MAX_UPLOAD_BYTES) {
      throw new Error('This image is over 20 MB. Please choose a smaller screenshot.');
    }
    dataUrl = await readFileAsDataUrl(fileOrDataUrl);
    mimeType = fileOrDataUrl.type || 'image/png';
  }

  if (!dataUrl.startsWith('data:image/')) {
    throw new Error('That file is not a supported image. Please choose a PNG, JPG, or WebP screenshot.');
  }

  const supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const needsResize = dataUrl.length > MAX_DATA_URL_LENGTH || !supportedTypes.includes(mimeType.toLowerCase());
  if (!needsResize) return { dataUrl, mimeType };

  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('This image format could not be opened by your browser. Export it as PNG or JPG and try again.'));
    image.src = dataUrl;
  });

  let scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  let width = Math.max(1, Math.round(image.naturalWidth * scale));
  let height = Math.max(1, Math.round(image.naturalHeight * scale));
  let quality = 0.9;
  let compressed = '';

  for (let attempt = 0; attempt < 7; attempt += 1) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image compression is not supported in this browser.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    compressed = canvas.toDataURL('image/jpeg', quality);
    if (compressed.length <= MAX_DATA_URL_LENGTH) break;

    if (quality > 0.68) quality = Math.max(0.68, quality - 0.08);
    else {
      width = Math.max(1, Math.round(width * 0.82));
      height = Math.max(1, Math.round(height * 0.82));
    }
  }

  if (compressed.length > MAX_DATA_URL_LENGTH) {
    throw new Error('This screenshot is too large to send securely. Please crop it or choose a smaller image.');
  }
  return { dataUrl: compressed, mimeType: 'image/jpeg' };
}

function getApiErrorMessage(response: Response, payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const errorPayload = payload as { message?: string; error?: string };
    if (errorPayload.message) return errorPayload.message;
    if (errorPayload.error) return errorPayload.error;
  }
  if (response.status === 413) return 'This screenshot is too large for the analysis service. Try a smaller image.';
  return `The analysis service returned an error (${response.status}). Please try again.`;
}

export default function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLElement>(null);

  const handleReset = useCallback(() => {
    setReport(null);
    setAnalysisError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleFileSelected = useCallback(async (fileOrDataUrl: File | string, customName?: string) => {
    setIsScanning(true);
    setReport(null);
    setAnalysisError(null);
    soundManager.playScanPulse();

    try {
      const { dataUrl, mimeType } = await prepareImage(fileOrDataUrl);
      // Keep sample identifiers only for one-click demos; never classify an uploaded image by its user-controlled filename.
      const fileName = typeof fileOrDataUrl === 'string'
        ? customName || 'receipt-screenshot.png'
        : 'uploaded-receipt.png';

      const response = await fetch('/api/analyze-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl, mimeType, fileName }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (response.status === 413) {
        throw new Error('This screenshot is too large for the analysis service. Try a smaller image.');
      }
      if (!response.ok) {
        if (contentType.toLowerCase().includes('application/json')) {
          const errorPayload: unknown = await response.json().catch(() => null);
          throw new Error(getApiErrorMessage(response, errorPayload));
        }
        const responseText = await response.text();
        if (response.status === 404 && responseText.toLowerCase().includes('<!doctype html')) {
          throw new Error('The analysis API route is not deployed. Confirm the Vercel API function is included in this deployment.');
        }
        throw new Error(`The analysis service returned an error (${response.status}). Please try again.`);
      }
      if (!contentType.toLowerCase().includes('application/json')) {
        const responseText = await response.text();
        const routeHint = responseText.toLowerCase().includes('<!doctype html')
          ? 'The analysis API route is not deployed. Confirm the Vercel API function is included in this deployment.'
          : 'The analysis service returned an unreadable response. Please try again.';
        throw new Error(routeHint);
      }

      const payload: unknown = await response.json();
      if (!payload || typeof payload !== 'object' || !('verdict' in payload) || !('extracted' in payload)) {
        throw new Error('The analysis service returned an incomplete report. Please try again.');
      }

      const result = payload as AnalysisReport;
      setReport(result);
      if (result.verdict === 'GENUINE') {
        soundManager.playSuccessChime();
        confetti({
          particleCount: 40,
          spread: 48,
          origin: { y: 0.58 },
          colors: ['#8be3bd', '#55c9a2', '#d1ff77'],
        });
      } else {
        soundManager.playDangerAlarm();
      }
    } catch (error) {
      console.error('Failed to run PayShield analysis:', error);
      setAnalysisError(error instanceof Error ? error.message : 'We could not analyze this receipt. Please try again.');
    } finally {
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    if (!report) return;
    const timeout = window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [report]);

  return (
    <div className="app-shell" id="top">
      <div className="ambient-orb ambient-orb-left" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-right" aria-hidden="true" />
      <CursorGlow />

      <Header onReset={handleReset} hasResult={Boolean(report)} />

      <main className="site-main">
        <section className="hero-section" aria-labelledby="hero-title">
          <ScrollReveal className="hero-copy">
            <h1 id="hero-title">
              Trust the payment,<br />
              <span>not the screenshot.</span>
            </h1>
            <p className="hero-description">
              Upload a payment screenshot. PayShield checks for signs of editing and shows you what to do next.
            </p>

          </ScrollReveal>

          <ScrollReveal className="hero-workspace" delay={90}>
            <div className="workspace-frame">
              <DropZone
                onFileSelected={handleFileSelected}
                isScanning={isScanning}
                errorMessage={analysisError}
                onError={setAnalysisError}
              />
            </div>
          </ScrollReveal>
        </section>

        <ScrollReveal className="process-reveal">
          <section className="process-strip" id="process" aria-label="How PayShield works">
            <div className="process-intro">
              <h2>How it works</h2>
            </div>
            <div className="process-step">
              <h3>Upload</h3>
              <p>Add a payment screenshot.</p>
            </div>
            <div className="process-step">
              <h3>Review</h3>
              <p>See the details and any warning signs.</p>
            </div>
            <div className="process-step">
              <h3>Confirm</h3>
              <p>Check your bank app before handing anything over.</p>
            </div>
          </section>
        </ScrollReveal>

        {report && (
          <section className="results-section" ref={resultsRef} aria-labelledby="results-title">
            <div className="results-heading">
              <h2 id="results-title">Here’s what we found</h2>
              <button className="report-new-scan" type="button" onClick={handleReset}>
                Check another <span>↗</span>
              </button>
            </div>
            <JevResultView report={report} />
          </section>
        )}
      </main>

      <DeveloperFooter />
    </div>
  );
}
