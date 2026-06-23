import { useState, useEffect } from 'react';
import { fetchLogs } from '../services/auditService';
import { Activity, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';

function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs()
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getActionIcon = (action) => {
    switch(action) {
      case 'CREATED': return <CheckCircle2 size={16} className="text-semantic-success" />;
      case 'DELETED': return <ShieldAlert size={16} className="text-semantic-danger" />;
      case 'UPDATED': return <Activity size={16} className="text-semantic-warning" />;
      default: return <FileText size={16} className="text-accent" />;
    }
  };

  const fmt = (iso) => new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="max-w-[1000px] mx-auto px-4 pt-5 pb-12 sm:px-6 sm:pt-7 sm:pb-12 lg:px-8 lg:pt-9 lg:pb-16">
      <div className="mb-8">
        <h1 className="text-[clamp(1.5rem,4vw,2rem)] font-black tracking-[-0.03em] mb-2 bg-gradient-to-br from-white to-[#8a8a8a] bg-clip-text text-transparent flex items-center gap-3">
          <Activity size={28} className="text-accent" /> System Audit Trail
        </h1>
        <p className="text-text-muted text-[0.875rem] m-0">Review a comprehensive history of operations performed on system entities.</p>
      </div>

      <div className="bg-white/5 backdrop-blur-[20px] border border-white/10 rounded-2xl shadow-neu-lg overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent">
        {loading ? (
          <div className="p-10 text-center text-text-muted">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-text-muted">No audit logs recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-text-muted">
                  <th className="px-5 py-4 w-[180px]">Timestamp</th>
                  <th className="px-5 py-4 w-[120px]">Entity</th>
                  <th className="px-5 py-4 w-[140px]">Action</th>
                  <th className="px-5 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="text-[0.85rem]">
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 font-medium text-text-secondary whitespace-nowrap">{fmt(log.created_at)}</td>
                    <td className="px-5 py-4 font-bold text-text-primary">
                      <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[0.75rem]">{log.entity} #{log.entity_id}</span>
                    </td>
                    <td className="px-5 py-4 font-bold flex items-center gap-2 mt-1">
                      {getActionIcon(log.action)}
                      {log.action}
                    </td>
                    <td className="px-5 py-4 text-text-muted">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditLogsPage;
