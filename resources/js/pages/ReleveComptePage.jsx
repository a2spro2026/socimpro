import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, ScrollText, Search } from 'lucide-react';
import api from '../lib/api';
import ScrollAreaWithArrows from '../components/ScrollAreaWithArrows';

const CONFIG = {
    client: {
        title: 'Relevé de compte clients',
        entityLabel: 'Client',
        entitiesPath: '/clients',
        entityParam: 'client_id',
        initialKey: 'budget',
        debitTypes: ['Bon de vente', 'Bon exécution', 'Solde initial'],
    },
    supplier: {
        title: 'Relevé de compte fournisseurs',
        entityLabel: 'Fournisseur',
        entitiesPath: '/suppliers',
        entityParam: 'supplier_id',
        initialKey: 'initial_balance',
        debitTypes: ['Bon d\'achat', 'Solde initial'],
    },
};

const emptyFilters = { mois: '', entity_id: '' };

const filterClass =
    'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy';

const columns = ['Date', 'Référence', 'Type', 'Libellé', 'Débit', 'Crédit', 'Solde'];

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

function matchesMonth(dateRaw, mois) {
    if (!mois) return true;
    if (!dateRaw) return false;
    return dateRaw.startsWith(mois);
}

function parseAmount(value) {
    return Number(String(value ?? 0).replace(',', '.')) || 0;
}

function buildClientMovements(sales, execOrders, payments, entity, mois) {
    const movements = [];
    const initial = parseAmount(entity?.budget);

    if (initial > 0 && !mois) {
        movements.push({
            date: '—',
            dateRaw: '0000-01-01',
            reference: 'SOLDE INITIAL',
            type: 'Solde initial',
            libelle: 'Solde à nouveau',
            debit: initial,
            credit: 0,
        });
    }

    sales
        .filter((o) => o.status !== 'annule' && matchesMonth(o.order_date_raw, mois))
        .forEach((o) => {
            movements.push({
                date: o.order_date || '—',
                dateRaw: o.order_date_raw || '9999-12-31',
                reference: o.reference,
                type: 'Bon de vente',
                libelle: o.designation || o.client || '—',
                debit: parseAmount(o.montant),
                credit: 0,
            });
        });

    execOrders
        .filter((o) => o.status !== 'annule' && matchesMonth(o.order_date_raw, mois))
        .forEach((o) => {
            movements.push({
                date: o.order_date || '—',
                dateRaw: o.order_date_raw || '9999-12-31',
                reference: o.reference,
                type: 'Bon exécution',
                libelle: o.client_name || o.designation || '—',
                debit: parseAmount(o.total_ttc ?? o.montant),
                credit: 0,
            });
        });

    payments
        .filter((p) => matchesMonth(p.payment_date_raw, mois))
        .forEach((p) => {
            movements.push({
                date: p.payment_date || '—',
                dateRaw: p.payment_date_raw || '9999-12-31',
                reference: p.reference,
                type: 'Règlement',
                libelle: [p.reglement, p.numero].filter(Boolean).join(' — ') || 'Règlement client',
                debit: 0,
                credit: parseAmount(p.montant),
            });
        });

    return movements;
}

function buildSupplierMovements(orders, payments, entity, mois) {
    const movements = [];
    const initial = parseAmount(entity?.initial_balance);

    if (initial > 0 && !mois) {
        movements.push({
            date: '—',
            dateRaw: '0000-01-01',
            reference: 'SOLDE INITIAL',
            type: 'Solde initial',
            libelle: 'Solde à nouveau',
            debit: initial,
            credit: 0,
        });
    }

    orders
        .filter((o) => o.status !== 'annule' && matchesMonth(o.order_date_raw, mois))
        .forEach((o) => {
            movements.push({
                date: o.order_date || '—',
                dateRaw: o.order_date_raw || '9999-12-31',
                reference: o.reference,
                type: 'Bon d\'achat',
                libelle: o.designation || o.fournisseur || '—',
                debit: parseAmount(o.montant),
                credit: 0,
            });
        });

    payments
        .filter((p) => matchesMonth(p.payment_date_raw, mois))
        .forEach((p) => {
            movements.push({
                date: p.payment_date || '—',
                dateRaw: p.payment_date_raw || '9999-12-31',
                reference: p.reference,
                type: 'Règlement',
                libelle: [p.reglement, p.numero].filter(Boolean).join(' — ') || 'Règlement fournisseur',
                debit: 0,
                credit: parseAmount(p.montant),
            });
        });

    return movements;
}

function withRunningBalance(movements) {
    const sorted = [...movements].sort((a, b) => {
        const cmp = (a.dateRaw || '').localeCompare(b.dateRaw || '');
        if (cmp !== 0) return cmp;
        return (a.reference || '').localeCompare(b.reference || '');
    });

    let balance = 0;
    return sorted.map((row) => {
        balance += row.debit - row.credit;
        return { ...row, solde: balance };
    });
}

