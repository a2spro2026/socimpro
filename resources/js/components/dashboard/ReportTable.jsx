import { FileSpreadsheet } from 'lucide-react';
import ScrollAreaWithArrows from '../ScrollAreaWithArrows';

function formatMontant(value) {
    const n = Math.round(Number(value) || 0);
    return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}.Fcfa`;
}

export default function ReportTable({
    title,
    icon: Icon,
    columns,
    rows,
    loading,
    accent = 'from-brand-navy to-blue-700',
    headerStyle = 'default',
    showCount = true,
}) {
    const grayHeader = headerStyle === 'gray';

    return (
        <div className="report-table rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
            <div className={`flex items-center justify-between gap-3 px-5 py-3.5 bg-gradient-to-r ${accent}`}>
                <div className="flex items-center gap-2.5 min-w-0">
                    {Icon && <Icon className="w-5 h-5 text-white shrink-0" strokeWidth={2} />}
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide truncate">{title}</h3>
                </div>
                {showCount && (
                    <span className="text-[10px] font-semibold text-white/80 bg-white/15 px-2 py-1 rounded-full shrink-0">
                        {loading ? '…' : `${rows?.length ?? 0} ligne(s)`}
                    </span>
                )}
            </div>

            <ScrollAreaWithArrows maxHeight="min(55vh, 520px)" deps={[rows?.length, loading]}>
                <table className="w-full text-sm min-w-[640px]">
                    <thead>
                        <tr className={grayHeader
                            ? 'bg-gradient-to-r from-slate-100 via-slate-200/90 to-slate-100 dark:from-slate-800 dark:via-slate-700/80 dark:to-slate-800 border-b-2 border-slate-300 dark:border-slate-600'
                            : 'bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700'
                        }>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`px-4 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] whitespace-nowrap ${
                                        grayHeader
                                            ? 'text-slate-600 dark:text-slate-300'
                                            : 'text-xs text-slate-500 dark:text-slate-400'
                                    } ${col.align === 'right' ? 'text-right' : 'text-center'}`}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            [...Array(4)].map((_, i) => (
                                <tr key={i}>
                                    {columns.map((col) => (
                                        <td key={col.key} className="px-4 py-3">
                                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : rows?.length ? (
                            rows.map((row, i) => (
                                <tr
                                    key={i}
                                    className="hover:bg-orange-50/50 dark:hover:bg-slate-800/50 transition-colors group"
                                >
                                    {columns.map((col) => (
                                        <td
                                            key={col.key}
                                            className={`px-4 py-2.5 text-slate-700 dark:text-slate-300 ${
                                                col.align === 'right' ? 'text-right font-semibold tabular-nums' : 'text-center'
                                            }`}
                                        >
                                            {col.render ? col.render(row[col.key], row) : (
                                                col.key === 'montant' ? (
                                                    <span className="text-brand-navy dark:text-orange-400 font-semibold">
                                                        {formatMontant(row[col.key])}
                                                    </span>
                                                ) : col.key === 'destination' ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                        {row[col.key]}
                                                    </span>
                                                ) : (
                                                    row[col.key] ?? '—'
                                                )
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400">
                                    <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                    Aucune donnée disponible
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </ScrollAreaWithArrows>
        </div>
    );
}
