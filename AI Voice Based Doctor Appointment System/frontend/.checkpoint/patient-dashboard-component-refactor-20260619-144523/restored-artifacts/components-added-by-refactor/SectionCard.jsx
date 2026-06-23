export default function SectionCard({
  title,
  subtitle,
  actionLabel,
  onAction,
  children,
  className = '',
}) {
  return (
    <section className={`app-panel rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 ${className}`}>
      {(title || subtitle || (actionLabel && onAction)) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base sm:text-lg font-heading font-black text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-slate-500 font-medium">{subtitle}</p>}
          </div>
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="shrink-0 rounded-xl border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 transition-colors hover:bg-primary-100 cursor-pointer"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

