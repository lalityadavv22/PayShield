export type RiskLevel = 'GENUINE' | 'SUSPICIOUS' | 'FAKE';

export type DetectedApp = 'Google Pay' | 'PhonePe' | 'Paytm' | 'BHIM UPI' | 'CRED' | 'Amazon Pay' | 'Spoof App / Unknown';

export interface BoundingBox {
  label: string;
  field: 'amount' | 'txnId' | 'dateTime' | 'upiId' | 'status' | 'recipient';
  text: string;
  isTampered: boolean;
  tamperReason?: string;
  box?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] in 0-1000 normalized coords
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
  nameHi: string;
  description: string;
  descriptionHi: string;
  status: 'passed' | 'warning' | 'failed' | 'checking';
  score: number; // 0 - 100
  details: string;
  detailsHi: string;
  flags: string[];
}

export interface AnalysisReport {
  id: string;
  timestamp: number;
  fileName: string;
  fileSize: number;
  imageHash: string;
  overallScore: number; // 0 - 100 Trust Score
  verdict: RiskLevel;
  verdictTitle: string;
  verdictTitleHi: string;
  summary: string;
  summaryHi: string;
  extracted: ExtractedData;
  pipelineSteps: PipelineStepResult[];
  tamperedZones: BoundingBox[];
  redFlags: string[];
  redFlagsHi: string[];
  greenFlags: string[];
  greenFlagsHi: string[];
  metadataInfo: {
    softwareDetected?: string;
    hasExifMismatch: boolean;
    mimeType: string;
    resolution: string;
    isDuplicateScreenshot: boolean;
    previousSeenDate?: string;
  };
  recommendation: string;
  recommendationHi: string;
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