export default function ReleveComptePage({ mode = 'client' }) {
    const cfg = CONFIG[mode];
    const months = useMemo(() => monthOptions(), []);

    const [filters, setFilters] = useState(emptyFilters);
    const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
    const [entities, setEntities] = useState([]);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.get(cfg.entitiesPath, { params: { all: 1 } })
            .then(({ data }) => setEntities(data.data ?? []))
            .catch(() => setEntities([]));
    }, [cfg.entitiesPath]);

    const load = useCallback(() => {
        const entityId = appliedFilters.entity_id;
        if (!entityId) {
            setRows([]);
            return undefined;
        }

        setLoading(true);

        if (mode === 'client') {
            return Promise.all([
                api.get('/sales-orders', { params: { all: 1 } }),
                api.get('/client-orders', { params: { all: 1 } }),
                api.get('/client-payments'),
            ])
                .then(([salesRes, execRes, payRes]) => {
                    const entity = entities.find((e) => String(e.id) === String(entityId));
                    const sales = (salesRes.data.data ?? []).filter((o) => String(o.client_id) === String(entityId));
                    const execOrders = (execRes.data.data ?? []).filter((o) => String(o.client_id) === String(entityId));
                    const payments = (payRes.data.data ?? payRes.data ?? []).filter((p) => String(p.client_id) === String(entityId));
                    const movements = buildClientMovements(sales, execOrders, payments, entity, appliedFilters.mois);
                    setRows(withRunningBalance(movements));
                })
                .catch(() => setRows([]))
                .finally(() => setLoading(false));
        }

        return Promise.all([
            api.get('/purchase-orders', { params: { all: 1, doc_type: 'bon_achat' } }),
            api.get('/supplier-payments'),
        ])
            .then(([ordersRes, payRes]) => {
                const entity = entities.find((e) => String(e.id) === String(entityId));
                const orders = (ordersRes.data.data ?? []).filter((o) => String(o.supplier_id) === String(entityId));
                const payments = (payRes.data.data ?? payRes.data ?? []).filter((p) => String(p.supplier_id) === String(entityId));
                const movements = buildSupplierMovements(orders, payments, entity, appliedFilters.mois);
                setRows(withRunningBalance(movements));
            })
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, [appliedFilters, entities, mode]);

    useEffect(() => {
        load();
    }, [load]);

    const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
    const handleSearch = () => setAppliedFilters({ ...filters });

    const totals = useMemo(() => ({
        debit: rows.reduce((s, r) => s + r.debit, 0),
        credit: rows.reduce((s, r) => s + r.credit, 0),
        solde: rows.length ? rows[rows.length - 1].solde : 0,
    }), [rows]);

    const selectedEntity = entities.find((e) => String(e.id) === String(appliedFilters.entity_id));

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-navy to-blue-800 text-white shadow-lg">
                    <ScrollText className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">{cfg.title}</h1>
                    {selectedEntity && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">{selectedEntity.name}</p>
                    )}
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
                    <Field label={cfg.entityLabel}>
                        <select value={filters.entity_id} onChange={(e) => setFilter('entity_id', e.target.value)} className={filterClass}>
                            <option value="">— Sélectionner —</option>
                            {entities.map((e) => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                        </select>
                    </Field>
                    <button type="button" onClick={handleSearch} className="btn-secondary text-xs h-[34px] px-4 self-end">
                        <Search className="w-3.5 h-3.5" /> Rechercher
                    </button>
                </div>
            </div>

            {appliedFilters.entity_id && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { label: 'Total débits', value: totals.debit, className: 'text-brand-navy dark:text-violet-400' },
                        { label: 'Total crédits', value: totals.credit, className: 'text-emerald-700 dark:text-emerald-300' },
                        { label: 'Solde', value: totals.solde, className: totals.solde > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300' },
                    ].map(({ label, value, className }) => (
                        <div key={label} className="glass-card p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
                            <p className={`mt-1 text-lg font-bold tabular-nums ${className}`}>{formatMontant(value)}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="glass-card rounded-2xl shadow-card border border-slate-200/60 dark:border-slate-700/60">
                <div className="px-5 py-3.5 rounded-t-2xl bg-gradient-to-r from-slate-700 via-slate-800 to-brand-navy border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Mouvements</h3>
                    <button type="button" onClick={load} disabled={loading} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Actualiser">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <ScrollAreaWithArrows variant="table" deps={[rows.length, loading, appliedFilters.entity_id]}>
                    <table className="w-full text-sm min-w-[900px]">
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
                            {!appliedFilters.entity_id ? (
                                <tr>
                                    <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                                        Sélectionnez un {cfg.entityLabel.toLowerCase()} pour afficher le relevé
                                    </td>
                                </tr>
                            ) : loading ? (
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
                                rows.map((row, i) => (
                                    <tr key={`${row.reference}-${i}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.date}</td>
                                        <td className="px-4 py-2.5 text-center font-medium text-slate-800 dark:text-white">{row.reference}</td>
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.type}</td>
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300 max-w-[200px] truncate" title={row.libelle}>{row.libelle}</td>
                                        <td className="px-4 py-2.5 text-center tabular-nums font-semibold text-brand-navy dark:text-violet-400">
                                            {row.debit > 0 ? formatMontant(row.debit) : '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-center tabular-nums text-emerald-700 dark:text-emerald-300">
                                            {row.credit > 0 ? formatMontant(row.credit) : '—'}
                                        </td>
                                        <td className={`px-4 py-2.5 text-center tabular-nums font-bold ${row.solde > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                            {formatMontant(row.solde)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                                        Aucun mouvement pour ces critères
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
