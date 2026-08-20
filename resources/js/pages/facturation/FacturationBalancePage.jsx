import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Scale, Search } from 'lucide-react';
import api from '../../lib/api';
import ScrollAreaWithArrows from '../../components/ScrollAreaWithArrows';

const emptyFilters = { mois: '', client_id: '' };

const filterClass =
    'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy';

const columns = ['Client', 'Nb Factures', 'Total Factures', 'Dernière facture'];

function Field({ label, children }) {
    return (
        <div>
            <label className="field-label">{label}</label>
            {children}
        </div>
    );
}

function formatMontant(value) {
    const n = Math.round(Number(value) || 0);
    return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}.Fcfa`;
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

function parseAmount(value) {
    return Number(String(value ?? 0).replace(',', '.')) || 0;
}

function groupInvoicesByClient(invoices, mois, clientId) {
    const filtered = invoices.filter((inv) => {
        if (clientId && String(inv.client_id) !== String(clientId)) return false;
        if (mois && inv.order_date_raw && !inv.order_date_raw.startsWith(mois)) return false;
        if (mois && !inv.order_date_raw) return false;
        return inv.status !== 'annule';
    });

    const map = new Map();

    filtered.forEach((inv) => {
        const key = inv.client_id ?? 'unknown';
        const existing = map.get(key) ?? {
            id: key,
            client: inv.client || '—',
            count: 0,
            total: 0,
            lastDate: '',
            lastDateRaw: '',
        };
        existing.count += 1;
        existing.total += parseAmount(inv.montant);
        if ((inv.order_date_raw || '') >= existing.lastDateRaw) {
            existing.lastDateRaw = inv.order_date_raw || '';
            existing.lastDate = inv.order_date || '—';
        }
        map.set(key, existing);
    });

    return [...map.values()].sort((a, b) => b.total - a.total);
}

export default function FacturationBalancePage() {
    const months = useMemo(() => monthOptions(), []);
    const [filters, setFilters] = useState(emptyFilters);
    const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
    const [clients, setClients] = useState([]);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/clients', { params: { all: 1 } })
            .then(({ data }) => setClients(data.data ?? []))
            .catch(() => setClients([]));
    }, []);

    const load = useCallback(() => {
        setLoading(true);
        api.get('/client-invoices', { params: { all: 1 } })
            .then(({ data }) => {
                const invoices = data.data ?? [];
                setRows(groupInvoicesByClient(invoices, appliedFilters.mois, appliedFilters.client_id));
            })
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, [appliedFilters]);

    useEffect(() => {
        load();
    }, [load]);

    const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
    const handleSearch = () => setAppliedFilters({ ...filters });

    const totalFactures = useMemo(() => rows.reduce((s, r) => s + r.total, 0), [rows]);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-navy to-blue-800 text-white shadow-lg">
                    <Scale className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Balances factures clients</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Synthèse par client</p>
                </div>
            </div>

            <div className="glass-card p-4 shadow-card border border-slate-200/60 dark:border-slate-700/60">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.2fr_auto] gap-2.5 items-end max-w-3xl">
                    <Field label="Mois">
                        <select value={filters.mois} onChange={(e) => setFilter('mois', e.target.value)} className={filterClass}>
                            {months.map((m) => (
                                <option key={m.value || 'all'} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Client">
                        <select value={filters.client_id} onChange={(e) => setFilter('client_id', e.target.value)} className={filterClass}>
                            <option value="">Tous les clients</option>
                            {clients.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </Field>
                    <button type="button" onClick={handleSearch} className="btn-secondary text-xs h-[34px] px-4 self-end">
                        <Search className="w-3.5 h-3.5" /> Rechercher
                    </button>
                </div>
            </div>

            <div className="glass-card p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/60 max-w-xs">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total factures</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-brand-navy dark:text-violet-400">{formatMontant(totalFactures)}</p>
            </div>

            <div className="glass-card rounded-2xl shadow-card border border-slate-200/60 dark:border-slate-700/60">
                <div className="px-5 py-3.5 rounded-t-2xl bg-gradient-to-r from-slate-700 via-slate-800 to-brand-navy border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Balance factures</h3>
                    <button type="button" onClick={load} disabled={loading} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Actualiser">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <ScrollAreaWithArrows variant="table" deps={[rows.length, loading]}>
                    <table className="w-full text-sm min-w-[700px]">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-gradient-to-r from-slate-100 via-slate-200/90 to-slate-100 dark:from-slate-800 dark:via-slate-700/80 dark:to-slate-800 border-b-2 border-slate-300 dark:border-slate-600">
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
                                [...Array(4)].map((_, i) => (
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
                                    <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-2.5 text-center font-medium text-slate-800 dark:text-white">{row.client}</td>
                                        <td className="px-4 py-2.5 text-center tabular-nums text-slate-600 dark:text-slate-300">{row.count}</td>
                                        <td className="px-4 py-2.5 text-center font-semibold tabular-nums text-brand-navy dark:text-violet-400">{formatMontant(row.total)}</td>
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.lastDate}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                                        Aucune facture pour ces critères
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
