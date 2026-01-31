
export enum FraudStatus {
  NORMAL = 'NORMAL',
  FRAUD = 'FRAUD',
  PENDING = 'PENDING'
}

export interface Transaction {
  id: string;
  userId: string;
  email: string;
  amount: number;
  deviceScore: number;
  status: FraudStatus;
  fraudScore: number;
  timestamp: string;
}

export interface SecurityStats {
  totalTransactions: number;
  fraudDetected: number;
  normalProcessed: number;
  averageRisk: number;
}

export interface SMPCShares {
  partyA: number;
  partyB: number;
  partyC: number;
}

export interface AnalysisResponse {
  summary: string;
  threatLevel: 'Low' | 'Medium' | 'High';
  recommendation: string;
}
