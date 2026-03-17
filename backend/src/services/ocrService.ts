import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import * as path from 'path';
import * as os from 'os';
import { extractBondNumbers } from '../utils/banglaDigits';

export async function preprocessImage(inputPath: string): Promise<string> {
  const outputPath = path.join(os.tmpdir(), `processed_${path.basename(inputPath)}`);
  await sharp(inputPath)
    .grayscale()
    .normalize()
    // Increase contrast before thresholding
    .linear(1.5, -(128 * 0.5))
    // Threshold to near-binary — greatly helps Tesseract on printed text
    .threshold(140)
    .sharpen()
    .resize({ width: 1600, withoutEnlargement: true })
    .png()  // PNG (lossless) is better than JPEG for OCR
    .toFile(outputPath);
  return outputPath;
}

export async function runOCR(imagePath: string): Promise<{ numbers: string[]; rawText: string }> {
  const processedPath = await preprocessImage(imagePath);

  try {
    // Run Bengali + English together; if that yields nothing, fall back to English-only
    const { data } = await Tesseract.recognize(processedPath, 'ben+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          process.stdout.write(`\rOCR: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const rawText = data.text;
    let numbers = extractBondNumbers(rawText);

    // If ben+eng found nothing, try eng-only (handles bonds printed in Western numerals)
    if (numbers.length === 0) {
      const { data: engData } = await Tesseract.recognize(processedPath, 'eng', {});
      numbers = extractBondNumbers(engData.text);
    }

    return { numbers, rawText };
  } finally {
    const { cleanupTemp } = await import('./storageService');
    cleanupTemp(processedPath);
  }
}
