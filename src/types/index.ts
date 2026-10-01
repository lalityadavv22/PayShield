export type RiskLevel = 'GENUINE' | 'SUSPICIOUS' | 'FAKE';

export type DetectedApp = 'Google Pay' | 'PhonePe' | 'Paytm' | 'BHIM UPI' | 'CRED' | 'Amazon Pay' | 'Spoof App / Unknown';

export interface BoundingBox {
  label: string;
  field: 'amount' | 'txnId' | 'dateTime' | 'upiId' | 'status' | 'recipient';
  text: string;
  isTampered: boolean;
  tamperReason?: string;
  box?: [number, number, number, number];
}

export interface ExtractedData {
  app: DetectedApp;
  amount: string;
  amountNumeric: number | null;
  txnId: string;
  upiId: string;
  recipientName: string;
  senderName: string;
  dateTime: string;
  statusText: string;
  isFutureDate: boolean;
  isTxnIdStandardLength: boolean;
}

export interface PipelineStepResult {
  id: number;
  name: string;
  description: string;
  status: 'passed' | 'warning' | 'failed' | 'checking';
  score: number;
  details: string;
  flags: string[];
}

export interface AnalysisReport {
  id: string;
  timestamp: number;
  fileName: string;
  fileSize: number;
  imageHash: string;
  overallScore: number;
  verdict: RiskLevel;
  verdictTitle: string;
  summary: string;
  extracted: ExtractedData;
  pipelineSteps: PipelineStepResult[];
  tamperedZones: BoundingBox[];
  redFlags: string[];
  greenFlags: string[];
  metadataInfo: {
    softwareDetected?: string;
    hasExifMismatch: boolean;
    mimeType: string;
    resolution: string;
    isDuplicateScreenshot: boolean;
    previousSeenDate?: string;
    /**
     * `gemini` when the server-side AI vision model produced this report,
     * `heuristics` when it fell back to the local rule engine (no API key or model error).
     */
    visionEngine?: 'gemini' | 'heuristics';
  };
  recommendation: string;
}

export interface BankStatementRecord {
  id: string;
  utrNumber: string;
  amount: number;
  senderName: string;
  senderUpi: string;
  timestamp: string;
  status: 'CREDITED' | 'PENDING' | 'FAILED';
  bankName: string;
}
