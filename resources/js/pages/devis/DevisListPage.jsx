import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Printer, FileText, RefreshCw, Search, Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import ScrollAreaWithArrows from '../../components/ScrollAreaWithArrows';
import {
    STATUT_FILTER_OPTIONS,
    emptyFilters,
    formatDelayDisplay,
    formatMontant,
    openPrintable,
} from './devisUtils';

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

function StatutBadge({ value }) {
    const valide = value === 'Validé';
    return (
        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${valide ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'}`}>
            {value || 'En Attente'}
        </span>
    );
}

function ActionBtn({ title, onClick, icon: Icon, color = 'slate' }) {
    const colors = {
        amber: 'hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/30 dark:hover:text-amber-400',
        slate: 'hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200',
        orange: 'hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/30 dark:hover:text-orange-400',
        red: 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400',
    };
    return (
        <button type="button" title={title} onClick={onClick} className={`p-1.5 rounded-lg text-slate-400 transition-colors ${colors[color]}`}>
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
    );
}

export default function DevisListPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState(emptyFilters);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(() => {
        setLoading(true);
        const params = { all: 1, ...filters };
        Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });

        api.get('/quotes', { params })
            .then((res) => setRows(res.data.data ?? []))
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, [filters]);

    useEffect(() => { load(); }, [load]);

    const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

    const handleDelete = async (row) => {
        if (!window.confirm(`Supprimer le devis « ${row.reference} » (${row.client_name || 'sans client'}) ?`)) return;
        try {
            await api.delete(`/quotes/${row.id}`);
            load();
        } catch (err) {
            window.alert(err.response?.data?.message || 'Impossible de supprimer ce devis');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="glass-card p-4 shadow-card border border-slate-200/60 dark:border-slate-700/60 flex-1 min-w-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1.2fr_0.9fr_0.9fr_auto] gap-2.5 items-end">
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
                        <Field label="Statut">
                            <select value={filters.statut} onChange={(e) => setFilter('statut', e.target.value)} className={filterClass}>
                                {STATUT_FILTER_OPTIONS.map((o) => (
                                    <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        </Field>
                        <button type="button" onClick={load} className="btn-secondary text-xs h-[34px] px-4 self-end">
                            <Search className="w-3.5 h-3.5" /> Rechercher
                        </button>
                    </div>
                </div>
                <button type="button" onClick={() => navigate('/clients/devis/nouveau')} className="btn-primary text-sm shrink-0">
                    <Plus className="w-4 h-4" />
                    Nouveau Devis
                </button>
            </div>

            <div className="glass-card rounded-2xl shadow-card border border-slate-200/60 dark:border-slate-700/60">
                <div className="px-5 py-3.5 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Liste des devis</h3>
                    <button type="button" onClick={load} disabled={loading} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Actualiser">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <ScrollAreaWithArrows variant="table" deps={[rows.length, loading]}>
                    <table className="w-full text-sm min-w-[1100px]">
                        <thead className="sticky top-0 z-10">                            <tr className="bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                                {['Date', 'Réf', 'Nom Client', 'Contact', 'Ville', 'Type', 'Budget', 'Délai', 'Lignes', 'Total HT', 'TVA', 'Total TTC', 'Statut', 'Actions'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap text-center">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                [...Array(4)].map((_, i) => (
                                    <tr key={i}>{[...Array(14)].map((__, j) => (
                                        <td key={j} className="px-4 py-3 text-center"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[80px]" /></td>
                                    ))}</tr>
                                ))
                            ) : rows.length ? (
                                rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-violet-50/40 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.quote_date}</td>
                                        <td className="px-4 py-2.5 text-center font-mono text-xs font-semibold text-brand-navy dark:text-violet-400">{row.reference}</td>
                                        <td className="px-4 py-2.5 text-center font-medium text-slate-800 dark:text-white">{row.client_name || '—'}</td>
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.contact || '—'}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{row.city || '—'}</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${row.chantier_type === 'Public' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'}`}>
                                                {row.chantier_type || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-center tabular-nums font-medium text-slate-700 dark:text-slate-200">{formatMontant(row.budget)}</td>
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{formatDelayDisplay(row.work_delay)}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300" title={row.designation}>
                                                {row.items_count || 1} ligne{(row.items_count || 1) > 1 ? 's' : ''}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-center font-semibold tabular-nums text-brand-navy dark:text-violet-400">{formatMontant(row.subtotal)}</td>
                                        <td className="px-4 py-2.5 text-center tabular-nums text-slate-600 dark:text-slate-300">{formatMontant(row.tva)}</td>
                                        <td className="px-4 py-2.5 text-center font-bold tabular-nums text-brand-navy dark:text-violet-400">{formatMontant(row.total_ttc)}</td>
                                        <td className="px-4 py-2.5 text-center"><StatutBadge value={row.statut} /></td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center justify-center gap-0.5">
                                                <ActionBtn title="Modifier" icon={Pencil} color="amber" onClick={() => navigate(`/clients/devis/${row.id}`)} />
                                                <ActionBtn title="Imprimer" icon={Printer} color="slate" onClick={() => openPrintable(row)} />
                                                <ActionBtn title="PDF" icon={FileText} color="orange" onClick={() => openPrintable(row)} />
                                                <ActionBtn title="Supprimer" icon={Trash2} color="red" onClick={() => handleDelete(row)} />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={14} className="px-4 py-12 text-center text-slate-400">Aucun devis enregistré</td></tr>
                            )}
                        </tbody>
                    </table>
                </ScrollAreaWithArrows>
            </div>
        </div>
    );
}
