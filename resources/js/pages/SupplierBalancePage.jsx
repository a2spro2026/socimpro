import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import api from '../lib/api';
import { ReliquatCell } from './clients/clientAmountUtils';
import ScrollAreaWithArrows from '../components/ScrollAreaWithArrows';

const emptyFilters = {
    mois: '',
    supplier_id: '',
};

function Field({ label, children }) {
    return (
        <div>
            <label className="field-label">{label}</label>
            {children}
        </div>
    );
}

const filterClass =
    'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy';

function formatMontant(value) {
    const n = Math.round(Number(value) || 0);
    return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}.Fcfa`;
}

function SoldeFournisseurCell({ value }) {
    const n = Number(value) || 0;
    if (n <= 0) {
        return <span className="tabular-nums text-slate-400">—</span>;
    }
    return (
        <span className="tabular-nums font-bold text-red-600 dark:text-red-400">
            {formatMontant(n)}
        </span>
    );
}

function monthOptions() {
    const now = new Date();
    const options = [{ value: '', label: 'Tous les mois' }];
    for (let i = 0; i < 24; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
}

const columns = ['Date', 'Fournisseur', 'Total Achats', 'Montant Payé', 'Solde', 'Reliquat'];

export default function SupplierBalancePage() {
    const [filters, setFilters] = useState(emptyFilters);
    const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
    const [rows, setRows] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const months = monthOptions();

    const load = useCallback(() => {
        setLoading(true);
        const params = {};
        if (appliedFilters.mois) params.mois = appliedFilters.mois;
        if (appliedFilters.supplier_id) params.supplier_id = appliedFilters.supplier_id;

        api.get('/purchase-orders/balance', { params })
            .then((res) => {
                setRows(res.data.data ?? []);
            })
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, [appliedFilters]);

    useEffect(() => {
        api.get('/suppliers', { params: { all: 1 } })
            .then((r) => setSuppliers(r.data.data ?? []))
            .catch(() => setSuppliers([]));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

    const handleSearch = () => setAppliedFilters({ ...filters });

    return (
        <div className="space-y-3">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Balance Fournisseur</h1>

            <div className="glass-card p-4 shadow-card border border-slate-200/60 dark:border-slate-700/60 -mt-1">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.2fr_auto] gap-2.5 items-end max-w-3xl">
                    <Field label="Mois">
                        <select value={filters.mois} onChange={(e) => setFilter('mois', e.target.value)} className={filterClass}>
                            {months.map((m) => (
                                <option key={m.value || 'all'} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Fournisseur">
                        <select value={filters.supplier_id} onChange={(e) => setFilter('supplier_id', e.target.value)} className={filterClass}>
                            <option value="">Tous les fournisseurs</option>
                            {suppliers.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </Field>
                    <button type="button" onClick={handleSearch} className="btn-secondary text-xs h-[34px] px-4 self-end">
                        <Search className="w-3.5 h-3.5" /> Rechercher
                    </button>
                </div>
            </div>

            <div className="glass-card rounded-2xl shadow-card border border-slate-200/60 dark:border-slate-700/60 -mt-1">
                <div className="px-5 py-3.5 rounded-t-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Balance fournisseurs</h3>
                    <button type="button" onClick={load} disabled={loading} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Actualiser">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <ScrollAreaWithArrows variant="table" height="min(42vh, 380px)" deps={[rows.length, loading]}>
                    <table className="w-full text-sm min-w-[800px]">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-gradient-to-r from-slate-100 via-slate-200/90 to-slate-100 dark:from-slate-800 dark:via-slate-700/80 dark:to-slate-800 border-b-2 border-slate-300 dark:border-slate-600 backdrop-blur-sm">
                                {columns.map((h) => (
                                    <th
                                        key={h}
                                        className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300 whitespace-nowrap text-center"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                [...Array(6)].map((_, i) => (
                                    <tr key={i}>
                                        {columns.map((__, j) => (
                                            <td key={j} className="px-4 py-3 text-center">
                                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[80px]" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : rows.length ? (
                                rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-orange-50/40 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.date || '—'}</td>
                                        <td className="px-4 py-2.5 text-center font-medium text-slate-800 dark:text-white">{row.fournisseur}</td>
                                        <td className="px-4 py-2.5 text-center font-semibold tabular-nums text-brand-navy dark:text-orange-400">{formatMontant(row.total_achats)}</td>
                                        <td className="px-4 py-2.5 text-center tabular-nums text-emerald-700 dark:text-emerald-300">{formatMontant(row.montant_paye)}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <SoldeFournisseurCell value={row.solde} />
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <ReliquatCell value={row.reliquat} />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                                        Aucune donnée pour ces critères
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </ScrollAreaWithArrows>
            </div>
        </div>
    );
}
