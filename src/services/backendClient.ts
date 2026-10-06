import { BackendConfig } from '../types/parking';

/**
 * Lightweight client for forwarding parking system state to a backend API node.
 */
export class BackendClient {
  private baseUrl: string;

  constructor(config: BackendConfig) {
    this.baseUrl = (config.apiBaseUrl || '/api').replace(/\/+$/, '');
  }

  // Check whether the backend is reachable
  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }

  // Push the full system state to the backend
  async syncFullStateToBackend(state: unknown): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    if (!res.ok) {
      throw new Error(`Backend sync failed with status ${res.status}`);
    }
    return true;
  }
}
