import React, { useState, useEffect } from 'react';
import { X, Server, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { BackendConfig } from '../types/parking';
import { BackendClient } from '../services/backendClient';

interface BackendConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BackendConfig;
  onSaveConfig: (config: BackendConfig) => void;
  currentState: unknown;
}

export const BackendConfigModal: React.FC<BackendConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  currentState,
}) => {
  const [draft, setDraft] = useState<BackendConfig>(config);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraft(config);
      setStatus(null);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsBusy(true);
    const ok = await new BackendClient(draft).ping();
    setStatus({ ok, message: ok ? 'Backend node is reachable.' : 'Backend node is not reachable.' });
    setIsBusy(false);
  };

  const handleSyncNow = async () => {
    setIsBusy(true);
    try {
      await new BackendClient(draft).syncFullStateToBackend(currentState);
      setStatus({ ok: true, message: 'Full state synced to backend.' });
    } catch (err: any) {
      setStatus({ ok: false, message: err?.message || 'Sync failed.' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSave}
        className="w-full max-w-md bg-[#0f1520] border border-cyan-500/30 rounded-xl shadow-2xl p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-cyan-400">
            <Server className="w-5 h-5" />
            <h2 className="font-mono font-bold text-sm uppercase tracking-wider">Backend API Gateway</h2>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-mono text-gray-400 uppercase">Mode</label>
          <div className="grid grid-cols-2 gap-2">
            {(['connected', 'standalone'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDraft({ ...draft, mode })}
                className={`py-2 rounded-lg text-xs font-mono uppercase border cursor-pointer ${
                  draft.mode === mode
                    ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300'
                    : 'border-white/10 text-gray-400 hover:border-white/30'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-mono text-gray-400 uppercase">API Base URL</label>
          <input
            type="text"
            value={draft.apiBaseUrl}
            onChange={(e) => setDraft({ ...draft, apiBaseUrl: e.target.value })}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-gray-100 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <label className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.autoSync}
            onChange={(e) => setDraft({ ...draft, autoSync: e.target.checked })}
          />
          <span>Auto-sync state changes to backend</span>
        </label>

        {status && (
          <div
            className={`flex items-center space-x-2 text-xs font-mono p-2 rounded-lg ${
              status.ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'
            }`}
          >
            {status.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{status.message}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={handleTest}
              className="px-3 py-2 text-xs font-mono rounded-lg border border-white/10 text-gray-300 hover:border-cyan-400 cursor-pointer disabled:opacity-50"
            >
              Test
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={handleSyncNow}
              className="px-3 py-2 text-xs font-mono rounded-lg border border-white/10 text-gray-300 hover:border-cyan-400 cursor-pointer disabled:opacity-50 flex items-center space-x-1"
            >
              <RefreshCw className={`w-3 h-3 ${isBusy ? 'animate-spin' : ''}`} />
              <span>Sync Now</span>
            </button>
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-mono font-bold rounded-lg bg-cyan-500 text-black hover:bg-cyan-400 cursor-pointer"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
};
