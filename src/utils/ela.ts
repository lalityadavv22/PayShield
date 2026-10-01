/**
 * Error Level Analysis (ELA) and Client-side Visual Forensics
 * Step 4 from the pipeline: Error Level Analysis (ELA), pixel inconsistency, copy-paste detection.
 */

export interface ElaResult {
  elaDataUrl: string;
  varianceScore: number; // 0-100 indicating compression irregularity
  isSuspicious: boolean;
  highlightBoxes?: { x: number; y: number; width: number; height: number; error: number }[];
}

export async function generateELA(imageSource: string | HTMLImageElement, quality = 0.75, multiplier = 20): Promise<ElaResult> {
  return new Promise((resolve, reject) => {
    const img = typeof imageSource === 'string' ? new Image() : imageSource;

    const runAnalysis = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        if (width === 0 || height === 0) {
          throw new Error('Image dimensions invalid');
        }

        // 1. Draw original on hidden canvas
        const origCanvas = document.createElement('canvas');
        origCanvas.width = width;
        origCanvas.height = height;
        const origCtx = origCanvas.getContext('2d');
        if (!origCtx) throw new Error('Canvas 2D context unavailable');
        origCtx.drawImage(img, 0, 0);

        const origData = origCtx.getImageData(0, 0, width, height);

        // 2. Recompress as JPEG
        const recompressedJpeg = origCanvas.toDataURL('image/jpeg', quality);

        const recompressedImg = new Image();
        recompressedImg.onload = () => {
          const compCanvas = document.createElement('canvas');
          compCanvas.width = width;
          compCanvas.height = height;
          const compCtx = compCanvas.getContext('2d');
          if (!compCtx) return;
          compCtx.drawImage(recompressedImg, 0, 0);

          const compData = compCtx.getImageData(0, 0, width, height);

          // 3. Create ELA output canvas
          const elaCanvas = document.createElement('canvas');
          elaCanvas.width = width;
          elaCanvas.height = height;
          const elaCtx = elaCanvas.getContext('2d');
          if (!elaCtx) return;

          const elaImageData = elaCtx.createImageData(width, height);
          const origPixels = origData.data;
          const compPixels = compData.data;
          const elaPixels = elaImageData.data;

          let totalDiff = 0;
          let maxDiff = 0;
          const blockErrors: { x: number; y: number; count: number; diff: number }[] = [];
          const blockSize = Math.max(16, Math.floor(width / 30));

          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const idx = (y * width + x) * 4;

              const rDiff = Math.abs(origPixels[idx] - compPixels[idx]);
              const gDiff = Math.abs(origPixels[idx + 1] - compPixels[idx + 1]);
              const bDiff = Math.abs(origPixels[idx + 2] - compPixels[idx + 2]);

              const diff = (rDiff + gDiff + bDiff) / 3;
              totalDiff += diff;
              if (diff > maxDiff) maxDiff = diff;

              // Scale diff for visualization
              const rOut = Math.min(255, rDiff * multiplier);
              const gOut = Math.min(255, gDiff * multiplier);
              const bOut = Math.min(255, bDiff * multiplier);

              // False-color thermal visualization for high artifacts
              const luminance = (rOut + gOut + bOut) / 3;
              if (luminance > 120) {
                // High error: fiery orange/red highlight
                elaPixels[idx] = Math.min(255, luminance * 1.4);
                elaPixels[idx + 1] = Math.max(0, 180 - luminance);
                elaPixels[idx + 2] = 20;
              } else if (luminance > 50) {
                // Medium error: cyan/violet
                elaPixels[idx] = 40;
                elaPixels[idx + 1] = Math.min(255, luminance * 1.5);
                elaPixels[idx + 2] = Math.min(255, luminance * 2);
              } else {
                // Normal background noise
                elaPixels[idx] = rOut;
                elaPixels[idx + 1] = gOut;
                elaPixels[idx + 2] = bOut;
              }
              elaPixels[idx + 3] = 255;
            }
          }

          elaCtx.putImageData(elaImageData, 0, 0);

          const pixelCount = width * height;
          const avgDiff = totalDiff / pixelCount;

          // Estimate anomaly variance
          const varianceScore = Math.min(100, Math.round((avgDiff / 14) * 100));
          const isSuspicious = avgDiff > 8.5;

          resolve({
            elaDataUrl: elaCanvas.toDataURL('image/png'),
            varianceScore,
            isSuspicious,
          });
        };

        recompressedImg.onerror = reject;
        recompressedImg.src = recompressedJpeg;
      } catch (err) {
        reject(err);
      }
    };

    if (typeof imageSource === 'string') {
      img.crossOrigin = 'anonymous';
      img.onload = runAnalysis;
      img.onerror = reject;
      img.src = imageSource;
    } else {
      if (img.complete) {
        runAnalysis();
      } else {
        img.onload = runAnalysis;
        img.onerror = reject;
      }
    }
  });
}
