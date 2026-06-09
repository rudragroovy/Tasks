// BulkImportModal.jsx — CSV drag-and-drop import with preview and results
import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Upload, X, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { bulkImportStudents } from '../services/studentService';

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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 md:p-8 max-w-[600px] w-[95%] shadow-neu-lg flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5 text-text-primary">
            <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center shadow-neu-in">
              <FileSpreadsheet size={16} strokeWidth={2} />
            </div>
            <h2 className="text-[1.15rem] font-bold tracking-wide">Bulk CSV Import</h2>
          </div>
          <button className="text-text-secondary hover:text-white hover:bg-white/10 p-1.5 rounded-md transition-colors" onClick={onClose}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {!result ? (
          <>
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[160px] ${dragging ? 'border-white/40 bg-white/5 shadow-neu-in' : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5'} ${rows.length ? '!border-semantic-success/30 !bg-semantic-success/5 shadow-neu-in' : ''}`}
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
                  <CheckCircle2 size={32} strokeWidth={1.5} className="text-semantic-success mb-3 drop-shadow-[0_0_8px_rgba(212,212,212,0.4)]" />
                  <p className="text-[0.95rem] font-bold text-text-primary mb-1">{fileName}</p>
                  <p className="text-[0.8rem] text-semantic-success font-semibold tracking-wide">{rows.length} rows ready to import</p>
                </>
              ) : (
                <>
                  <Upload size={32} strokeWidth={1.5} className="text-text-muted mb-3" />
                  <p className="text-[0.95rem] font-bold text-text-secondary mb-1">Drag & drop a CSV file here</p>
                  <p className="text-[0.8rem] text-text-muted">or click to browse</p>
                </>
              )}
            </div>

            {/* Required columns hint */}
            <div className="mt-4 p-4 rounded-lg bg-black/40 border border-white/5 text-[0.8rem] text-text-secondary shadow-neu-in">
              <p className="mb-1">Required columns: <code className="bg-white/10 text-[#d4d4d4] px-1.5 py-0.5 rounded text-[0.75rem] font-mono tracking-tight">first_name, last_name, email, date_of_birth, course</code></p>
              <p>Optional: <code className="bg-white/10 text-[#d4d4d4] px-1.5 py-0.5 rounded text-[0.75rem] font-mono tracking-tight">enrollment_date, gpa</code></p>
            </div>

            {/* Parse error */}
            {parseErr && (
              <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-[#3a1c1c] border border-semantic-danger/30 text-semantic-danger text-[0.85rem] font-medium shadow-neu-in">
                <AlertCircle size={14} strokeWidth={2} />
                {parseErr}
              </div>
            )}

            {/* Preview table */}
            {rows.length > 0 && (
              <div className="mt-6 flex flex-col min-h-[150px]">
                <p className="text-[0.8rem] font-bold text-text-muted uppercase tracking-wider mb-2">Preview (first 5 rows):</p>
                <div className="flex-1 overflow-auto rounded-lg border border-white/5 shadow-neu-in">
                  <table className="w-full border-collapse min-w-[500px]">
                    <thead>
                      <tr>{Object.keys(rows[0]).map(k => <th key={k} className="bg-black/60 text-left p-2.5 text-[0.7rem] font-bold text-text-secondary uppercase tracking-wider sticky top-0 border-b border-white/10 whitespace-nowrap">{k}</th>)}</tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5">{Object.values(r).map((v, j) => <td key={j} className="p-2.5 text-[0.8rem] text-[#c0c0c0] whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">{v}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import button */}
            <div className="mt-6 pt-5 border-t border-white/5 flex justify-end gap-3">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button
                className="btn-primary flex items-center gap-2"
                disabled={!rows.length || loading}
                onClick={handleImport}
              >
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> Importing…</>
                  : <><Upload size={14} /> Import {rows.length} Students</>
                }
              </button>
            </div>
          </>
        ) : (
          /* Result summary */
          <div className="flex flex-col items-center py-6">
            <div className="w-[80px] h-[80px] rounded-full flex items-center justify-center bg-semantic-success/10 text-semantic-success shadow-neu-in mb-5">
              <CheckCircle2 size={40} strokeWidth={1.5} />
            </div>
            <p className="text-[1.4rem] font-bold text-text-primary mb-2">Import Complete</p>
            <p className="text-[0.95rem] text-[#c0c0c0] mb-6 text-center">
              <strong className="text-white text-[1.1rem]">{result.inserted}</strong> student{result.inserted !== 1 ? 's' : ''} imported successfully
            </p>
            {result.errors.length > 0 && (
              <div className="w-full bg-[#1a0f0f] border border-semantic-danger/20 rounded-lg p-4 mb-6 shadow-neu-in text-left max-h-[150px] overflow-auto">
                <p className="flex items-center gap-2 text-[0.85rem] font-bold text-semantic-danger mb-3 border-b border-semantic-danger/20 pb-2">
                  <AlertCircle size={14} strokeWidth={2} /> {result.errors.length} row(s) failed:
                </p>
                {result.errors.map((e, i) => (
                  <div key={i} className="text-[0.8rem] text-semantic-danger-bright mb-1.5 last:mb-0 leading-relaxed">
                    <span className="font-bold opacity-70">Row {e.row} ({e.email}):</span> {e.reason}
                  </div>
                ))}
              </div>
            )}
            <button className="btn-primary w-full max-w-[200px]" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default BulkImportModal;
