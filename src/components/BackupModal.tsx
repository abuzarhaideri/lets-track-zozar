import { motion } from 'framer-motion';
import { useState } from 'react';
import { useAppData } from '../context/AppDataContext';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BackupModal({ isOpen, onClose }: BackupModalProps) {
  const { exportData, importData, resetData } = useAppData();
  const [importJson, setImportJson] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    const json = exportData();
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zozar-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage({ text: 'Backup downloaded successfully!', type: 'success' });
  };

  const handleImportSubmit = () => {
    if (!importJson.trim()) return;
    const success = importData(importJson);
    if (success) {
      setStatusMessage({ text: 'Progress restored successfully!', type: 'success' });
      setImportJson('');
      setTimeout(() => {
        setStatusMessage(null);
        onClose();
      }, 1500);
    } else {
      setStatusMessage({
        text: 'Invalid JSON backup format. Please check the text and try again.',
        type: 'error',
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportJson(content);
        const success = importData(content);
        if (success) {
          setStatusMessage({ text: 'File imported and restored!', type: 'success' });
          setTimeout(() => {
            setStatusMessage(null);
            onClose();
          }, 1500);
        } else {
          setStatusMessage({
            text: 'Uploaded file is not a valid ZOZAR backup.',
            type: 'error',
          });
        }
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    resetData();
    setStatusMessage({ text: 'Data reset to defaults.', type: 'success' });
    setConfirmReset(false);
    setTimeout(() => {
      setStatusMessage(null);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-3xl bg-cream paper-texture p-6 sm:p-8 soft-shadow border border-cream-dark"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-xl sm:text-2xl font-semibold text-charcoal">
            Backup & Sync Data
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-charcoal-muted hover:bg-cream-dark/60 hover:text-charcoal"
          >
            ✕
          </button>
        </div>

        <p className="text-xs sm:text-sm text-charcoal-muted mb-6">
          Save your checked tasks and progress to a file, or restore a previous backup whenever you switch browsers or devices.
        </p>

        {statusMessage && (
          <div
            className={`mb-4 rounded-xl px-4 py-2.5 text-xs font-medium ${
              statusMessage.type === 'success'
                ? 'bg-sage/20 text-emerald-900 border border-sage/40'
                : 'bg-missed-soft text-missed border border-missed/30'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Action 1: Export */}
        <div className="mb-6 space-y-2 border-b border-cream-dark/60 pb-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-muted">
            1. Export & Backup
          </h4>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 rounded-xl bg-sage px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 shadow-sm"
            >
              📥 Download Backup (.json)
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-xl border border-cream-dark bg-white/80 px-4 py-2.5 text-xs font-semibold text-charcoal transition-colors hover:border-sage/50"
            >
              {copied ? '✓ Copied!' : '📋 Copy JSON'}
            </button>
          </div>
        </div>

        {/* Action 2: Import */}
        <div className="mb-6 space-y-3 border-b border-cream-dark/60 pb-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-muted">
            2. Restore Backup
          </h4>
          <div>
            <label
              htmlFor="file-upload"
              className="inline-block cursor-pointer rounded-xl border border-dashed border-sage/60 bg-white/60 px-4 py-2 text-xs font-medium text-charcoal hover:bg-white"
            >
              📂 Select Backup File...
            </label>
            <input
              id="file-upload"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <div>
            <textarea
              rows={3}
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder="Or paste backup JSON code here..."
              className="w-full rounded-xl border border-cream-dark bg-white/60 p-3 text-xs outline-none focus:border-sage/50"
            />
            {importJson.trim() && (
              <button
                type="button"
                onClick={handleImportSubmit}
                className="mt-2 w-full rounded-xl bg-charcoal px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
              >
                Restore From Pasted JSON
              </button>
            )}
          </div>
        </div>

        {/* Action 3: Reset */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={handleReset}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
              confirmReset
                ? 'bg-missed text-white font-bold'
                : 'text-charcoal-muted/60 hover:text-missed'
            }`}
          >
            {confirmReset ? 'Click to Confirm Reset' : 'Reset to Default Tasks'}
          </button>
          {confirmReset && (
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="text-xs text-charcoal-muted hover:underline"
            >
              Cancel
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
