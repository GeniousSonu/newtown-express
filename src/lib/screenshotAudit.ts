import { PaymentAuditInfo } from '@/types';

/**
 * Computes SHA-256 hex string for a file in the browser
 */
export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Runs free on-device heuristic checks on the uploaded payment screenshot:
 * 1. SHA-256 duplicate image hash
 * 2. File lastModified staleness check (>30m)
 * 3. On-device OCR (amount matching & NTX reference note)
 */
export async function auditScreenshotFile(
  file: File,
  expectedAmount: number,
  expectedRefNote: string
): Promise<PaymentAuditInfo> {
  // 1. Image hash
  let imageHash = '';
  try {
    imageHash = await computeFileHash(file);
  } catch (err) {
    console.warn('[AUDIT] Failed to compute image hash:', err);
  }

  // 2. Staleness check
  const now = Date.now();
  const fileAgeMs = Math.max(0, now - file.lastModified);
  const fileAgeMinutes = Math.floor(fileAgeMs / 60000);
  const isStale = fileAgeMinutes > 30;

  // 3. Fast on-device OCR with timeout
  let detectedAmount: number | null = null;
  let amountMatches: boolean | null = null;
  let refNoteMatched = false;
  let extractedSnippet = '';

  try {
    // Dynamic import to keep bundle small
    const { createWorker } = await import('tesseract.js');

    const ocrPromise = (async () => {
      const worker = await createWorker('eng');
      const ret = await worker.recognize(file);
      await worker.terminate();
      return ret.data.text;
    })();

    // 6-second timeout race so checkout never hangs
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('OCR timeout')), 6000)
    );

    const rawText = await Promise.race([ocrPromise, timeoutPromise]);
    const normalizedText = rawText.toLowerCase().replace(/[\s,]/g, ' ');

    extractedSnippet = rawText.slice(0, 180).trim();

    // Check for reference note
    if (expectedRefNote && rawText.includes(expectedRefNote)) {
      refNoteMatched = true;
    } else if (rawText.toLowerCase().includes('ntx-')) {
      refNoteMatched = true;
    }

    // Check for amount pattern (e.g. ₹120, 120.00, Rs 120, 120)
    const amountStr = expectedAmount.toString();
    const amountDecimalStr = expectedAmount.toFixed(2);

    if (
      normalizedText.includes(`₹${amountStr}`) ||
      normalizedText.includes(`rs ${amountStr}`) ||
      normalizedText.includes(`rs. ${amountStr}`) ||
      normalizedText.includes(amountDecimalStr) ||
      normalizedText.includes(` ${amountStr} `) ||
      normalizedText.includes(` ${amountStr}.`)
    ) {
      amountMatches = true;
      detectedAmount = expectedAmount;
    } else {
      // Find any currency amount
      const matches = normalizedText.match(/(?:₹|rs\.?)\s*([0-9]+(?:\.[0-9]{2})?)/g);
      if (matches && matches.length > 0) {
        amountMatches = false;
      }
    }
  } catch (ocrErr) {
    console.warn('[AUDIT] Fast OCR skipped or timed out:', ocrErr);
  }

  return {
    imageHash,
    fileAgeMinutes,
    isStale,
    detectedAmount,
    amountMatches,
    refNoteMatched,
    extractedSnippet,
  };
}
