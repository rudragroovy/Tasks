import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

const VARIANT_STYLES = {
  danger: {
    icon: 'text-red-500',
    confirm: 'bg-red-600 hover:bg-red-700 text-white',
  },
  primary: {
    icon: 'text-primary-600',
    confirm: 'bg-primary-600 hover:bg-primary-700 text-white',
  },
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmVariant = 'danger',
  isLoading = false,
  hideCancel = false,
}) {
  const variant = VARIANT_STYLES[confirmVariant] || VARIANT_STYLES.danger;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLoading && typeof onCancel === 'function') {
              onCancel();
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6"
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center ${variant.icon}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-slate-900 font-heading font-black text-lg">{title}</h3>
                <p className="text-slate-600 text-sm font-medium mt-1 leading-relaxed">{message}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              {!hideCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed ${variant.confirm}`}
              >
                {isLoading ? 'Please wait...' : confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
