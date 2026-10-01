import express from 'express';
import type { Request, Response } from 'express';
import type { RiskLevel } from './src/types';

const VERDICT_TITLES: Record<RiskLevel, { en: string; hi: string }> = {
  GENUINE: { en: 'No obvious edits found', hi: 'रसीद सही दिखती है — बैंक क्रेडिट जांचें' },
  SUSPICIOUS: { en: 'We couldn’t verify this receipt', hi: 'ध्यान से जांचें — रसीद की पुष्टि बाकी है' },
  FAKE: { en: 'This receipt looks altered', hi: 'उच्च जोखिम: छेड़छाड़ के संकेत' },
};
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// In-memory cache for Duplicate Receipt Check (Step 6)
interface SeenRecord {
  hash: string;
  txnId: string;
  amount: string;
  firstSeenAt: string;
  count: number;
}
const seenReceipts = new Map<string, SeenRecord>();
const seenTxnIds = new Map<string, SeenRecord>();

// Demonstration-only ledger for testing the reconciliation UI; it is not connected to a bank.
interface BankTransaction {
  id: string;
  utrNumber: string;
  amount: number;
  senderName: string;
  senderUpi: string;
  timestamp: string;
  status: 'CREDITED' | 'PENDING' | 'FAILED';
  bankName: string;
}

const mockBankLedger: BankTransaction[] = [
  {
    id: 'TXN-901',
    utrNumber: '427189012345',
    amount: 850,
    senderName: 'Aman Verma',
    senderUpi: 'aman.v@kotak',
    timestamp: '01 Oct 2026, 02:27 PM',
    status: 'CREDITED',
    bankName: 'HDFC Bank - Current A/c **4419',
  },
  {
    id: 'TXN-902',
    utrNumber: '427511993421',
    amount: 3200,
    senderName: 'Kavita Rao',
    senderUpi: 'kavita.r@icici',
    timestamp: '01 Oct 2026, 04:02 PM',
    status: 'CREDITED',
    bankName: 'ICICI Bank - Merchant **9011',
  },
  {
    id: 'TXN-903',
    utrNumber: '427019283741',
    amount: 500,
    senderName: 'Rohit Sharma',
    senderUpi: 'rohit@paytm',
    timestamp: '01 Oct 2026, 01:10 PM',
    status: 'CREDITED',
    bankName: 'State Bank of India **2209',
  },
];

// Initialize Gemini Client
let geminiClient: GoogleGenAI | null = null;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
if (process.env.GEMINI_API_KEY) {
  try {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
  }
}

// Forensic prompt instructions
const FORENSIC_SYSTEM_INSTRUCTION = `
You are PayShield Forensic AI, an expert digital payment fraud analyst specializing in Indian UPI apps (Google Pay, PhonePe, Paytm, BHIM, CRED, Amazon Pay) and spoof generator apps (FakePay, SpoofPay, PrankPayment, Canva/Photoshop splices).
A screenshot cannot prove that funds were credited. Use GENUINE only to mean that the visible receipt appears internally consistent; never claim that a bank transfer is verified. If text is unreadable or evidence is uncertain, use SUSPICIOUS. Never invent extracted transaction fields: return an empty string or null when a value cannot be read.

Analyze the provided payment screenshot according to the 7-step pipeline:
1. OCR: Extract app name, amount (string and numeric), txn ID (UTR/UPI Ref), sender/receiver, date & time, status.
2. Format Checks:
   - Standard UPI UTR / Ref No is strictly 12 numeric digits. PhonePe internal Txn ID starts with T and is alphanumeric. Flag if length is wrong or non-numeric for UTR.
   - Date verification: Check if timestamp is in the future compared to October 2026.
   - Amount: Check currency format and spacing.
3. Template & Visual Layout:
   - Compare with authentic UI of GPay, PhonePe, Paytm.
   - Check if font is authentic (e.g. Google Sans/Roboto vs generic font), tick mark shape, alignment, spacing.
4. Tampering & Pixel Inconsistency:
   - Inspect amount text area for different background noise, patch boxes, font weight mismatch, misalignment.
5. Metadata & Provenance:
   - Note any watermark, template spoof markers, or canvas artifacts.
6. Duplicate / Replay Risk.
7. Scoring: Calculate overall trust score (0 to 100), where:
   - 85-100: GENUINE
   - 50-84: SUSPICIOUS
   - 0-49: FAKE

Write every user-facing field in plain, natural English only. Do not use Hindi or Hinglish. Keep summaries and recommendations brief, explain findings without jargon, and never claim that a payment was confirmed by a bank.
`;

