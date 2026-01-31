
import { GoogleGenAI } from "@google/genai";
import { Transaction, AnalysisResponse } from "../types";

const API_KEY = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function analyzeFraudCase(txn: Transaction): Promise<AnalysisResponse> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Perform a security analysis on the following transaction. 
      Context: This transaction was flagged by an SMPC (Secure Multi-Party Computation) engine.
      Transaction Details:
      - Amount: $${txn.amount}
      - Device Risk Score: ${txn.deviceScore} (0 is clean, 1 is high risk)
      - Detected Risk Level: ${txn.fraudScore}
      - Status: ${txn.status}
      
      Provide a JSON response with:
      - summary: A brief summary of why this might be fraud or legitimate.
      - threatLevel: 'Low', 'Medium', or 'High'.
      - recommendation: Actionable step for the fraud analyst.`,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text) as AnalysisResponse;
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return {
      summary: "Automated AI analysis unavailable. Relying on baseline SMPC scores.",
      threatLevel: txn.fraudScore > 0.7 ? "High" : "Low",
      recommendation: "Manual verification required."
    };
  }
}
