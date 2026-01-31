
import { SMPCShares, FraudStatus, Transaction } from "../types";

/**
 * Simulates Secure Multi-Party Computation using Additive Secret Sharing.
 * Splitting a value into 3 parts such that A + B + C = value.
 */
export function generateShares(value: number): SMPCShares {
  const shareA = Math.random() * value;
  const shareB = Math.random() * (value - shareA);
  const shareC = value - shareA - shareB;
  return { partyA: shareA, partyB: shareB, partyC: shareC };
}

/**
 * Simulates a Homomorphic Encryption serialization.
 */
export function encryptValue(value: number): string {
  return btoa(`HE-CIPHER-${value}-${Math.random().toString(36).substr(2, 5)}`);
}

/**
 * Core Fraud Logic: Generates its own device risk and performs SMPC simulation.
 */
export function processTransaction(
  email: string, 
  amount: number
): Transaction & { shares: SMPCShares } {
  const id = `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const userId = `USR-${btoa(email).substr(0, 8).toUpperCase()}`;
  
  // Internal automated device risk generation (Simulating real-world entropy)
  const deviceScore = parseFloat((Math.random() * 0.9 + 0.05).toFixed(2));
  
  // Heuristic weights
  const amountWeight = amount > 7000 ? 0.7 : 0.3;
  const deviceWeight = 0.5;
  
  const normalizedAmount = Math.min(amount / 10000, 1);
  const rawFraudScore = (normalizedAmount * amountWeight) + (deviceScore * deviceWeight);
  const fraudScore = Math.min(parseFloat(rawFraudScore.toFixed(3)), 1.0);
  
  let status = FraudStatus.NORMAL;
  if (amount > 9500 || (fraudScore > 0.8 && amount > 1000)) {
    status = FraudStatus.FRAUD;
  }

  // Generate SMPC shares of the fraud score to simulate the distributed computation
  const shares = generateShares(fraudScore);

  return {
    id,
    userId,
    email,
    amount,
    deviceScore,
    status,
    fraudScore,
    shares,
    timestamp: new Date().toISOString()
  };
}