// API endpoint: Check the bundled demonstration ledger (not a live bank connection).
app.post('/api/reconcile-bank', (req: Request, res: Response) => {
  const { utrNumber, amount } = req.body;
  if (!utrNumber) {
    return res.status(400).json({ error: 'utrNumber is required' });
  }

  const cleanUtr = String(utrNumber).trim();
  const matched = mockBankLedger.find((tx) => tx.utrNumber === cleanUtr);

  if (matched) {
    const amountMatches = amount ? Math.abs(matched.amount - Number(amount)) < 1 : true;
    return res.json({
      found: true,
      transaction: matched,
      amountMatches,
      message: amountMatches
        ? `Demo ledger match: ₹${matched.amount} is marked credited in sample data. This is not a live bank confirmation.`
        : `Demo UTR match, but the sample ledger amount is ₹${matched.amount}, not ₹${amount}. This is not a live bank confirmation.`,
      messageHi: amountMatches
        ? `डेमो लेजर में ₹${matched.amount} क्रेडिट दिख रहा है। यह लाइव बैंक पुष्टि नहीं है।`
        : `डेमो UTR मिला, लेकिन नमूना लेजर में ₹${matched.amount} है, ₹${amount} नहीं। यह लाइव बैंक पुष्टि नहीं है।`,
    });
  }

  return res.json({
    found: false,
    transaction: null,
    amountMatches: false,
    message: `UTR ${cleanUtr} was not found in the PayShield demo ledger. This lookup is not connected to a real bank.`,
    messageHi: `UTR ${cleanUtr} PayShield डेमो लेजर में नहीं मिला। यह जांच किसी असली बैंक से जुड़ी नहीं है।`,
  });
});

// API endpoint: Get bank ledger transactions
app.get('/api/bank-ledger', (_req: Request, res: Response) => {
  res.json({ transactions: mockBankLedger });
});

