import { Eye, Pencil, Printer, Trash2, FileText } from 'lucide-react';
import { formatMontant } from './bonExecutionUtils';
import ScrollAreaWithArrows from '../../components/ScrollAreaWithArrows';

const REGLEMENT_LABELS = {
    Esp: 'Espèces',
    Chq: 'Chèque',
    Eff: 'Effet',
    Vir: 'Virement',
    Vers: 'Versement',
};

function reglementLabel(value) {
    return REGLEMENT_LABELS[value] || value || '—';
}

function ActionBtn({ title, onClick, icon: Icon, color = 'slate' }) {
    const colors = {
        blue: 'hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400',
        amber: 'hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/30 dark:hover:text-amber-400',
        red: 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400',
        slate: 'hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200',
        orange: 'hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/30 dark:hover:text-orange-400',
    };
    return (
        <button type="button" title={title} onClick={onClick} className={`p-1 rounded-md text-slate-400 transition-colors ${colors[color]}`}>
            <Icon className="w-3 h-3" strokeWidth={2} />
        </button>
    );
}

export function PaymentBreakdown({ payments, compact = false, actions }) {
    if (!payments?.length) return null;

    if (compact) {
        return (
            <div className="flex flex-wrap justify-center gap-1.5">
                {payments.map((p) => (
                    <span
                        key={p.id}
                        title={`${p.payment_date} · ${p.reference} · ${reglementLabel(p.reglement)}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-700/40"
                    >
                        <span className="text-emerald-500 dark:text-emerald-400">●</span>
                        {formatMontant(p.amount)}
                    </span>
                ))}
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50/80 via-white to-slate-50 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-100/50 dark:bg-emerald-900/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        Historique des paiements
                    </p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-700/40">
                    {payments.length} règlement{payments.length > 1 ? 's' : ''}
                </span>
            </div>

            <ScrollAreaWithArrows variant="table" deps={[payments.length]}>
                <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10">                        <tr className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-emerald-100 dark:border-emerald-900/30">
                            {['Date', 'Réf°', 'Règlement', 'N°', 'Banque', 'Nom Tiré', 'Montant', ...(actions ? ['Actions'] : [])].map((h) => (
                                <th key={h} className="px-3 py-2 font-bold text-center whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100/80 dark:divide-emerald-900/20">
                        {payments.map((p, index) => (
                            <tr key={p.id} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors">
                                <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300 whitespace-nowrap">{p.payment_date || '—'}</td>
                                <td className="px-3 py-2 text-center font-mono font-semibold text-brand-navy dark:text-violet-400 whitespace-nowrap">{p.reference || '—'}</td>
                                <td className="px-3 py-2 text-center">
                                    <span className="inline-flex px-2 py-0.5 rounded-md font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                                        {reglementLabel(p.reglement)}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">{p.numero || '—'}</td>
                                <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300 max-w-[120px] truncate">{p.banque || '—'}</td>
                                <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300 max-w-[140px] truncate">{p.nom_tire || '—'}</td>
                                <td className="px-3 py-2 text-center">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold tabular-nums bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50">
                                        <span className="text-[9px] font-bold uppercase text-emerald-500 dark:text-emerald-400">#{index + 1}</span>
                                        {formatMontant(p.amount)}
                                    </span>
                                </td>
                                {actions && (
                                    <td className="px-2 py-2">
                                        <div className="flex items-center justify-center gap-0.5">
                                            <ActionBtn title="Voir" icon={Eye} color="blue" onClick={() => actions.onView(p)} />
                                            <ActionBtn title="Modifier" icon={Pencil} color="amber" onClick={() => actions.onEdit(p)} />
                                            <ActionBtn title="Imprimer" icon={Printer} color="slate" onClick={() => actions.onPrint(p)} />
                                            <ActionBtn title="Supprimer" icon={Trash2} color="red" onClick={() => actions.onDelete(p)} />
                                            <ActionBtn title="PDF" icon={FileText} color="orange" onClick={() => actions.onPdf(p)} />
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-emerald-50/60 dark:bg-emerald-900/15 border-t border-emerald-200/70 dark:border-emerald-800/40">
                            <td colSpan={actions ? 7 : 6} className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                                Total payé
                            </td>
                            <td className="px-3 py-2 text-center font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                                {formatMontant(payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0))}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </ScrollAreaWithArrows>
        </div>
    );
}
