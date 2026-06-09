// BulkImportModal.jsx — CSV drag-and-drop import with preview and results
import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, X, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { bulkImportStudents } from '../services/studentService';
import './BulkImportModal.css';

// Required CSV columns (must match exactly, case-insensitive)
const REQUIRED = ['first_name', 'last_name', 'email', 'date_of_birth', 'course'];

function BulkImportModal({ onClose, onSuccess }) {
  const [rows,     setRows]     = useState([]);      // parsed CSV rows
  const [fileName, setFileName] = useState('');
  const [parseErr, setParseErr] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);    // { inserted, errors[] }
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  // Parse CSV file with PapaParse
  const processFile = (file) => {
    setParseErr('');
    setRows([]);
    setResult(null);
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: ({ data, errors }) => {
        if (errors.length) { setParseErr('CSV parse error: ' + errors[0].message); return; }

        // Validate required columns
        const headers = Object.keys(data[0] || {});
        const missing = REQUIRED.filter(r => !headers.includes(r));
        if (missing.length) {
          setParseErr(`Missing required columns: ${missing.join(', ')}`);
          return;
        }
        setRows(data.slice(0, 200)); // cap at 200 rows in preview
      },
    });
  };

  const handleFile = (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      setParseErr('Please upload a valid .csv file.');
      return;
    }
    processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      const res = await bulkImportStudents(rows);
      setResult(res);
      if (res.inserted > 0) onSuccess();   // refresh parent list
    } catch {
      setParseErr('Import failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="import-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="import-header">
          <div className="import-title-row">
            <FileSpreadsheet size={20} strokeWidth={1.8} />
            <h2>Bulk CSV Import</h2>
          </div>
          <button className="import-close" onClick={onClose}><X size={18} strokeWidth={2} /></button>
        </div>

        {!result ? (
          <>
            {/* Drop zone */}
            <div
              className={`drop-zone ${dragging ? 'dragging' : ''} ${rows.length ? 'has-file' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current.click()}
            >
              <input
                ref={fileRef} type="file" accept=".csv" hidden
                onChange={e => handleFile(e.target.files[0])}
              />
              {rows.length > 0 ? (
                <>
                  <CheckCircle2 size={32} strokeWidth={1.5} className="dz-icon-ok" />
                  <p className="dz-filename">{fileName}</p>
                  <p className="dz-count">{rows.length} rows ready to import</p>
                </>
              ) : (
                <>
                  <Upload size={32} strokeWidth={1.5} className="dz-icon" />
                  <p className="dz-text">Drag & drop a CSV file here</p>
                  <p className="dz-sub">or click to browse</p>
                </>
              )}
            </div>

            {/* Required columns hint */}
            <div className="import-hint">
              <p>Required columns: <code>first_name, last_name, email, date_of_birth, course</code></p>
              <p>Optional: <code>enrollment_date, gpa</code></p>
            </div>

            {/* Parse error */}
            {parseErr && (
              <div className="import-error">
                <AlertCircle size={14} strokeWidth={2} />
                {parseErr}
              </div>
            )}

            {/* Preview table */}
            {rows.length > 0 && (
              <div className="preview-wrap">
                <p className="preview-label">Preview (first 5 rows):</p>
                <div className="preview-scroll">
                  <table className="preview-table">
                    <thead>
                      <tr>{Object.keys(rows[0]).map(k => <th key={k}>{k}</th>)}</tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((r, i) => (
                        <tr key={i}>{Object.values(r).map((v, j) => <td key={j}>{v}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import button */}
            <div className="import-footer">
              <button className="btn-cancel-import" onClick={onClose}>Cancel</button>
              <button
                className="btn-import"
                disabled={!rows.length || loading}
                onClick={handleImport}
              >
                {loading
                  ? <><Loader2 size={14} className="spin-icon" /> Importing…</>
                  : <><Upload size={14} /> Import {rows.length} Students</>
                }
              </button>
            </div>
          </>
        ) : (
          /* Result summary */
          <div className="import-result">
            <CheckCircle2 size={40} strokeWidth={1.5} className="result-ok-icon" />
            <p className="result-title">Import Complete</p>
            <p className="result-inserted">
              <strong>{result.inserted}</strong> student{result.inserted !== 1 ? 's' : ''} imported successfully
            </p>
            {result.errors.length > 0 && (
              <div className="result-errors">
                <p className="result-err-title">
                  <AlertCircle size={13} strokeWidth={2} /> {result.errors.length} row(s) failed:
                </p>
                {result.errors.map((e, i) => (
                  <div key={i} className="result-err-row">
                    Row {e.row} ({e.email}): {e.reason}
                  </div>
                ))}
              </div>
            )}
            <button className="btn-import" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default BulkImportModal;
