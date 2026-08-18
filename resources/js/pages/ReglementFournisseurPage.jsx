import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    CheckCircle2, XCircle, Receipt, Scale, Plus, Eye, Pencil, Trash2, Printer,
    Banknote, Wallet, AlertCircle, Search, X, RefreshCw, Download,
} from 'lucide-react';
import api from '../lib/api';
import ScrollAreaWithArrows from '../components/ScrollAreaWithArrows';

const REGLEMENT_OPTIONS = ['', 'Esp', 'Chq', 'Eff', 'Vir', 'Vers'];
const BANQUE_OPTIONS = ['Attijariwafa', 'BMCE', 'Banque Populaire', 'CIH', 'BMCI', 'Crédit du Maroc', 'CFG', 'Société Générale'];
const isEspReglement = (value) => (value || '').trim().toLowerCase() === 'esp';
const SOLDE_INITIAL_ID = 0;
const STATUT_OPTIONS = [
    { value: 'Inst', label: 'Inst', className: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600' },
    { value: 'Payé', label: 'Payé', className: 'bg-emerald-500 text-white border-emerald-600' },
    { value: 'Report', label: 'Report', className: 'bg-amber-400 text-amber-950 border-amber-500' },
    { value: 'Imp', label: 'Imp', className: 'bg-red-500 text-white border-red-600' },
    { value: 'Dévalidé', label: 'Dévalidé', className: 'bg-violet-600 text-white border-violet-700' },
];
const ACTION_OPTIONS = [
    { value: 'Inst', label: 'Inst', activeClass: 'btn-action-inst' },
    { value: 'Payé', label: 'Payé', activeClass: 'btn-action-paye' },
    { value: 'Report', label: 'Report', activeClass: 'btn-action-report' },
    { value: 'Imp', label: 'Imp', activeClass: 'btn-action-imp' },
    { value: 'Dévalidé', label: 'Dévalidé', activeClass: 'btn-action-devalide' },
];

const emptyForm = {
    payment_date: '',
    supplier_id: '',
    reglement: '',
    numero: '',
    banque: '',
    nom_tire: '',
    montant: '',
    date_decaissement: '',
    remarque: '',
};

const emptyFilters = {
    statut: '',
    numero: '',
    banque: '',
    montant: '',
    mois: '',
};

function Field({ label, children }) {
    return (
        <div className="min-w-0">
            <label className="field-label field-label-compact">{label}</label>
            {children}
        </div>
    );
}

const inputClass =
    'w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-1.5 py-1 text-[11px] text-center outline-none focus:ring-1 focus:ring-brand-navy/30 focus:border-brand-navy transition-all';
const readOnlyClass =
    'w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 px-1.5 py-1 text-[11px] text-center cursor-not-allowed';
const filterClass =
    'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy';

function formatMontant(value) {
    const n = Math.round(Number(value) || 0);
    return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}.Fcfa`;
}

function ActionBtn({ title, icon: Icon, color = 'slate', onClick }) {
    const colors = {
        blue: 'hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400',
        amber: 'hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/30 dark:hover:text-amber-400',
        red: 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400',
        slate: 'hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200',
    };
    return (
        <button type="button" title={title} onClick={onClick} className={`p-1.5 rounded-lg text-slate-400 transition-colors ${colors[color]}`}>
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
    );
}

function statutClass(statut) {
    return STATUT_OPTIONS.find((s) => s.value === statut)?.className
        || 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600';
}

const STATUT_ROW_CLASS = {
    Inst: 'bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/60',
    Payé: 'bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30',
    Report: 'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30',
    Imp: 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30',
    Dévalidé: 'bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/30',
};

function statutRowClass(statut) {
    return STATUT_ROW_CLASS[statut] || 'hover:bg-blue-50/40 dark:hover:bg-slate-800/40';
}

function buildPrintHtml(row) {
    const allocRows = (row.allocations || []).map((a) =>
        `<tr><td>${a.bon || '—'}</td><td>${formatMontant(a.amount)}</td><td>${a.action || '—'}</td></tr>`
    ).join('') || '<tr><td colspan="3">—</td></tr>';

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Règlement ${row.reference}</title>
<style>body{font-family:Arial,sans-serif;padding:32px;color:#1e293b}h1{color:#1e3a5f;font-size:22px}
table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #e2e8f0;padding:8px;font-size:12px;text-align:center}
th{background:#f8fafc;font-weight:700}.badge{background:#dbeafe;color:#1d4ed8;padding:4px 10px;border-radius:999px;font-weight:700}
</style></head><body>
<h1>STE SOCIMPRO — Règlement Achats <span class="badge">${row.reference || ''}</span></h1>
<table>
<tr><th>Date</th><td>${row.payment_date || '—'}</td><th>Fournisseur</th><td>${row.fournisseur || '—'}</td></tr>
<tr><th>Type</th><td>${row.reglement || '—'}</td><th>N°</th><td>${row.numero || '—'}</td></tr>
<tr><th>Banque</th><td>${row.banque || '—'}</td><th>Date Décaiss</th><td>${row.date_decaissement || '—'}</td></tr>
<tr><th>Montant</th><td><strong>${formatMontant(row.montant)}</strong></td><th>Statut</th><td>${row.statut || '—'}</td></tr>
<tr><th>Nom tiré</th><td>${row.nom_tire || '—'}</td><th>Remarque</th><td>${row.remarque || '—'}</td></tr>
</table>
<table><thead><tr><th>Bon</th><th>Montant</th><th>Action</th></tr></thead><tbody>${allocRows}</tbody></table>
</body></html>`;
}

