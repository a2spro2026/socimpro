import { useCallback, useEffect, useState } from 'react';
import { Printer, FileText, RefreshCw, Search } from 'lucide-react';
import api from '../../lib/api';
import {
    emptyFilters,
    formatDelayDisplay,
    formatMontant,
    openPrintable,
} from './bonExecutionUtils';
import { SoldeCell } from './clientAmountUtils';
import ScrollAreaWithArrows from '../../components/ScrollAreaWithArrows';

function Field({ label, children }) {
    return (
        <div>
            <label className="field-label">
                {label}
            </label>
            {children}
        </div>
    );
}

const filterClass = 'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy';

function ActionBtn({ title, onClick, icon: Icon, color = 'slate' }) {
    const colors = {
        slate: 'hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200',
        orange: 'hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/30 dark:hover:text-orange-400',
    };
    return (
        <button type="button" title={title} onClick={onClick} className={`p-1.5 rounded-lg text-slate-400 transition-colors ${colors[color]}`}>
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
    );
}

export default function BonExecutionListPage() {
    const [filters, setFilters] = useState(emptyFilters);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(() => {
        setLoading(true);
        const params = { all: 1, ...filters };
        Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });

        api.get('/client-orders', { params })
            .then((res) => setRows(res.data.data ?? []))
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, [filters]);

    useEffect(() => { load(); }, [load]);

    const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

    const handlePrint = async (row) => {
        try {
            const res = await api.get(`/client-orders/${row.id}`);
            openPrintable(res.data);
        } catch {
            openPrintable(row);
        }
    };

    const columns = [
        'Date',
        'DV N°',
        'Nom Client',
        'Type Travaux',
        'Ville',
        'Délai',
        'Règlement',
        'Montant HT',
        'TVA',
        'Montant TTC',
        'Avance',
        'Solde',
        'Actions',
    ];

    return (
        <div className="space-y-4">
            <div className="glass-card p-4 shadow-card border border-slate-200/60 dark:border-slate-700/60">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1.2fr_0.9fr_auto] gap-2.5 items-end">
                    <Field label="Date du">
                        <input type="date" value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} className={filterClass} />
                    </Field>
                    <Field label="Date au">
                        <input type="date" value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} className={filterClass} />
                    </Field>
                    <Field label="Nom Client">
                        <input type="text" value={filters.client_name} onChange={(e) => setFilter('client_name', e.target.value)} placeholder="Rechercher client..." className={filterClass} />
                    </Field>
                    <Field label="Ville">
                        <input type="text" value={filters.city} onChange={(e) => setFilter('city', e.target.value)} placeholder="Ville..." className={filterClass} />
                    </Field>
                    <button type="button" onClick={load} className="btn-secondary text-xs h-[34px] px-4 self-end">
                        <Search className="w-3.5 h-3.5" /> Rechercher
                    </button>
                </div>
            </div>

            <div className="glass-card rounded-2xl shadow-card border border-slate-200/60 dark:border-slate-700/60">
                <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">État d'Exécution</h3>
                    <button type="button" onClick={load} disabled={loading} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Actualiser">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <ScrollAreaWithArrows variant="table" deps={[rows.length, loading]}>
                    <table className="w-full text-sm min-w-[1400px]">
                        <thead className="sticky top-0 z-10">                            <tr className="bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                                {columns.map((h) => (
                                    <th key={h} className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap text-center">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                [...Array(4)].map((_, i) => (
                                    <tr key={i}>{columns.map((__, j) => (
                                        <td key={j} className="px-3 py-3 text-center"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[80px]" /></td>
                                    ))}</tr>
                                ))
                            ) : rows.length ? (
                                rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-emerald-50/40 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.order_date}</td>
                                        <td className="px-3 py-2.5 text-center font-mono text-xs font-semibold text-brand-navy dark:text-violet-400">{row.quote_reference || '—'}</td>
                                        <td className="px-3 py-2.5 text-center font-medium text-slate-800 dark:text-white">{row.client_name || '—'}</td>
                                        <td className="px-3 py-2.5 text-center">
                                            {row.type_travaux ? (
                                                <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-brand-navy dark:text-blue-300">
                                                    {row.type_travaux}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{row.city || '—'}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{formatDelayDisplay(row.work_delay)}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.reglement || '—'}</td>
                                        <td className="px-3 py-2.5 text-center font-semibold tabular-nums text-brand-navy dark:text-violet-400">{formatMontant(row.subtotal)}</td>
                                        <td className="px-3 py-2.5 text-center tabular-nums text-slate-600 dark:text-slate-300">{formatMontant(row.tva)}</td>
                                        <td className="px-3 py-2.5 text-center font-bold tabular-nums text-brand-navy dark:text-violet-400">{formatMontant(row.total_ttc)}</td>
                                        <td className="px-3 py-2.5 text-center tabular-nums text-emerald-700 dark:text-emerald-300">{formatMontant(row.avance)}</td>
                                        <td className="px-3 py-2.5 text-center">
                                            <SoldeCell value={row.solde} />
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center justify-center gap-0.5">
                                                <ActionBtn title="Imprimer" icon={Printer} color="slate" onClick={() => handlePrint(row)} />
                                                <ActionBtn title="PDF" icon={FileText} color="orange" onClick={() => handlePrint(row)} />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">Aucun bon d'exécution — validez un devis pour l'afficher ici</td></tr>
                            )}
                        </tbody>
                    </table>
                </ScrollAreaWithArrows>
            </div>
        </div>
    );
}
