/**
 * High-fidelity realistic receipt generators for instant demo testing
 * Simulates both authentic UPI layouts and real-world spoof/tampered receipts.
 */

export interface PresetItem {
  id: string;
  title: string;
  titleHi: string;
  badge: 'Fake' | 'Real' | 'Duplicate';
  badgeColor: string;
  app: string;
  amount: string;
  description: string;
  descriptionHi: string;
  getDataUrl: () => Promise<string>;
}

// Convert SVG to raster PNG Data URL using offscreen canvas in browser
export async function svgToPngDataUrl(svgString: string, width = 720, height = 1280): Promise<string> {
  if (typeof window === 'undefined') {
    return `data:image/svg+xml;base64,${Buffer.from(svgString).toString('base64')}`;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const pngUrl = canvas.toDataURL('image/png');
            URL.revokeObjectURL(blobURL);
            resolve(pngUrl);
            return;
          }
        } catch (canvasErr) {
          console.warn('Canvas export failed, falling back to base64 SVG:', canvasErr);
        }
        URL.revokeObjectURL(blobURL);
        const b64 = window.btoa(unescape(encodeURIComponent(svgString)));
        resolve(`data:image/svg+xml;base64,${b64}`);
      };

      img.onerror = () => {
        URL.revokeObjectURL(blobURL);
        const b64 = window.btoa(unescape(encodeURIComponent(svgString)));
        resolve(`data:image/svg+xml;base64,${b64}`);
      };

      img.src = blobURL;
    } catch {
      const b64 = window.btoa(unescape(encodeURIComponent(svgString)));
      resolve(`data:image/svg+xml;base64,${b64}`);
    }
  });
}