function openPrintable(row) {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(buildPrintHtml(row));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
}

function ViewModal({ row, onClose }) {
    if (!row) return null;
    const fields = [
        ['Réf', row.reference],
        ['Date', row.payment_date],
        ['Fournisseur', row.fournisseur],
        ['Type', row.reglement],
        ['N°', row.numero],
        ['Banque', row.banque],
        ['Date Décaiss', row.date_decaissement],
        ['Montant', formatMontant(row.montant)],
        ['Statut', row.statut],
        ['Nom tiré', row.nom_tire],
        ['Remarque', row.remarque],
    ];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-800">
                    <h3 className="text-white font-bold text-sm">Détail règlement {row.reference}</h3>
                    <button type="button" onClick={onClose} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-5 grid grid-cols-2 gap-3 text-sm">
                    {fields.map(([label, value]) => (
                        <div key={label}>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
                            <p className="font-medium text-slate-800 dark:text-slate-100">{value || '—'}</p>
                        </div>
                    ))}
                </div>
                {(row.allocations || []).length > 0 && (
                    <div className="px-5 pb-5">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Allocations</p>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <ScrollAreaWithArrows variant="table" deps={[row.allocations?.length]}>
                            <table className="w-full text-xs">
                                <thead><tr className="bg-slate-50 dark:bg-slate-800"><th className="px-2 py-1.5">Bon</th><th className="px-2 py-1.5">Montant</th><th className="px-2 py-1.5">Action</th></tr></thead>
                                <tbody>
                                    {row.allocations.map((a) => (
                                        <tr key={a.id} className="border-t border-slate-100 dark:border-slate-800 text-center">
                                            <td className="px-2 py-1.5 font-mono">{a.bon}</td>
                                            <td className="px-2 py-1.5 tabular-nums">{formatMontant(a.amount)}</td>
                                            <td className="px-2 py-1.5">{a.action || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </ScrollAreaWithArrows>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function monthOptions() {
    const now = new Date();
    const options = [];
    for (let i = 0; i < 24; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
}

function ImportReglModal({ open, rows, selected, loading, onToggle, onToggleAll, onClose, onApply }) {
    if (!open) return null;

    const selectedCount = Object.values(selected).filter(Boolean).length;
    const allSelected = rows.length > 0 && selectedCount === rows.length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-800 shrink-0">
                    <div>
                        <p className="text-[10px] text-emerald-100 uppercase tracking-wider">Endossement</p>
                        <h3 className="text-white font-bold text-sm">Importer Règlement Client</h3>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <p className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    Sélectionnez un ou plusieurs règlements client reçus pour remplir le règlement fournisseur (même chèque / effet / virement).
                </p>

                <ScrollAreaWithArrows variant="table" className="flex-1 min-h-0" deps={[rows.length, loading]}>
                    <table className="w-full text-sm min-w-[900px]">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                                <th className="px-3 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={onToggleAll}
                                        className="rounded border-slate-300 text-brand-navy focus:ring-brand-navy/30"
                                    />
                                </th>
                                {['Réf', 'Date', 'Client', 'Type', 'N°', 'Banq', 'Tiré', 'Montant', 'Date Décaiss', 'Statut'].map((h) => (
                                    <th key={h} className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap text-center">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                [...Array(4)].map((_, i) => (
                                    <tr key={i}>
                                        {[...Array(11)].map((__, j) => (
                                            <td key={j} className="px-3 py-3 text-center">
                                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[72px]" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : rows.length ? (
                                rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className={`cursor-pointer transition-colors ${selected[row.id] ? 'bg-emerald-50/70 dark:bg-emerald-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                        onClick={() => onToggle(row.id)}
                                    >
                                        <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={!!selected[row.id]}
                                                onChange={() => onToggle(row.id)}
                                                className="rounded border-slate-300 text-brand-navy focus:ring-brand-navy/30"
                                            />
                                        </td>
                                        <td className="px-3 py-2.5 text-center font-mono text-xs font-semibold">{row.reference}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.payment_date}</td>
                                        <td className="px-3 py-2.5 text-center font-medium">{row.client}</td>
                                        <td className="px-3 py-2.5 text-center">{row.reglement || '—'}</td>
                                        <td className="px-3 py-2.5 text-center font-mono text-xs">{row.numero || '—'}</td>
                                        <td className="px-3 py-2.5 text-center">{row.banque || '—'}</td>
                                        <td className="px-3 py-2.5 text-center">{row.nom_tire || '—'}</td>
                                        <td className="px-3 py-2.5 text-center font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{formatMontant(row.montant)}</td>
                                        <td className="px-3 py-2.5 text-center">{row.date_decaissement || '—'}</td>
                                        <td className="px-3 py-2.5 text-center text-xs">{row.statut}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={11} className="px-4 py-12 text-center text-slate-400">Aucun règlement client disponible</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </ScrollAreaWithArrows>

                <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                    <button type="button" onClick={onClose} className="btn-secondary text-xs px-4">Fermer</button>
                    <button
                        type="button"
                        onClick={onApply}
                        disabled={!selectedCount}
                        className="btn-primary text-xs px-4 disabled:opacity-50"
                    >
                        Importer ({selectedCount})
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ReglementFournisseurPage() {
    const [view, setView] = useState('list'); // list | form
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [filters, setFilters] = useState(emptyFilters);
    const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
    const [payments, setPayments] = useState([]);
    const [summary, setSummary] = useState({ total_reglement: 0, total_decaisse: 0, total_impaye: 0 });
    const [suppliers, setSuppliers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [selected, setSelected] = useState({});
    const [actions, setActions] = useState({});
    const [meta, setMeta] = useState({ next_ref: 'RF-0001', date_raw: '' });
    const [totals, setTotals] = useState({ total_ttc: 0, solde_ttc: 0 });
    const [loading, setLoading] = useState(false);
    const [loadingList, setLoadingList] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [viewRow, setViewRow] = useState(null);
    const [importOpen, setImportOpen] = useState(false);
    const [importRows, setImportRows] = useState([]);
    const [importSelected, setImportSelected] = useState({});
    const [importLoading, setImportLoading] = useState(false);

    const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
    const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

    const loadMeta = useCallback(() => {
        api.get('/supplier-payments/meta')
            .then((r) => setMeta(r.data ?? { next_ref: 'RF-0001', date_raw: '' }))
            .catch(() => {});
    }, []);

    const loadSuppliers = useCallback(() => {
        api.get('/suppliers', { params: { all: 1 } })
            .then((r) => setSuppliers(r.data.data ?? []))
            .catch(() => setSuppliers([]));
    }, []);

    const loadPayments = useCallback(() => {
        setLoadingList(true);
        const params = {};
        Object.entries(appliedFilters).forEach(([k, v]) => {
            if (v) params[k] = v;
        });
        api.get('/supplier-payments', { params })
            .then((r) => {
                setPayments(r.data.data ?? []);
                setSummary({
                    total_reglement: Number(r.data.meta?.total_reglement) || 0,
                    total_decaisse: Number(r.data.meta?.total_decaisse) || 0,
                    total_impaye: Number(r.data.meta?.total_impaye) || 0,
                });
            })
            .catch(() => {
                setPayments([]);
                setSummary({ total_reglement: 0, total_decaisse: 0, total_impaye: 0 });
            })
            .finally(() => setLoadingList(false));
    }, [appliedFilters]);

    const loadOrders = useCallback((supplierId) => {
        if (!supplierId) {
            setOrders([]);
            setSelected({});
            setActions({});
            setTotals({ total_ttc: 0, solde_ttc: 0 });
            return;
        }
        setLoading(true);
        api.get('/supplier-payments/orders', { params: { supplier_id: supplierId } })
            .then((r) => {
                const rows = r.data.data ?? [];
                setOrders(rows);
                setTotals({
                    total_ttc: Number(r.data.meta?.total_ttc) || 0,
                    solde_ttc: Number(r.data.meta?.solde_ttc) || 0,
                });
                const nextActions = {};
                rows.forEach((o) => {
                    nextActions[o.id] = o.payment_action || 'Inst';
                });
                setActions(nextActions);
                setSelected({});
            })
            .catch(() => {
                setOrders([]);
                setTotals({ total_ttc: 0, solde_ttc: 0 });
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        loadMeta();
        loadSuppliers();
    }, [loadMeta, loadSuppliers]);

    useEffect(() => {
        if (view === 'list') loadPayments();
    }, [view, loadPayments]);

    useEffect(() => {
        if (view === 'form' && !editingId) {
            loadOrders(form.supplier_id);
        }
    }, [form.supplier_id, view, editingId, loadOrders]);

    const selectedIds = useMemo(
        () => Object.keys(selected).filter((id) => selected[id]).map(Number),
        [selected],
    );

    const montantReglement = useMemo(
        () => parseFloat(String(form.montant).replace(',', '.')) || 0,
        [form.montant],
    );

    const previewById = useMemo(() => {
        const map = {};
        orders.forEach((o) => {
            const bon = Number(o.montant_bon) || 0;
            const paid = Number(o.montant_paye) || 0;
            map[o.id] = { montant_paye: paid, solde: bon - paid, allocation: 0, preview: false };
        });

        if (!selectedIds.length || montantReglement <= 0) return map;

        // Répartition sur les lignes cochées : Montant Payé = déjà payé + règlement saisi
        // Solde = Montant Bon − Montant Payé (ex. solde 50000 − 15000 = 35000)
        let remaining = montantReglement;
        orders.filter((o) => selectedIds.includes(o.id)).forEach((o) => {
            const bon = Number(o.montant_bon) || 0;
            const paid = Number(o.montant_paye) || 0;
            const due = Math.max(bon - paid, 0);
            if (remaining <= 0) return;

            const applied = Math.round(Math.min(due > 0 ? due : remaining, remaining) * 100) / 100;
            const newPaid = Math.round((paid + applied) * 100) / 100;
            map[o.id] = {
                montant_paye: newPaid,
                solde: Math.round((bon - newPaid) * 100) / 100,
                allocation: applied,
                preview: true,
            };
            remaining = Math.round((remaining - applied) * 100) / 100;
        });

        return map;
    }, [orders, selectedIds, montantReglement]);

    const selectedTotals = useMemo(() => {
        const totalTtc = orders.length
            ? orders.reduce((s, o) => s + (Number(o.montant_bon) || 0), 0)
            : totals.total_ttc;

        // Solde TTC = somme des soldes affichés (après aperçu règlement)
        const soldeTtc = orders.length
            ? Math.round(orders.reduce((s, o) => {
                const preview = previewById[o.id];
                return s + (preview ? Number(preview.solde) || 0 : Number(o.solde) || 0);
            }, 0) * 100) / 100
            : totals.solde_ttc;

        return { total_ttc: totalTtc, solde_ttc: soldeTtc };
    }, [orders, totals, previewById]);

    const displayRow = (row) => {
        const preview = previewById[row.id];
        return {
            montant_paye: preview?.montant_paye ?? (Number(row.montant_paye) || 0),
            solde: preview?.solde ?? (Number(row.solde) || 0),
            isPreview: !!preview?.preview,
        };
    };

    const openNew = () => {
        const today = new Date().toISOString().slice(0, 10);
        setEditingId(null);
        setForm({ ...emptyForm, payment_date: today, date_decaissement: today });
        setSelected({});
        setOrders([]);
        setError('');
        loadMeta();
        setView('form');
    };

    const openEdit = (row) => {
        setEditingId(row.id);
        setForm({
            payment_date: row.payment_date_raw || '',
            supplier_id: String(row.supplier_id || ''),
            reglement: row.reglement || '',
            numero: row.numero || '',
            banque: row.banque || '',
            nom_tire: row.nom_tire || '',
            montant: row.montant || '',
            date_decaissement: row.date_decaissement_raw || '',
            remarque: row.remarque || '',
        });
        setSelected({});
        setOrders([]);
        setError('');
        setMeta((m) => ({ ...m, next_ref: row.reference }));
        setView('form');
    };

    const closeForm = () => {
        setView('list');
        setEditingId(null);
        setError('');
        setSelected({});
        setOrders([]);
        loadPayments();
    };

    const toggleSelect = (id) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

    const toggleSelectAll = () => {
        if (selectedIds.length === orders.length) {
            setSelected({});
            return;
        }
        const next = {};
        orders.forEach((o) => { next[o.id] = true; });
        setSelected(next);
    };

    const setAction = async (orderId, action) => {
        setActions((prev) => ({ ...prev, [orderId]: action }));
        try {
            await api.patch(`/supplier-payments/orders/${orderId}/action`, { payment_action: action });
            setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, payment_action: action } : o)));
        } catch {
            // keep local
        }
    };

    const handleStatutChange = async (row, statut) => {
        setPayments((prev) => prev.map((p) => (p.id === row.id ? { ...p, statut } : p)));
        try {
            await api.patch(`/supplier-payments/${row.id}/statut`, { statut });
            loadPayments();
        } catch {
            loadPayments();
        }
    };

    const handleDelete = async (row) => {
        if (!window.confirm(`Supprimer le règlement ${row.reference} ?`)) return;
        try {
            await api.delete(`/supplier-payments/${row.id}`);
            loadPayments();
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de la suppression');
        }
    };

    const openImportModal = () => {
        setImportOpen(true);
        setImportSelected({});
        setImportLoading(true);
        api.get('/client-payments')
            .then((r) => {
                const rows = (r.data.data ?? []).filter((p) => p.statut !== 'Dévalidé');
                setImportRows(rows);
            })
            .catch(() => setImportRows([]))
            .finally(() => setImportLoading(false));
    };

    const toggleImportSelect = (id) => {
        setImportSelected((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleImportSelectAll = () => {
        const ids = importRows.map((r) => r.id);
        const allOn = ids.length > 0 && ids.every((id) => importSelected[id]);
        if (allOn) {
            setImportSelected({});
            return;
        }
        const next = {};
        ids.forEach((id) => { next[id] = true; });
        setImportSelected(next);
    };

    const applyImport = () => {
        const picked = importRows.filter((r) => importSelected[r.id]);
        if (!picked.length) return;

        const first = picked[0];
        const totalMontant = picked.reduce((sum, r) => sum + (Number(r.montant) || 0), 0);
        const refs = picked.map((r) => r.reference).join(', ');
        const clients = [...new Set(picked.map((r) => r.client).filter(Boolean))].join(' / ');

        setForm((f) => ({
            ...f,
            reglement: first.reglement || f.reglement,
            numero: first.numero || '',
            banque: first.banque || '',
            nom_tire: first.nom_tire || '',
            montant: totalMontant.toFixed(2),
            date_decaissement: first.date_decaissement_raw || f.date_decaissement,
            remarque: [f.remarque, `Import client: ${refs}${clients ? ` (${clients})` : ''}`].filter(Boolean).join(' — '),
        }));

        setImportOpen(false);
        setImportSelected({});
    };

    const handleSearch = (e) => {
        e?.preventDefault?.();
        setAppliedFilters({ ...filters });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.supplier_id) {
            setError('Sélectionnez un fournisseur');
            return;
        }

        const montant = montantReglement;
        if (montant <= 0) {
            setError('Saisissez un montant de règlement');
            return;
        }

        setSaving(true);
        try {
            if (editingId) {
                await api.put(`/supplier-payments/${editingId}`, {
                    payment_date: form.payment_date,
                    supplier_id: form.supplier_id,
                    reglement: form.reglement || null,
                    numero: form.numero || null,
                    banque: form.banque || null,
                    nom_tire: form.nom_tire || null,
                    montant,
                    date_decaissement: form.date_decaissement || null,
                    remarque: form.remarque || null,
                });
            } else {
                if (!selectedIds.length) {
                    setError('Sélectionnez au moins une commande à payer');
                    setSaving(false);
                    return;
                }
                await api.post('/supplier-payments', {
                    payment_date: form.payment_date,
                    supplier_id: form.supplier_id,
                    reglement: form.reglement || null,
                    numero: form.numero || null,
                    banque: form.banque || null,
                    nom_tire: form.nom_tire || null,
                    montant,
                    date_decaissement: form.date_decaissement || null,
                    remarque: form.remarque || null,
                    allocations: selectedIds.map((id) => {
                        const row = orders.find((o) => o.id === id);
                        const isSolde = row?.type === 'solde_initial' || id === SOLDE_INITIAL_ID;
                        return {
                            type: isSolde ? 'solde_initial' : 'order',
                            purchase_order_id: isSolde ? null : id,
                            amount: previewById[id]?.allocation ?? 0,
                            action: actions[id] || 'Payé',
                        };
                    }),
                });
            }
            closeForm();
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de la validation du règlement');
        } finally {
            setSaving(false);
        }
    };

    const months = useMemo(() => monthOptions(), []);

    /* ───────────── LIST VIEW ───────────── */
    if (view === 'list') {
        return (
            <div className="space-y-4">
                {error && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-800">{error}</div>
                )}

                <div className="flex flex-wrap items-center gap-2.5">
                    <button type="button" onClick={openNew} className="btn-primary">
                        <Plus className="w-4 h-4" />
                        Nouveau Règlement
                    </button>

                    <div className="ml-auto flex flex-wrap items-center gap-3">
                        <div className="relative overflow-hidden min-w-[150px] rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 shadow-lg shadow-blue-500/25 border border-white/10">
                            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10 blur-xl pointer-events-none" />
                            <div className="relative flex items-center gap-3 px-4 py-3">
                                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm text-white shrink-0">
                                    <Banknote className="w-4 h-4" strokeWidth={2.2} />
                                </div>
                                <div className="text-right min-w-0 flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/80">Total Règlement</p>
                                    <p className="text-lg font-bold tabular-nums leading-tight text-white tracking-tight">
                                        {formatMontant(summary.total_reglement)}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="relative overflow-hidden min-w-[150px] rounded-2xl bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 shadow-lg shadow-emerald-500/25 border border-white/10">
                            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10 blur-xl pointer-events-none" />
                            <div className="relative flex items-center gap-3 px-4 py-3">
                                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm text-white shrink-0">
                                    <Wallet className="w-4 h-4" strokeWidth={2.2} />
                                </div>
                                <div className="text-right min-w-0 flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/80">Total Décaissé</p>
                                    <p className="text-lg font-bold tabular-nums leading-tight text-white tracking-tight">
                                        {formatMontant(summary.total_decaisse)}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="relative overflow-hidden min-w-[150px] rounded-2xl bg-gradient-to-br from-red-500 via-rose-600 to-red-800 shadow-lg shadow-red-500/25 border border-white/10">
                            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10 blur-xl pointer-events-none" />
                            <div className="relative flex items-center gap-3 px-4 py-3">
                                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm text-white shrink-0">
                                    <AlertCircle className="w-4 h-4" strokeWidth={2.2} />
                                </div>
                                <div className="text-right min-w-0 flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/80">Total Impayé</p>
                                    <p className="text-lg font-bold tabular-nums leading-tight text-white tracking-tight">
                                        {formatMontant(summary.total_impaye)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="glass-card p-3 shadow-card border border-slate-200/60 dark:border-slate-700/60">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto] gap-2 items-end">
                        <Field label="Statut">
                            <select value={filters.statut} onChange={(e) => setFilter('statut', e.target.value)} className={filterClass}>
                                <option value="">Tous</option>
                                {STATUT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </Field>
                        <Field label="N° Régl">
                            <input type="text" value={filters.numero} onChange={(e) => setFilter('numero', e.target.value)} placeholder="N°" className={filterClass} />
                        </Field>
                        <Field label="Bnq">
                            <input type="text" value={filters.banque} onChange={(e) => setFilter('banque', e.target.value)} placeholder="Banque" className={filterClass} />
                        </Field>
                        <Field label="Montant">
                            <input type="number" step="0.01" value={filters.montant} onChange={(e) => setFilter('montant', e.target.value)} placeholder="0" className={filterClass} />
                        </Field>
                        <Field label="Mois">
                            <select value={filters.mois} onChange={(e) => setFilter('mois', e.target.value)} className={filterClass}>
                                <option value="">Tous</option>
                                {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </Field>
                        <div className="flex items-center gap-2">
                            <button type="submit" className="btn-primary justify-center flex-1 min-w-[120px]">
                                <Search className="w-4 h-4" />
                                Rechercher
                            </button>
                            <button
                                type="button"
                                title="Actualiser"
                                disabled={loadingList}
                                onClick={() => {
                                    setFilters(emptyFilters);
                                    setAppliedFilters({ ...emptyFilters });
                                }}
                                className="group relative h-[38px] w-[38px] shrink-0 rounded-xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/30 border border-white/20 hover:shadow-blue-500/45 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none"
                            >
                                <span className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <RefreshCw className={`relative w-4 h-4 mx-auto ${loadingList ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} strokeWidth={2.4} />
                            </button>
                        </div>
                    </div>
                </form>

                <div className="glass-card shadow-card border border-slate-200/60 dark:border-slate-700/60 rounded-2xl">
                    <div className="px-5 py-3.5 bg-gradient-to-r from-blue-600 via-blue-700 to-slate-800 border-b border-white/10 rounded-t-2xl">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wide">Tableau de consultation</h3>
                    </div>
                    <ScrollAreaWithArrows variant="table"
                        deps={[payments.length, loadingList, appliedFilters.statut, appliedFilters.mois]}
                    >
                        <table className="w-full text-sm min-w-[1100px]">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                                    {['Réf', 'Date', 'Fournisseur', 'Type', 'Nom de Tiré', 'N°', 'Bnq', 'Date Décaiss', 'Montant', 'Statut', 'Action'].map((h) => (
                                        <th key={h} className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap text-center">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loadingList ? (
                                    [...Array(4)].map((_, i) => (
                                        <tr key={i}>{[...Array(11)].map((__, j) => (
                                            <td key={j} className="px-3 py-3 text-center"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[80px]" /></td>
                                        ))}</tr>
                                    ))
                                ) : payments.length ? (
                                    payments.map((row) => (
                                        <tr key={row.id} className={`transition-colors ${statutRowClass(row.statut || 'Inst')}`}>
                                            <td className="px-3 py-2.5 text-center font-mono text-xs font-semibold text-brand-navy dark:text-blue-400">{row.reference}</td>
                                            <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.payment_date}</td>
                                            <td className="px-3 py-2.5 text-center font-medium text-slate-800 dark:text-white">{row.fournisseur || '—'}</td>
                                            <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.reglement || '—'}</td>
                                            <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.nom_tire || '—'}</td>
                                            <td className="px-3 py-2.5 text-center font-mono text-xs text-slate-600 dark:text-slate-300">{row.numero || '—'}</td>
                                            <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.banque || '—'}</td>
                                            <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.date_decaissement || '—'}</td>
                                            <td className="px-3 py-2.5 text-center font-semibold tabular-nums text-brand-navy dark:text-blue-300">{formatMontant(row.montant)}</td>
                                            <td className="px-3 py-2.5 text-center">
                                                <select
                                                    value={row.statut || 'Inst'}
                                                    onChange={(e) => handleStatutChange(row, e.target.value)}
                                                    className={`rounded-md border px-2 py-1 text-[11px] font-bold outline-none ${statutClass(row.statut || 'Inst')}`}
                                                >
                                                    {STATUT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center justify-center gap-0.5">
                                                    <ActionBtn title="Voir" icon={Eye} color="blue" onClick={() => setViewRow(row)} />
                                                    <ActionBtn title="Imprimer" icon={Printer} color="slate" onClick={() => openPrintable(row)} />
                                                    <ActionBtn title="Modifier" icon={Pencil} color="amber" onClick={() => openEdit(row)} />
                                                    <ActionBtn title="Supprimer" icon={Trash2} color="red" onClick={() => handleDelete(row)} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={11} className="px-4 py-12 text-center text-slate-400">Aucun règlement enregistré</td></tr>
                                )}
                            </tbody>
                        </table>
                    </ScrollAreaWithArrows>
                </div>

                <ViewModal row={viewRow} onClose={() => setViewRow(null)} />
            </div>
        );
    }

    /* ───────────── FORM VIEW (Nouveau / Modifier) ───────────── */
    return (
        <div className="space-y-4">
            <ImportReglModal
                open={importOpen}
                rows={importRows}
                selected={importSelected}
                loading={importLoading}
                onToggle={toggleImportSelect}
                onToggleAll={toggleImportSelectAll}
                onClose={() => setImportOpen(false)}
                onApply={applyImport}
            />

            <form onSubmit={handleSubmit} className="space-y-3">
                {error && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-800">{error}</div>
                )}

                <div className="flex flex-wrap items-center gap-2.5">
                    <button type="submit" disabled={saving} className="btn-primary">
                        <CheckCircle2 className="w-4 h-4" />
                        {saving ? 'Validation...' : 'Valider'}
                    </button>
                    <button type="button" onClick={closeForm} className="btn-danger">
                        <XCircle className="w-4 h-4" />
                        Fermer
                    </button>
                    {!editingId && (
                        <button type="button" onClick={openImportModal} className="btn-secondary">
                            <Download className="w-4 h-4" />
                            Importer Régl
                        </button>
                    )}
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                        {editingId ? `Modifier ${meta.next_ref}` : 'Nouveau Règlement'}
                    </span>

                    <div className="ml-auto flex flex-wrap items-center gap-3">
                        <div className="relative overflow-hidden min-w-[150px] rounded-2xl bg-gradient-to-br from-red-500 via-rose-600 to-red-800 shadow-lg shadow-red-500/25 border border-white/10">
                            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10 blur-xl pointer-events-none" />
                            <div className="relative flex items-center gap-3 px-4 py-3">
                                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm text-white shrink-0">
                                    <Receipt className="w-4 h-4" strokeWidth={2.2} />
                                </div>
                                <div className="text-right min-w-0 flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/80">Total TTC</p>
                                    <p className="text-lg font-bold tabular-nums leading-tight text-white tracking-tight">
                                        {formatMontant(selectedTotals.total_ttc)}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="relative overflow-hidden min-w-[150px] rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 shadow-lg shadow-amber-500/30 border border-white/10">
                            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/15 blur-xl pointer-events-none" />
                            <div className="relative flex items-center gap-3 px-4 py-3">
                                <div className="p-2 rounded-xl bg-white/25 backdrop-blur-sm text-amber-950 shrink-0">
                                    <Scale className="w-4 h-4" strokeWidth={2.2} />
                                </div>
                                <div className="text-right min-w-0 flex-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-950/70">Solde TTC</p>
                                    <p className="text-lg font-bold tabular-nums leading-tight text-amber-950 tracking-tight">
                                        {formatMontant(selectedTotals.solde_ttc)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-2.5 shadow-card border border-slate-200/60 dark:border-slate-700/60">
                    <ScrollAreaWithArrows variant="table">
                    <div className="grid grid-cols-[100px_88px_minmax(140px,1.3fr)_minmax(140px,1.2fr)_90px_minmax(130px,1.1fr)_minmax(110px,1fr)_95px_100px_minmax(120px,1fr)] gap-1.5 items-end min-w-[1280px]">
                        <Field label="Date">
                            <input type="date" required value={form.payment_date} onChange={(e) => set('payment_date', e.target.value)} className={inputClass} />
                        </Field>
                        <Field label="Réf Régl">
                            <input type="text" readOnly value={meta.next_ref || 'RF-0001'} className={readOnlyClass} />
                        </Field>
                        <Field label="Nom Fournisseur">
                            <select required value={form.supplier_id} onChange={(e) => set('supplier_id', e.target.value)} className={inputClass} disabled={!!editingId}>
                                <option value="">—</option>
                                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Type Rég">
                            <input
                                type="text"
                                list="rf-type-reglement"
                                maxLength={10}
                                value={form.reglement}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setForm((f) => ({
                                        ...f,
                                        reglement: value,
                                        ...(value.trim().toLowerCase() === 'esp' ? { numero: '', banque: '', nom_tire: '' } : {}),
                                    }));
                                }}
                                placeholder="Esp, Chq…"
                                className={inputClass}
                            />
                            <datalist id="rf-type-reglement">
                                {REGLEMENT_OPTIONS.filter(Boolean).map((v) => <option key={v} value={v} />)}
                            </datalist>
                        </Field>
                        <Field label="N° régl">
                            <input
                                type="text"
                                value={form.numero}
                                onChange={(e) => set('numero', e.target.value)}
                                placeholder="N°"
                                disabled={isEspReglement(form.reglement)}
                                className={isEspReglement(form.reglement) ? readOnlyClass : inputClass}
                            />
                        </Field>
                        <Field label="Banq">
                            <input
                                type="text"
                                list="rf-banque"
                                maxLength={100}
                                value={form.banque}
                                onChange={(e) => set('banque', e.target.value)}
                                placeholder="Banque"
                                disabled={isEspReglement(form.reglement)}
                                className={isEspReglement(form.reglement) ? readOnlyClass : inputClass}
                            />
                            <datalist id="rf-banque">
                                {BANQUE_OPTIONS.map((v) => <option key={v} value={v} />)}
                            </datalist>
                        </Field>
                        <Field label="Nom de Tiré">
                            <input
                                type="text"
                                value={form.nom_tire}
                                onChange={(e) => set('nom_tire', e.target.value)}
                                placeholder="Nom tiré"
                                disabled={isEspReglement(form.reglement)}
                                className={isEspReglement(form.reglement) ? readOnlyClass : inputClass}
                            />
                        </Field>
                        <Field label="Montant Régl">
                            <input type="number" step="0.01" min="0" value={form.montant} onChange={(e) => set('montant', e.target.value)} placeholder="0" className={inputClass} disabled={!!editingId} />
                        </Field>
                        <Field label="Date Décaiss">
                            <input type="date" value={form.date_decaissement} onChange={(e) => set('date_decaissement', e.target.value)} className={inputClass} />
                        </Field>
                        <Field label="Remarque">
                            <input type="text" value={form.remarque} onChange={(e) => set('remarque', e.target.value)} placeholder="Remarque" className={inputClass} />
                        </Field>
                    </div>
                </ScrollAreaWithArrows>
                </div>
            </form>

            {!editingId && (
                <div className="glass-card shadow-card border border-slate-200/60 dark:border-slate-700/60 rounded-2xl">
                    <div className="px-5 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-orange-700 border-b border-white/10 rounded-t-2xl">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wide">Commande à Payer :</h3>
                    </div>
                    <ScrollAreaWithArrows variant="table"
                        deps={[orders.length, loading, form.supplier_id, selectedIds.length]}
                    >
                        <table className="w-full text-sm min-w-[1100px]">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                                    {['N° Bon', 'Date Commande', 'Client Livré', 'Montant Bon', 'Montant Payé', 'Solde', 'Sélection', 'Action'].map((h) => (
                                        <th key={h} className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap text-center">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    [...Array(3)].map((_, i) => (
                                        <tr key={i}>{[...Array(8)].map((__, j) => (
                                            <td key={j} className="px-3 py-3 text-center"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[80px]" /></td>
                                        ))}</tr>
                                    ))
                                ) : !form.supplier_id ? (
                                    <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Sélectionnez un fournisseur</td></tr>
                                ) : orders.length ? (
                                    <>
                                        <tr className="bg-slate-50/70 dark:bg-slate-800/40">
                                            <td colSpan={6} className="px-3 py-2 text-xs text-slate-500">Tout sélectionner</td>
                                            <td className="px-3 py-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={orders.length > 0 && selectedIds.length === orders.length}
                                                    onChange={toggleSelectAll}
                                                    className="rounded border-slate-300 text-brand-navy focus:ring-brand-navy"
                                                />
                                            </td>
                                            <td />
                                        </tr>
                                        {orders.map((row) => {
                                            const shown = displayRow(row);
                                            const isSolde = row.type === 'solde_initial';
                                            return (
                                                <tr key={row.id} className={`hover:bg-orange-50/40 dark:hover:bg-slate-800/40 transition-colors ${selected[row.id] ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''} ${isSolde ? 'bg-sky-50/60 dark:bg-sky-950/20' : ''}`}>
                                                    <td className={`px-3 py-2.5 text-center font-mono text-xs font-semibold ${isSolde ? 'text-sky-700 dark:text-sky-300' : 'text-brand-navy dark:text-orange-400'}`}>{row.reference}</td>
                                                    <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.order_date}</td>
                                                    <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.client_livre || '—'}</td>
                                                    <td className="px-3 py-2.5 text-center font-semibold tabular-nums text-brand-navy dark:text-orange-400">{formatMontant(row.montant_bon)}</td>
                                                    <td className={`px-3 py-2.5 text-center tabular-nums font-semibold ${shown.isPreview ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                                        {formatMontant(shown.montant_paye)}
                                                    </td>
                                                    <td className={`px-3 py-2.5 text-center font-semibold tabular-nums ${Number(shown.solde) !== 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>
                                                        {formatMontant(shown.solde)}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!selected[row.id]}
                                                            onChange={() => toggleSelect(row.id)}
                                                            className="rounded border-slate-300 text-brand-navy focus:ring-brand-navy"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <div className="flex flex-wrap items-center justify-center gap-1">
                                                            {ACTION_OPTIONS.map((opt) => (
                                                                <button
                                                                    key={opt.value}
                                                                    type="button"
                                                                    onClick={() => setAction(row.id, opt.value)}
                                                                    className={(actions[row.id] || row.payment_action) === opt.value
                                                                        ? opt.activeClass
                                                                        : 'btn-action-idle'
                                                                    }
                                                                >
                                                                    {opt.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </>
                                ) : (
                                    <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Aucune commande pour ce fournisseur</td></tr>
                                )}
                            </tbody>
                        </table>
                    </ScrollAreaWithArrows>
                </div>
            )}
        </div>
    );
}
