import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Check, RotateCcw } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  requireTextConfirmation?: string; // If set, user must type this exact text to confirm
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  variant = 'danger',
  requireTextConfirmation,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [typedConfirmation, setTypedConfirmation] = useState('');

  if (!isOpen) return null;

  const isConfirmationMatched = requireTextConfirmation
    ? typedConfirmation.trim().toUpperCase() === requireTextConfirmation.toUpperCase()
    : true;

  const handleConfirmClick = () => {
    if (isConfirmationMatched && !isLoading) {
      onConfirm();
      setTypedConfirmation('');
    }
  };

  const handleCancelClick = () => {
    setTypedConfirmation('');
    onCancel();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-100 text-rose-700',
          btnConfirm: 'bg-rose-700 hover:bg-rose-800 text-white',
          icon: <Trash2 className="w-6 h-6" />,
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-100 text-amber-700',
          btnConfirm: 'bg-amber-600 hover:bg-amber-700 text-white',
          icon: <RotateCcw className="w-6 h-6" />,
        };
      default:
        return {
          iconBg: 'bg-blue-100 text-blue-800',
          btnConfirm: 'bg-blue-900 hover:bg-blue-950 text-white',
          icon: <AlertTriangle className="w-6 h-6" />,
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      id="inapp-confirm-dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={handleCancelClick}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${styles.iconBg}`}>
            {styles.icon}
          </div>
          <div className="pr-6">
            <h3 className="text-lg font-black text-slate-900 leading-tight">{title}</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{message}</p>
          </div>
        </div>

        {requireTextConfirmation && (
          <div className="my-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
              Ketik <span className="text-rose-700 font-mono font-black">{requireTextConfirmation}</span> untuk mengonfirmasi:
            </label>
            <input
              type="text"
              value={typedConfirmation}
              onChange={(e) => setTypedConfirmation(e.target.value)}
              placeholder={`Ketik "${requireTextConfirmation}" di sini`}
              className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-lg focus:border-rose-600 focus:ring-2 focus:ring-rose-100 outline-hidden uppercase"
              autoFocus
            />
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleCancelClick}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={!isConfirmationMatched || isLoading}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${styles.btnConfirm}`}
          >
            {isLoading ? (
              <span>Memproses...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