// 1. Fake GPay: Tampered Amount (₹45,000 spliced with mismatched font, 9-digit invalid UTR)
function createFakeGPaySvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280" style="background:#ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <!-- Android Status Bar -->
    <rect width="720" height="60" fill="#1a73e8" />
    <text x="36" y="40" fill="#ffffff" font-size="22" font-weight="600">09:42</text>
    <text x="640" y="40" fill="#ffffff" font-size="20">📶 84%</text>

    <!-- Header -->
    <rect y="60" width="720" height="120" fill="#ffffff" />
    <circle cx="60" cy="120" r="24" fill="#f1f3f4" />
    <text x="50" y="128" fill="#5f6368" font-size="28">✕</text>
    <text x="360" y="128" text-anchor="middle" fill="#202124" font-size="28" font-weight="600">Google Pay</text>

    <!-- Main Content -->
    <g transform="translate(0, 160)">
      <!-- Animated / Glowing Checkmark -->
      <circle cx="360" cy="120" r="64" fill="#0f9d58" />
      <path d="M335 120 L352 138 L388 102" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />

      <text x="360" y="240" text-anchor="middle" fill="#202124" font-size="34" font-weight="700">Payment to Sharma Electronics</text>
      <text x="360" y="280" text-anchor="middle" fill="#5f6368" font-size="22">sharma.store@okaxis</text>

      <!-- TAMPERED AMOUNT AREA: Notice mismatched bold font & compression box artifact -->
      <rect x="180" y="320" width="360" height="90" fill="#eef2ff" stroke="#4f46e5" stroke-dasharray="6,4" rx="8" />
      <text x="360" y="380" text-anchor="middle" fill="#111827" font-size="56" font-weight="900" font-family="'Comic Sans MS', 'Impact', sans-serif">₹ 45,000</text>
      <text x="360" y="430" text-anchor="middle" fill="#dc2626" font-size="16" font-weight="bold">⚠ Font Mismatch &amp; Canva Artifact Detected</text>

      <!-- Transaction details card -->
      <rect x="40" y="470" width="640" height="420" rx="20" fill="#f8f9fa" stroke="#dadce0" stroke-width="1.5" />

      <text x="80" y="530" fill="#5f6368" font-size="22">UPI transaction ID</text>
      <!-- INVALID 9 DIGIT UPI ID instead of 12 digits -->
      <text x="600" y="530" text-anchor="end" fill="#d93025" font-size="22" font-weight="bold">948210492 (9 Digits)</text>

      <line x1="80" y1="565" x2="600" y2="565" stroke="#e8eaed" stroke-width="1" />

      <text x="80" y="620" fill="#5f6368" font-size="22">To</text>
      <text x="600" y="620" text-anchor="end" fill="#202124" font-size="22" font-weight="600">Sharma Electronics</text>

      <line x1="80" y1="655" x2="600" y2="655" stroke="#e8eaed" stroke-width="1" />

      <text x="80" y="710" fill="#5f6368" font-size="22">From</text>
      <text x="600" y="710" text-anchor="end" fill="#202124" font-size="22">Rajesh Kumar (SBI ****8912)</text>

      <line x1="80" y1="745" x2="600" y2="745" stroke="#e8eaed" stroke-width="1" />

      <text x="80" y="800" fill="#5f6368" font-size="22">Date &amp; Time</text>
      <text x="600" y="800" text-anchor="end" fill="#202124" font-size="22">01 Oct 2026, 09:41 AM</text>

      <line x1="80" y1="835" x2="600" y2="835" stroke="#e8eaed" stroke-width="1" />

      <text x="80" y="870" fill="#5f6368" font-size="20">Google Transaction ID</text>
      <text x="600" y="870" text-anchor="end" fill="#202124" font-size="20">CICAgID_38fkw</text>
    </g>

    <!-- Bottom watermark info -->
    <rect y="1180" width="720" height="100" fill="#f1f3f4" />
    <text x="360" y="1240" text-anchor="middle" fill="#5f6368" font-size="20">Powered by UPI • Google Pay</text>
  </svg>`;
}

// 2. Fake PhonePe Spoof App (PrankPay / Spoof UPI template with future timestamp)
function createFakePhonePeSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280" style="background:#5f259f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <!-- Android Status Bar -->
    <rect width="720" height="55" fill="#4d1b82" />
    <text x="36" y="38" fill="#ffffff" font-size="22" font-weight="600">11:15</text>
    <text x="640" y="38" fill="#ffffff" font-size="20">5G 92%</text>

    <!-- PhonePe Header -->
    <rect y="55" width="720" height="260" fill="#5f259f" />
    <circle cx="360" cy="150" r="50" fill="#ffffff" />
    <!-- Wrong tick icon shape used by fake apps -->
    <text x="360" y="168" text-anchor="middle" fill="#5f259f" font-size="52" font-weight="bold">✓</text>
    <text x="360" y="245" text-anchor="middle" fill="#ffffff" font-size="34" font-weight="700">Payment Successful</text>

    <!-- White Body Container -->
    <rect y="315" width="720" height="965" rx="30" fill="#ffffff" />

    <g transform="translate(0, 315)">
      <!-- Recipient -->
      <text x="360" y="80" text-anchor="middle" fill="#1f2937" font-size="28" font-weight="600">Paid to Verma Jewellers</text>
      
      <!-- Fake Big Amount with misaligned decimal and uneven kerning -->
      <text x="360" y="170" text-anchor="middle" fill="#000000" font-size="68" font-weight="800">₹88,500.0</text>
      
      <!-- Spoof App Signature Banner -->
      <rect x="60" y="210" width="600" height="50" rx="8" fill="#fee2e2" />
      <text x="360" y="242" text-anchor="middle" fill="#b91c1c" font-size="18" font-weight="600">⚠ Spoof App Template: FakePay v3.2 Signature Found</text>

      <rect x="40" y="280" width="640" height="480" rx="16" fill="#f9fafb" stroke="#e5e7eb" stroke-width="2" />

      <text x="70" y="340" fill="#6b7280" font-size="22">Transaction ID</text>
      <text x="650" y="340" text-anchor="end" fill="#111827" font-size="22" font-weight="bold">T24100109151240098</text>

      <line x1="70" y1="375" x2="650" y2="375" stroke="#e5e7eb" stroke-width="1.5" />

      <text x="70" y="430" fill="#6b7280" font-size="22">UTR / UPI Ref No.</text>
      <!-- INVALID: Contains alphabets in UTR -->
      <text x="650" y="430" text-anchor="end" fill="#ef4444" font-size="22" font-weight="bold">427189X0912A (Invalid)</text>

      <line x1="70" y1="465" x2="650" y2="465" stroke="#e5e7eb" stroke-width="1.5" />

      <text x="70" y="520" fill="#6b7280" font-size="22">Date &amp; Time</text>
      <!-- FUTURE DATE: 25 Dec 2026 -->
      <text x="650" y="520" text-anchor="end" fill="#dc2626" font-size="22" font-weight="bold">25 Dec 2026, 11:15 pm (Future!)</text>

      <line x1="70" y1="555" x2="650" y2="555" stroke="#e5e7eb" stroke-width="1.5" />

      <text x="70" y="610" fill="#6b7280" font-size="22">Debited From</text>
      <text x="650" y="610" text-anchor="end" fill="#111827" font-size="22">HDFC Bank - 5821</text>

      <line x1="70" y1="645" x2="650" y2="645" stroke="#e5e7eb" stroke-width="1.5" />

      <text x="70" y="700" fill="#6b7280" font-size="22">Credited To</text>
      <text x="650" y="700" text-anchor="end" fill="#111827" font-size="22">vermajewellers@ybl</text>
    </g>
  </svg>`;
}