// API endpoint: Analyze screenshot
app.post('/api/analyze-receipt', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/png', fileName = 'receipt.png' } = req.body || {};

    if (typeof imageBase64 !== 'string' || !imageBase64.trim()) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    // Clean base64 string and extract the actual MIME type from a data URL when present.
    let cleanBase64 = imageBase64;
    let cleanMime = typeof mimeType === 'string' ? mimeType : 'image/png';
    const safeFileName = typeof fileName === 'string' ? fileName.slice(0, 180) : 'receipt.png';

    if (imageBase64.startsWith('data:')) {
      const commaIdx = imageBase64.indexOf(',');
      if (commaIdx !== -1) {
        const metaPart = imageBase64.substring(0, commaIdx);
        const dataPart = imageBase64.substring(commaIdx + 1);

        const mimeMatch = metaPart.match(/^data:([^;]+)/);
        if (mimeMatch) cleanMime = mimeMatch[1];

        if (metaPart.includes(';base64')) {
          cleanBase64 = dataPart.trim();
        } else {
          // If URL-encoded (e.g. SVG or raw text), decode and base64-encode
          try {
            const decoded = decodeURIComponent(dataPart);
            cleanBase64 = Buffer.from(decoded, 'utf-8').toString('base64');
          } catch {
            cleanBase64 = Buffer.from(dataPart, 'utf-8').toString('base64');
          }
        }
      }
    } else {
      cleanBase64 = cleanBase64.replace(/^data:[^;]+;base64,/, '').trim();
    }

    if (!cleanMime.toLowerCase().startsWith('image/')) {
      return res.status(415).json({ error: 'Only image screenshots can be analyzed.' });
    }
    const buffer = Buffer.from(cleanBase64, 'base64');
    if (!buffer.length) {
      return res.status(400).json({ error: 'The uploaded image is empty or invalid.' });
    }
    if (buffer.length > 20 * 1024 * 1024) {
      return res.status(413).json({ error: 'The uploaded image is larger than 20 MB.' });
    }

    // 1. Calculate image hash for duplicate detection (Step 6)
    const hash = crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 16);
    const nowIso = new Date().toISOString();

    const previousRecord = seenReceipts.get(hash);
    const isDuplicateImage = !!previousRecord;

    if (previousRecord) {
      previousRecord.count += 1;
    } else {
      seenReceipts.set(hash, {
        hash,
        txnId: '',
        amount: '',
        firstSeenAt: nowIso,
        count: 1,
      });
    }

    // 2. Scan byte headers for metadata signatures (Photoshop, Canva, PicsArt, etc.)
    const rawString = buffer.toString('binary', 0, Math.min(buffer.length, 30000));
    let detectedSoftware: string | undefined;
    if (rawString.includes('Canva')) detectedSoftware = 'Canva Design Tool';
    else if (rawString.includes('Photoshop') || rawString.includes('Adobe Photoshop')) detectedSoftware = 'Adobe Photoshop';
    else if (rawString.includes('PicsArt') || rawString.includes('picsart')) detectedSoftware = 'PicsArt Photo Studio';
    else if (rawString.includes('GIMP')) detectedSoftware = 'GIMP Image Editor';

    // 3. Multimodal analysis (only when a server-side Gemini key and supported image are available).
    const supportedGeminiMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'image/heif'];
    const isGeminiCompatible = supportedGeminiMimes.includes(cleanMime.toLowerCase());

    if (geminiClient && isGeminiCompatible) {
      try {
        const response = await geminiClient.models.generateContent({
          model: geminiModel,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: cleanMime,
                  data: cleanBase64,
                },
              },
              {
                text: `Perform comprehensive forensic examination on this Indian payment receipt following the 7 pipeline steps.
Return ONLY valid JSON matching this schema:
{
  "overallScore": number (0 to 100),
  "verdict": "GENUINE" | "SUSPICIOUS" | "FAKE",
  "verdictTitle": string,
  "verdictTitleHi": string,
  "summary": string,
  "summaryHi": string,
  "extracted": {
    "app": "Google Pay" | "PhonePe" | "Paytm" | "BHIM UPI" | "CRED" | "Amazon Pay" | "Spoof App / Unknown",
    "amount": string,
    "amountNumeric": number or null,
    "txnId": string,
    "upiId": string,
    "recipientName": string,
    "senderName": string,
    "dateTime": string,
    "statusText": string,
    "isFutureDate": boolean,
    "isTxnIdStandardLength": boolean
  },
  "pipelineSteps": [
    {
      "id": 1,
      "name": "OCR Text Extraction",
      "nameHi": "ओसीआर टेक्स्ट निष्कर्षण",
      "description": "Extracting Txn ID, amount, timestamp, UPI ID",
      "descriptionHi": "ट्रांजैक्शन आईडी, राशि, समय और यूपीआई पता निकालना",
      "status": "passed" | "warning" | "failed",
      "score": number,
      "details": string,
      "detailsHi": string,
      "flags": string[]
    },
    {
      "id": 2,
      "name": "Format & Syntax Validation",
      "nameHi": "फॉर्मेट व सिंटैक्स जांच",
      "description": "UPI 12-digit UTR rules, timestamp logic, amount formatting",
      "descriptionHi": "12 अंकों का यूपीआई यूटीआर नियम, तारीख और राशि फॉर्मेट जांच",
      "status": "passed" | "warning" | "failed",
      "score": number,
      "details": string,
      "detailsHi": string,
      "flags": string[]
    },
    {
      "id": 3,
      "name": "Template Layout & Typography",
      "nameHi": "टेम्पलेट लेआउट व फ़ॉन्ट मिलान",
      "description": "Comparing UI layout, official app fonts, tick icon",
      "descriptionHi": "ऐप के ऑफिशियल लेआउट, फॉन्ट और चेकमार्क की जांच",
      "status": "passed" | "warning" | "failed",
      "score": number,
      "details": string,
      "detailsHi": string,
      "flags": string[]
    },
    {
      "id": 4,
      "name": "Tampering & Compression (ELA)",
      "nameHi": "छेड़छाड़ व पिक्सेल अनियमितता",
      "description": "Pixel density around amount, splicing boundaries, noise artifacts",
      "descriptionHi": "अमाउंट के आसपास एडिटेड पिक्सेल, फॉन्ट का अंतर और पैचिंग",
      "status": "passed" | "warning" | "failed",
      "score": number,
      "details": string,
      "detailsHi": string,
      "flags": string[]
    },
    {
      "id": 5,
      "name": "Metadata & Software Signatures",
      "nameHi": "मेटाडेटा व एडिटिंग सॉफ्टवेयर जांच",
      "description": "EXIF signatures, Canva/Photoshop tags, spoof app fingerprints",
      "descriptionHi": "कैनवा, फोटोशॉप या फेक-पे स्पूफ ऐप के डिजिटल निशान",
      "status": "passed" | "warning" | "failed",
      "score": number,
      "details": string,
      "detailsHi": string,
      "flags": string[]
    },
    {
      "id": 6,
      "name": "Duplicate Replay Check",
      "nameHi": "डुप्लिकेट / पुरानी रसीद जांच",
      "description": "Verifying against previously logged receipts and transaction IDs",
      "descriptionHi": "पहले इस्तेमाल की गई पुरानी रसीद का दोबारा इस्तेमाल चेक करना",
      "status": "passed" | "warning" | "failed",
      "score": number,
      "details": string,
      "detailsHi": string,
      "flags": string[]
    },
    {
      "id": 7,
      "name": "Scoring Layer & Jev Decision",
      "nameHi": "स्कोरिंग लेयर व जेव निर्णय",
      "description": "Aggregated risk decision model and recommendation",
      "descriptionHi": "समग्र जोखिम स्कोर और दुकानदार के लिए अंतिम चेतावनी",
      "status": "passed" | "warning" | "failed",
      "score": number,
      "details": string,
      "detailsHi": string,
      "flags": string[]
    }
  ],
  "tamperedZones": [
    {
      "label": string,
      "field": "amount" | "txnId" | "dateTime" | "upiId" | "status" | "recipient",
      "text": string,
      "isTampered": boolean,
      "tamperReason": string,
      "box": [number, number, number, number]
    }
  ],
  "redFlags": string[],
  "redFlagsHi": string[],
  "greenFlags": string[],
  "greenFlagsHi": string[],
  "recommendation": string,
  "recommendationHi": string
}`,
              },
            ],
          },
          config: {
            systemInstruction: FORENSIC_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const rawJson = response.text ? response.text.trim() : '';
        if (rawJson) {
          const parsed = JSON.parse(rawJson);

          // Update duplicate check with extracted Txn ID
          const extractedTxn = parsed.extracted?.txnId;
          let isDuplicateTxn = false;
          if (extractedTxn && extractedTxn.length >= 6) {
            const seenTxn = seenTxnIds.get(extractedTxn);
            if (seenTxn) {
              isDuplicateTxn = true;
              parsed.overallScore = Math.min(parsed.overallScore, 30);
              parsed.verdict = 'FAKE';
              parsed.redFlags.unshift(`Duplicate Txn ID re-used: ${extractedTxn} was already submitted earlier!`);
              parsed.redFlagsHi.unshift(`डुप्लिकेट ट्रांजैक्शन आईडी: यह Txn ID (${extractedTxn}) पहले भी उपयोग की जा चुकी है!`);
            } else {
              seenTxnIds.set(extractedTxn, {
                hash,
                txnId: extractedTxn,
                amount: parsed.extracted.amount || '',
                firstSeenAt: nowIso,
                count: 1,
              });
            }
          }

          if (isDuplicateImage && !parsed.redFlags.some((f: string) => f.includes('Duplicate'))) {
            parsed.overallScore = Math.min(parsed.overallScore, 25);
            parsed.verdict = 'FAKE';
            parsed.redFlags.unshift('This exact screenshot was already checked in this session.');
            parsed.redFlagsHi.unshift('वही समान स्क्रीनशॉट पहले भी अपलोड किया जा चुका है! (रीप्ले फ्रॉड)');
          }

          // Metadata override if detected software
          if (detectedSoftware) {
            parsed.metadataInfo = {
              softwareDetected: detectedSoftware,
              hasExifMismatch: true,
              mimeType,
              resolution: 'Mobile Screen',
              isDuplicateScreenshot: isDuplicateImage || isDuplicateTxn,
              previousSeenDate: previousRecord ? previousRecord.firstSeenAt : undefined,
            };
            if (!parsed.redFlags.some((f: string) => f.includes(detectedSoftware!))) {
              parsed.redFlags.push(`Image header contains '${detectedSoftware}' editing software tag`);
              parsed.redFlagsHi.push(`फोटो के मेटाडेटा में '${detectedSoftware}' एडिटिंग टूल का नाम मिला है`);
            }
          } else {
            parsed.metadataInfo = {
              softwareDetected: undefined,
              hasExifMismatch: false,
              mimeType,
              resolution: 'Mobile Screen',
              isDuplicateScreenshot: isDuplicateImage || isDuplicateTxn,
              previousSeenDate: previousRecord ? previousRecord.firstSeenAt : undefined,
            };
          }

          parsed.id = `rep-${Date.now()}`;
          parsed.timestamp = Date.now();
          parsed.fileName = safeFileName;
          parsed.fileSize = buffer.length;
          parsed.imageHash = hash;

          return res.json(parsed);
        }
      } catch (geminiErr) {
        console.warn('Gemini API call error, falling back to forensic heuristics engine:', geminiErr);
      }
    }

    // Conservative fallback: return a report, but never label an unreadable upload as genuine.
    const report = generateHeuristicForensics({
      rawString,
      fileName: safeFileName,
      bufferLength: buffer.length,
      hash,
      isDuplicateImage,
      detectedSoftware,
      mimeType: cleanMime,
      nowIso,
    });

    return res.json(report);
  } catch (error) {
    console.error('Server error analyzing receipt:', error);
    res.status(500).json({
      error: 'Failed to process screenshot forensics',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Heuristics Engine
function generateHeuristicForensics(options: {
  rawString: string;
  fileName: string;
  bufferLength: number;
  hash: string;
  isDuplicateImage: boolean;
  detectedSoftware?: string;
  mimeType: string;
  nowIso: string;
}) {
  const { rawString, fileName, bufferLength, hash, isDuplicateImage, mimeType, nowIso } = options;
  const lowerFileName = fileName.toLowerCase();

  // Raster demo receipts do not retain their SVG text after canvas export, so recognize the bundled samples by name.
  const isFakeGPaySample = lowerFileName.includes('fake-gpay-45k');
  const isFakePhonePeSample = lowerFileName.includes('fake-phonepe-spoof');
  const isRealPaytmSample = lowerFileName.includes('real-paytm-850');
  const isRealGPaySample = lowerFileName.includes('real-gpay-3200');
  const isCanva = isFakeGPaySample || rawString.includes('Canva') || rawString.includes('Comic Sans') || rawString.includes('Canva Artifact');
  const isFakePay = isFakePhonePeSample || rawString.includes('FakePay') || rawString.includes('Spoof') || rawString.includes('Prank');
  // Only the bundled, explicitly selected samples can be marked positive without the Vision model.
  const isKnownDemo = isFakeGPaySample || isFakePhonePeSample || isRealPaytmSample || isRealGPaySample;
  let detectedEditor = options.detectedSoftware;
  if (!detectedEditor && isFakeGPaySample) detectedEditor = 'Canva Design Tool (demo sample)';

  let appName = 'Spoof App / Unknown';
  let amountStr = 'Not extracted';
  let amountNum: number | null = null;
  let txnId = '';
  let isTxnValid = false;
  let isFutureDate = false;
  let verdict: 'GENUINE' | 'SUSPICIOUS' | 'FAKE' = 'SUSPICIOUS';
  let trustScore = 48;
  let dateTime = 'Not extracted';
  let statusText = 'Unverified';
  let redFlags: string[] = [
    'We couldn’t read the payment details in this screenshot.',
    'No payment reference was found.',
  ];
  let redFlagsHi: string[] = [
    'इस डिप्लॉयमेंट में विज़ुअल AI जांच उपलब्ध नहीं है, इसलिए रसीद असली है या नहीं यह तय नहीं हो सका।',
    'ट्रांजैक्शन की जानकारी नहीं निकली। सामान देने से पहले बैंक ऐप में क्रेडिट ज़रूर जांचें।',
  ];
  let greenFlags: string[] = [];
  let greenFlagsHi: string[] = [];

  if (isFakeGPaySample) {
    appName = 'Google Pay';
    amountStr = '₹ 45,000';
    amountNum = 45000;
    txnId = '948210492'; // Demo sample: intentionally invalid 9-digit UTR.
    dateTime = '01 Oct 2026, 09:41 AM';
    statusText = 'Payment Successful';
    verdict = 'FAKE';
    trustScore = 18;
    redFlags = [
      'The payment reference has 9 digits; standard UPI references have 12.',
      'The amount uses a different font from the rest of the receipt.',
      'This sample contains editing marks.',
      'A visible patch appears around the ₹45,000 amount.',
    ];
    redFlagsHi = [
      'UPI Transaction ID में केवल 9 अंक हैं (आमतौर पर UTR में 12 अंक होते हैं)।',
      'डेमो रसीद में अमाउंट वाले हिस्से का फॉन्ट अलग है।',
      'यह नमूना Canva-संपादित रसीद के रूप में बनाया गया है।',
      '₹45,000 के आसपास कंप्रेशन पैच दिखाई देता है।',
    ];
  } else if (isFakePhonePeSample) {
    appName = 'PhonePe';
    amountStr = '₹ 88,500';
    amountNum = 88500;
    txnId = '427189X0912A';
    dateTime = '25 Dec 2026, 11:15 PM';
    statusText = 'Payment Successful';
    isFutureDate = true;
    verdict = 'FAKE';
    trustScore = 12;
    redFlags = [
      'This screenshot uses a known fake-payment template.',
      'The date is in the future: 25 Dec 2026.',
      'The reference contains letters instead of 12 digits.',
      'The layout and checkmark do not match the usual app design.',
    ];
    redFlagsHi = [
      'FakePay v3.2 स्पूफ ऐप टेम्पलेट के संकेत मिले।',
      'भविष्य की तारीख: रसीद पर 25 Dec 2026 लिखा है।',
      'UTR में 12 अंकों के बजाय अक्षर मौजूद हैं।',
      'चेकमार्क और पेमेंट लेआउट सामान्य ऐप जैसा नहीं है।',
    ];
  } else if (isRealPaytmSample) {
    appName = 'Paytm';
    amountStr = '₹ 850';
    amountNum = 850;
    txnId = '427189012345';
    dateTime = '01 Oct 2026, 02:27 PM';
    statusText = 'Payment successful';
    isTxnValid = true;
    verdict = 'GENUINE';
    trustScore = 98;
    redFlags = [];
    redFlagsHi = [];
    greenFlags = [
      'This example uses a 12-digit payment reference.',
      'Its layout matches the Paytm sample design.',
      'This image has not been checked before in this session.',
    ];
    greenFlagsHi = [
      'डेमो नमूने में 12 अंकों का UPI रेफरेंस है।',
      'रसीद को असली Paytm नमूने के रूप में बनाया गया है।',
      'इस स्कैन में डुप्लिकेट नमूना नहीं मिला।',
    ];
  } else if (isRealGPaySample) {
    appName = 'Google Pay';
    amountStr = '₹ 3,200';
    amountNum = 3200;
    txnId = '427511993421';
    dateTime = '01 Oct 2026, 04:02 PM';
    statusText = 'Completed';
    isTxnValid = true;
    verdict = 'GENUINE';
    trustScore = 96;
    redFlags = [];
    redFlagsHi = [];
    greenFlags = [
      'This example uses a 12-digit payment reference.',
      'Its layout matches the Google Pay sample design.',
      'This image has not been checked before in this session.',
    ];
    greenFlagsHi = [
      'डेमो नमूने में 12 अंकों का UPI रेफरेंस है।',
      'रसीद को असली Google Pay नमूने के रूप में बनाया गया है।',
      'इस स्कैन में डुप्लिकेट नमूना नहीं मिला।',
    ];
  }

  if (isDuplicateImage) {
    trustScore = Math.min(trustScore, 20);
    verdict = 'FAKE';
    redFlags.unshift('This exact screenshot was already checked in this session.');
    redFlagsHi.unshift('वही समान स्क्रीनशॉट पहले भी अपलोड किया जा चुका है! (रीप्ले फ्रॉड)');
  }

  const verdictTitles = VERDICT_TITLES[verdict as RiskLevel] || VERDICT_TITLES.FAKE;

  return {
    id: `rep-${Date.now()}`,
    timestamp: Date.now(),
    fileName,
    fileSize: bufferLength,
    imageHash: hash,
    overallScore: trustScore,
    verdict,
    verdictTitle: verdictTitles.en,
    verdictTitleHi: verdictTitles.hi,
    summary: verdict === 'GENUINE'
      ? `This ${appName} example shows no obvious edits. Always confirm real payments in your bank app.`
      : verdict === 'FAKE'
        ? isDuplicateImage
          ? 'This exact screenshot was already checked in this session.'
          : 'This sample shows signs of editing. Wait until the money appears in your bank app before handing anything over.'
        : 'We couldn’t read the payment details in this screenshot. Check your bank app to confirm whether the money arrived.',
    summaryHi: verdict === 'GENUINE'
      ? `यह ${appName} का डेमो नमूना है जिसे सकारात्मक उदाहरण के रूप में रखा गया है। स्क्रीनशॉट बैंक क्रेडिट का प्रमाण नहीं है।`
      : verdict === 'FAKE'
        ? isDuplicateImage
          ? 'यह बिल्कुल वही स्क्रीनशॉट इस सेशन में पहले भी जांचा गया है। दोबारा इस्तेमाल की गई रसीद को रीप्ले जोखिम मानें।'
          : 'इस डेमो रसीद में स्पूफ या छेड़छाड़ के स्पष्ट संकेत हैं। केवल इस तस्वीर के आधार पर सामान न दें।'
        : 'तस्वीर मिली, लेकिन इस डिप्लॉयमेंट में उसे पढ़ने वाला विज़न मॉडल उपलब्ध नहीं है। बैंक ऐप में क्रेडिट जांचें।',
    extracted: {
      app: appName as any,
      amount: amountStr,
      amountNumeric: amountNum,
      txnId,
      upiId: '',
      recipientName: '',
      senderName: '',
      dateTime,
      statusText,
      isFutureDate,
      isTxnIdStandardLength: isTxnValid,
    },
    pipelineSteps: [
      {
        id: 1,
        name: 'OCR Text Extraction',
        nameHi: 'ओसीआर टेक्स्ट निष्कर्षण',
        description: 'Extracting Txn ID, amount, timestamp, UPI ID',
        descriptionHi: 'ट्रांजैक्शन आईडी, राशि, समय और यूपीआई पता निकालना',
        status: isKnownDemo ? 'passed' : 'warning',
        score: isKnownDemo ? 95 : 35,
        details: isKnownDemo
          ? `Sample details: ${amountStr}, reference: ${txnId || 'not available'}`
          : 'Vision/OCR is not configured; no transaction fields could be extracted from this image.',
        detailsHi: isKnownDemo
          ? `नमूने की जानकारी: ${amountStr}, रेफरेंस: ${txnId || 'उपलब्ध नहीं'}`
          : 'विज़न/OCR उपलब्ध नहीं है; तस्वीर से ट्रांजैक्शन जानकारी नहीं निकाली जा सकी।',
        flags: isKnownDemo ? [] : ['Vision model unavailable'],
      },
      {
        id: 2,
        name: 'Format & Syntax Validation',
        nameHi: 'फॉर्मेट व सिंटैक्स जांच',
        description: 'UPI 12-digit UTR rules, timestamp logic, amount formatting',
        descriptionHi: '12 अंकों का यूपीआई यूटीआर नियम, तारीख और राशि फॉर्मेट जांच',
        status: !isKnownDemo ? 'warning' : isTxnValid && !isFutureDate ? 'passed' : 'failed',
        score: !isKnownDemo ? 35 : isTxnValid && !isFutureDate ? 98 : 20,
        details: !isKnownDemo
          ? 'No readable UTR or timestamp was available for validation.'
          : isTxnValid && !isFutureDate ? 'Valid 12-digit UTR and sample date.' : 'The sample has a non-standard UTR or future timestamp.',
        detailsHi: !isKnownDemo
          ? 'जांच के लिए पढ़ने योग्य UTR या तारीख उपलब्ध नहीं थी।'
          : isTxnValid && !isFutureDate ? 'डेमो में 12 अंकों का UTR और तारीख सही है।' : 'नमूने में गलत UTR या भविष्य की तारीख है।',
        flags: !isKnownDemo ? ['No OCR data'] : isTxnValid ? [] : ['Non-standard UTR length', 'Timestamp anomaly'],
      },
      {
        id: 3,
        name: 'Template Layout & Typography',
        nameHi: 'टेम्पलेट लेआउट व फ़ॉन्ट मिलान',
        description: 'Comparing UI layout, official app fonts, tick icon',
        descriptionHi: 'ऐप के ऑफिशियल लेआउट, फॉन्ट और चेकमार्क की जांच',
        status: !isKnownDemo ? 'warning' : verdict === 'GENUINE' ? 'passed' : 'failed',
        score: !isKnownDemo ? 35 : verdict === 'GENUINE' ? 96 : 30,
        details: !isKnownDemo
          ? 'Layout cannot be compared until the image text is available.'
          : verdict === 'GENUINE' ? 'Bundled positive sample layout.' : 'The sample includes a typography or spoof-layout warning.',
        detailsHi: !isKnownDemo
          ? 'तस्वीर का टेक्स्ट उपलब्ध होने पर ही लेआउट की तुलना हो सकती है।'
          : verdict === 'GENUINE' ? 'सकारात्मक डेमो नमूने का लेआउट।' : 'नमूने में फॉन्ट या स्पूफ लेआउट की चेतावनी है।',
        flags: !isKnownDemo ? ['Vision model unavailable'] : verdict === 'GENUINE' ? [] : ['Font family discrepancy'],
      },
      {
        id: 4,
        name: 'Tampering & Compression (ELA)',
        nameHi: 'छेड़छाड़ व पिक्सेल अनियमितता',
        description: 'Pixel density around amount, splicing boundaries, noise artifacts',
        descriptionHi: 'अमाउंट के आसपास एडिटेड पिक्सेल, फॉन्ट का अंतर और पैचिंग',
        status: !isKnownDemo ? 'warning' : verdict === 'GENUINE' ? 'passed' : 'failed',
        score: !isKnownDemo ? 35 : verdict === 'GENUINE' ? 95 : 15,
        details: !isKnownDemo
          ? 'Pixel-forensics verdict is unavailable without the vision analysis service.'
          : verdict === 'GENUINE' ? 'Positive demo sample; pixel evidence is illustrative.' : 'Tampering cues are included in this fake demo sample.',
        detailsHi: !isKnownDemo
          ? 'विज़न जांच सेवा के बिना पिक्सेल फॉरेंसिक्स उपलब्ध नहीं है।'
          : verdict === 'GENUINE' ? 'सकारात्मक डेमो नमूना; पिक्सेल जानकारी केवल उदाहरण है।' : 'इस फ़ेक डेमो में छेड़छाड़ के संकेत शामिल हैं।',
        flags: !isKnownDemo ? ['Vision model unavailable'] : verdict === 'GENUINE' ? [] : ['Demo tampering signal'],
      },
      {
        id: 5,
        name: 'Metadata & Software Signatures',
        nameHi: 'मेटाडेटा व एडिटिंग सॉफ्टवेयर जांच',
        description: 'EXIF signatures, Canva/Photoshop tags, spoof app fingerprints',
        descriptionHi: 'कैनवा, फोटोशॉप या फेक-पे स्पूफ ऐप के डिजिटल निशान',
        status: detectedEditor || isCanva || isFakePay ? 'failed' : isKnownDemo ? 'passed' : 'warning',
        score: detectedEditor || isCanva || isFakePay ? 20 : isKnownDemo ? 96 : 35,
        details: detectedEditor
          ? `Editing signature: ${detectedEditor}`
          : isFakePay ? 'Known FakePay demo fingerprint.' : !isKnownDemo ? 'Metadata checks cannot validate authenticity without image analysis.' : 'No known editor marker in this bundled demo.',
        detailsHi: detectedEditor
          ? `एडिटिंग टूल: ${detectedEditor}`
          : isFakePay ? 'FakePay डेमो टेम्पलेट के संकेत मिले।' : !isKnownDemo ? 'इमेज जांच के बिना मेटाडेटा से प्रामाणिकता तय नहीं हो सकती।' : 'इस डेमो नमूने में ज्ञात एडिटर टैग नहीं है।',
        flags: detectedEditor ? [detectedEditor] : isFakePay ? ['FakePay template'] : !isKnownDemo ? ['Vision model unavailable'] : [],
      },
      {
        id: 6,
        name: 'Duplicate Replay Check',
        nameHi: 'डुप्लिकेट / पुरानी रसीद जांच',
        description: 'Verifying against previously logged receipts and transaction IDs',
        descriptionHi: 'पहले इस्तेमाल की गई पुरानी रसीद का दोबारा इस्तेमाल चेक करना',
        status: isDuplicateImage ? 'failed' : 'passed',
        score: isDuplicateImage ? 10 : 99,
        details: isDuplicateImage ? 'Identical image hash recorded earlier' : 'First occurrence of this image in registry',
        detailsHi: isDuplicateImage ? 'यह स्क्रीनशॉट पहले भी लॉग किया जा चुका है' : 'यह स्क्रीनशॉट पहली बार स्कैन हुआ है',
        flags: isDuplicateImage ? ['Duplicate Hash'] : [],
      },
      {
        id: 7,
        name: 'Scoring Layer & Jev Decision',
        nameHi: 'स्कोरिंग लेयर व जेव निर्णय',
        description: 'Aggregated risk decision model and recommendation',
        descriptionHi: 'समग्र जोखिम स्कोर और दुकानदार के लिए अंतिम चेतावनी',
        status: verdict === 'GENUINE' ? 'passed' : verdict === 'FAKE' ? 'failed' : 'warning',
        score: trustScore,
        details: `Final Trust Score: ${trustScore}/100 [${verdict}]`,
        detailsHi: `अंतिम विश्वसनीयता स्कोर: ${trustScore}/100 [${verdict}]`,
        flags: [],
      },
    ],
    tamperedZones: isFakeGPaySample || isFakePhonePeSample ? [
      {
        label: 'Amount Block',
        field: 'amount' as const,
        text: amountStr,
        isTampered: true,
        tamperReason: 'Known visual tampering cue in this bundled demo sample.',
        box: [240, 200, 360, 800] as [number, number, number, number],
      },
      {
        label: 'UPI UTR Field',
        field: 'txnId' as const,
        text: txnId,
        isTampered: !isTxnValid,
        tamperReason: 'Non-standard UTR length or syntax in the demo sample.',
        box: [460, 100, 530, 900] as [number, number, number, number],
      },
    ] : [],
    redFlags,
    redFlagsHi,
    greenFlags,
    greenFlagsHi,
    metadataInfo: {
      softwareDetected: detectedEditor,
      hasExifMismatch: !!detectedEditor,
      mimeType,
      resolution: isKnownDemo ? '720 x 1280' : 'Not extracted',
      isDuplicateScreenshot: isDuplicateImage,
      previousSeenDate: undefined,
    },
    recommendation: verdict === 'GENUINE'
      ? 'This is a positive demo sample only. For a real payment, confirm the credit in your bank app or account statement.'
      : verdict === 'FAKE'
        ? 'Do not release goods based on this screenshot. Ask the sender to wait until the credit appears in your bank app or statement.'
        : 'The screenshot could not be verified because automated vision is unavailable. Do not treat it as proof; check your bank app or statement directly.',
    recommendationHi: verdict === 'GENUINE'
      ? 'यह केवल सकारात्मक डेमो नमूना है। असली भुगतान के लिए बैंक ऐप या स्टेटमेंट में क्रेडिट ज़रूर जांचें।'
      : verdict === 'FAKE'
        ? 'इस स्क्रीनशॉट के आधार पर सामान न दें। बैंक ऐप या स्टेटमेंट में क्रेडिट आने तक प्रतीक्षा करें।'
        : 'ऑटोमेटेड विज़न उपलब्ध नहीं है, इसलिए रसीद की पुष्टि नहीं हो सकी। इसे प्रमाण न मानें; सीधे बैंक ऐप में जांचें।',
  };
}

// Mount Vite or serve static files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PayShield full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

export { app };
export default app;

// Vercel imports this Express app as a serverless function; local production/dev runs listen here.
if (process.env.VERCEL !== '1') {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
