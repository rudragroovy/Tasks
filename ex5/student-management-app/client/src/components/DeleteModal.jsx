// DeleteModal.jsx — Confirmation dialog before deleting a student (Lucide icons)
import { AlertTriangle, X, Trash2 } from 'lucide-react';

function DeleteModal({ studentName, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="bg-[#111] border border-white/10 rounded-2xl p-8 max-w-[420px] w-[90%] text-center shadow-neu-lg" onClick={(e) => e.stopPropagation()}>

        {/* AlertTriangle — clearly signals a destructive / warning action */}
        <div className="w-[64px] h-[64px] rounded-full mx-auto mb-4 flex items-center justify-center bg-semantic-danger/10 text-semantic-danger shadow-neu-in">
          <AlertTriangle size={36} strokeWidth={1.6} />
        </div>

        <h3 className="text-[1.3rem] font-bold text-text-primary mb-2">Confirm Delete</h3>
        <p className="text-[0.95rem] text-text-secondary mb-3 leading-relaxed">
          Are you sure you want to permanently delete{' '}
          <strong className="text-white">{studentName}</strong>?
        </p>
        <p className="text-[0.85rem] text-semantic-danger font-semibold mb-8">This action cannot be undone.</p>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* X — dismiss / cancel */}
          <button id="modal-cancel-btn" className="flex-1 btn-secondary flex items-center justify-center gap-2" onClick={onCancel}>
            <X size={14} strokeWidth={2.5} />
            Cancel
          </button>

          {/* Trash2 — confirms the delete intent */}
          <button id="modal-confirm-btn" className="flex-1 btn-danger flex items-center justify-center gap-2" onClick={onConfirm}>
            <Trash2 size={14} strokeWidth={2.2} />
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteModal;