// 3. Real Paytm Receipt (100% Genuine formatting, 12-digit UTR 427189012345, proper fonts)
function createRealPaytmSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280" style="background:#ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <!-- Android Status Bar -->
    <rect width="720" height="55" fill="#002e6e" />
    <text x="36" y="38" fill="#ffffff" font-size="22" font-weight="600">14:28</text>
    <text x="640" y="38" fill="#ffffff" font-size="20">4G 96%</text>

    <!-- Paytm Top bar -->
    <rect y="55" width="720" height="90" fill="#002e6e" />
    <text x="50" y="112" fill="#00baf2" font-size="32" font-weight="800">paytm</text>
    <text x="650" y="110" text-anchor="end" fill="#ffffff" font-size="24">Help</text>

    <!-- Success Header -->
    <rect y="145" width="720" height="230" fill="#002e6e" />
    <circle cx="360" cy="225" r="48" fill="#00baf2" />
    <path d="M342 225 L354 237 L380 211" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
    <text x="360" y="310" text-anchor="middle" fill="#ffffff" font-size="30" font-weight="700">Money Sent Successfully</text>
    <text x="360" y="345" text-anchor="middle" fill="#8cb3e8" font-size="20">To Gupta Grocery Store</text>

    <!-- White Card -->
    <g transform="translate(0, 375)">
      <!-- Real Amount -->
      <text x="360" y="80" text-anchor="middle" fill="#002e6e" font-size="64" font-weight="800">₹850</text>
      <text x="360" y="120" text-anchor="middle" fill="#6c757d" font-size="20">01 Oct 2026, 02:27 PM</text>

      <!-- Details List -->
      <rect x="40" y="160" width="640" height="490" rx="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />

      <text x="70" y="220" fill="#64748b" font-size="22">UPI Reference No (UTR)</text>
      <!-- VALID 12 DIGITS -->
      <text x="650" y="220" text-anchor="end" fill="#0f172a" font-size="22" font-weight="bold">427189012345</text>

      <line x1="70" y1="255" x2="650" y2="255" stroke="#e2e8f0" stroke-width="1" />

      <text x="70" y="310" fill="#64748b" font-size="22">To UPI ID</text>
      <text x="650" y="310" text-anchor="end" fill="#0f172a" font-size="22" font-weight="600">guptastore@paytm</text>

      <line x1="70" y1="345" x2="650" y2="345" stroke="#e2e8f0" stroke-width="1" />

      <text x="70" y="400" fill="#64748b" font-size="22">From</text>
      <text x="650" y="400" text-anchor="end" fill="#0f172a" font-size="22">Aman Verma (Kotak 6120)</text>

      <line x1="70" y1="435" x2="650" y2="435" stroke="#e2e8f0" stroke-width="1" />

      <text x="70" y="490" fill="#64748b" font-size="22">Paytm Order ID</text>
      <text x="650" y="490" text-anchor="end" fill="#0f172a" font-size="20">2026100114278912</text>

      <line x1="70" y1="525" x2="650" y2="525" stroke="#e2e8f0" stroke-width="1" />

      <text x="70" y="580" fill="#64748b" font-size="22">Bank Reference</text>
      <text x="650" y="580" text-anchor="end" fill="#16a34a" font-size="22" font-weight="bold">Bank Approved ✓</text>
    </g>

    <!-- Bottom security reassurance -->
    <rect y="1160" width="720" height="120" fill="#f1f5f9" />
    <text x="360" y="1225" text-anchor="middle" fill="#475569" font-size="20">100% Safe Payments • Verified by NPCI</text>
  </svg>`;
}

// 4. Real GPay Receipt (₹3,200, 12-digit UTR 427511993421, authentic Roboto/Google Sans styling)
function createRealGPaySvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280" style="background:#ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <!-- Android Status Bar -->
    <rect width="720" height="60" fill="#1a73e8" />
    <text x="36" y="40" fill="#ffffff" font-size="22" font-weight="600">16:05</text>
    <text x="640" y="40" fill="#ffffff" font-size="20">5G 98%</text>

    <!-- Header -->
    <rect y="60" width="720" height="100" fill="#ffffff" />
    <text x="50" y="120" fill="#5f6368" font-size="30">←</text>
    <text x="360" y="120" text-anchor="middle" fill="#202124" font-size="26" font-weight="600">Payment details</text>

    <g transform="translate(0, 160)">
      <!-- Google Pay authentic checkmark -->
      <circle cx="360" cy="100" r="54" fill="#0f9d58" />
      <path d="M338 100 L353 115 L384 84" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />

      <text x="360" y="200" text-anchor="middle" fill="#202124" font-size="30" font-weight="700">Paid to Cafe Coffee Day</text>
      <text x="360" y="240" text-anchor="middle" fill="#5f6368" font-size="22">ccd.cp@okhdfcbank</text>

      <!-- Authentic amount formatting -->
      <text x="360" y="340" text-anchor="middle" fill="#202124" font-size="64" font-weight="800">₹3,200</text>
      <text x="360" y="380" text-anchor="middle" fill="#137333" font-size="20" font-weight="600">✓ Completed</text>

      <!-- Details Card -->
      <rect x="40" y="420" width="640" height="420" rx="16" fill="#f8f9fa" stroke="#dadce0" stroke-width="1" />

      <text x="70" y="480" fill="#5f6368" font-size="22">UPI transaction ID</text>
      <!-- VALID 12 DIGIT NUMERIC UTR -->
      <text x="650" y="480" text-anchor="end" fill="#202124" font-size="22" font-weight="600">427511993421</text>

      <line x1="70" y1="515" x2="650" y2="515" stroke="#e8eaed" stroke-width="1" />

      <text x="70" y="570" fill="#5f6368" font-size="22">To</text>
      <text x="650" y="570" text-anchor="end" fill="#202124" font-size="22" font-weight="600">Cafe Coffee Day</text>

      <line x1="70" y1="605" x2="650" y2="605" stroke="#e8eaed" stroke-width="1" />

      <text x="70" y="660" fill="#5f6368" font-size="22">From</text>
      <text x="650" y="660" text-anchor="end" fill="#202124" font-size="22">Kavita Rao (ICICI ****9102)</text>

      <line x1="70" y1="695" x2="650" y2="695" stroke="#e8eaed" stroke-width="1" />

      <text x="70" y="750" fill="#5f6368" font-size="22">Date &amp; Time</text>
      <text x="650" y="750" text-anchor="end" fill="#202124" font-size="22">01 Oct 2026, 04:02 PM</text>

      <line x1="70" y1="785" x2="650" y2="785" stroke="#e8eaed" stroke-width="1" />

      <text x="70" y="820" fill="#5f6368" font-size="20">Google Transaction ID</text>
      <text x="650" y="820" text-anchor="end" fill="#5f6368" font-size="20">CICAgIDv_92bFA</text>
    </g>
  </svg>`;
}

