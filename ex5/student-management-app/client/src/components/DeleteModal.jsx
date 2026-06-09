// DeleteModal.jsx — Confirmation dialog before deleting a student (Lucide icons)
import { AlertTriangle, X, Trash2 } from 'lucide-react';
import './DeleteModal.css';

function DeleteModal({ studentName, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>

        {/* AlertTriangle — clearly signals a destructive / warning action */}
        <div className="modal-icon-wrap">
          <AlertTriangle className="modal-icon" size={36} strokeWidth={1.6} />
        </div>

        <h3 className="modal-title">Confirm Delete</h3>
        <p className="modal-body">
          Are you sure you want to permanently delete{' '}
          <strong>{studentName}</strong>?
        </p>
        <p className="modal-warning">This action cannot be undone.</p>

        <div className="modal-actions">
          {/* X — dismiss / cancel */}
          <button id="modal-cancel-btn" className="btn-cancel" onClick={onCancel}>
            <X size={14} strokeWidth={2.5} />
            Cancel
          </button>

          {/* Trash2 — confirms the delete intent */}
          <button id="modal-confirm-btn" className="btn-confirm" onClick={onConfirm}>
            <Trash2 size={14} strokeWidth={2.2} />
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteModal;
