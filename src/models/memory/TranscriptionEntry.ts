// Transcription entry module for the Google Agent Development Kit (ADK) in TypeScript
// Mirrors the transcription entry functionality from the Python SDK

/**
 * A transcription entry.
 */
export class TranscriptionEntry {
  /**
   * The role of the transcription (e.g., 'user', 'model').
   */
  role: string;

  /**
   * The data for the transcription.
   */
  data: unknown;

  /**
   * Creates a new TranscriptionEntry.
   */
  constructor(data: { role: string; data: unknown }) {
    this.role = data.role;
    this.data = data.data;
  }
}