export const PRESET_RECEIPTS: PresetItem[] = [
  {
    id: 'fake-gpay-45k',
    title: 'Fake GPay ₹45,000 (Canva Edited)',
    titleHi: 'फ़ेक GPay ₹45,000 (फॉन्ट छेड़छाड़)',
    badge: 'Fake',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    app: 'Google Pay',
    amount: '₹45,000',
    description: 'Amount font mismatched, invalid 9-digit UTR, Canva image artifact.',
    descriptionHi: 'राशि का फॉन्ट अलग है, केवल 9 अंकों का गलत UTR, फोटोशॉप/कैनवा आर्टिफ़ैक्ट।',
    getDataUrl: () => svgToPngDataUrl(createFakeGPaySvg()),
  },
  {
    id: 'fake-phonepe-spoof',
    title: 'Spoof PhonePe (FakePay App)',
    titleHi: 'नकली PhonePe (प्रैंक/स्पूफ ऐप)',
    badge: 'Fake',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    app: 'PhonePe Spoof',
    amount: '₹88,500',
    description: 'FakePay generator signature, future timestamp, alphabets in UTR.',
    descriptionHi: 'फेक-पे जनरेटर टेम्पलेट, भविष्य की तारीख (25 Dec 2026), UTR में गलत अक्षर।',
    getDataUrl: () => svgToPngDataUrl(createFakePhonePeSvg()),
  },
  {
    id: 'real-paytm-850',
    title: 'Real Paytm Receipt ₹850',
    titleHi: 'असली Paytm रसीद ₹850',
    badge: 'Real',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    app: 'Paytm UPI',
    amount: '₹850',
    description: 'Genuine NPCI verified 12-digit UTR 427189012345 with clean ELA.',
    descriptionHi: '100% असली 12 अंकों का UTR 427189012345, ऑथेंटिक पेमेंट्स फॉन्ट।',
    getDataUrl: () => svgToPngDataUrl(createRealPaytmSvg()),
  },
  {
    id: 'real-gpay-3200',
    title: 'Real Google Pay ₹3,200',
    titleHi: 'असली Google Pay ₹3,200',
    badge: 'Real',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    app: 'Google Pay',
    amount: '₹3,200',
    description: 'Valid UPI Ref 427511993421, proper Google Sans alignment.',
    descriptionHi: 'प्रमाणित UPI Ref 427511993421, सटीक लेआउट और टाइमस्टैम्प।',
    getDataUrl: () => svgToPngDataUrl(createRealGPaySvg()),
  },
];
