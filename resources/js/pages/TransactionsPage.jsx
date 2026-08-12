import { useCallback, useEffect, useState } from 'react';
import {
    Save, Eye, Pencil, Trash2, Printer, X, RefreshCw, Plus, Search,
    ArrowDownCircle, Scale, Wallet, User, Building2,
} from 'lucide-react';
import api from '../lib/api';
import ScrollAreaWithArrows from '../components/ScrollAreaWithArrows';

const COFFRE_OPTIONS = ['', 'Caisse', 'Cmpt Pers', 'Cmpt Ste'];
const STATUT_OPTIONS = ['', 'Sortie', 'Entrée'];
const TYPE_OPTIONS = ['', 'Esp', 'Chq', 'Eff', 'Vir', 'Vers'];

const COFFRE_FILTER_OPTIONS = [
    { value: '', label: 'Tous' },
    { value: 'Caisse', label: 'Caisse' },
    { value: 'Cmpt Pers', label: 'Cmpt Pers' },
    { value: 'Cmpt Ste', label: 'Cmpt Ste' },
];

const STATUT_FILTER_OPTIONS = [
    { value: '', label: 'Tous' },
    { value: 'Sortie', label: 'Sortie' },
    { value: 'Entrée', label: 'Entrée' },
];

const SUMMARY_CARDS = [
    {
        key: 'total_debit',
        label: 'Total Débit',
        gradient: 'from-blue-600 via-brand-navy to-slate-900',
        glow: 'rgba(30, 58, 95, 0.45)',
        icon: ArrowDownCircle,
    },
    {
        key: 'total_caisse',
        label: 'Total Caisse',
        gradient: 'from-emerald-500 via-green-600 to-teal-800',
        glow: 'rgba(16, 185, 129, 0.4)',
        icon: Wallet,
    },
    {
        key: 'total_cmpt_pers',
        label: 'Total Cmpt Pers',
        gradient: 'from-violet-500 via-purple-600 to-indigo-900',
        glow: 'rgba(139, 92, 246, 0.4)',
        icon: User,
    },
    {
        key: 'total_cmpt_ste',
        label: 'Total Ste',
        gradient: 'from-amber-500 via-orange-500 to-orange-700',
        glow: 'rgba(249, 115, 22, 0.4)',
        icon: Building2,
    },
    {
        key: 'solde',
        label: 'Solde',
        dynamic: true,
        icon: Scale,
    },
];

const emptyFilters = {
    date_from: '',
    date_to: '',
    statut: '',
    coffre: '',
};

const emptyForm = {
    transaction_date: '',
    coffre: '',
    statut: '',
    type_reglement: '',
    amount: '',
    beneficiary: '',
    motif: '',
};

function Field({ label, children, compact = false }) {
    return (
        <div>
            <label className={`field-label ${compact ? 'field-label-compact' : ''}`}>
                {label}
            </label>
            {children}
        </div>
    );
}

const inputClass = 'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2 py-1.5 text-xs text-center outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy transition-all min-w-0';
const inputCompact = `${inputClass} py-1 text-[11px]`;
const filterClass = 'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy';

function formatMontant(value) {
    const n = Math.round(Number(value) || 0);
    return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}.Fcfa`;
}

function isSortie(value) {
    return value === 'Sortie' || value === 'Débit';
}

function SummaryCard({ label, value, gradient, glow, icon: Icon }) {
    return (
        <div
            className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient} p-4 shadow-lg text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl`}
            style={{ boxShadow: `0 10px 28px -8px ${glow}` }}
        >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10 pointer-events-none" />
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/10 blur-2xl transition-transform duration-300 group-hover:scale-110" />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/25" />
            <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/85">{label}</p>
                    <p className="mt-1.5 text-lg sm:text-xl font-bold tabular-nums leading-tight">{formatMontant(value)}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm shrink-0">
                    <Icon className="w-5 h-5" strokeWidth={2} />
                </div>
            </div>
        </div>
    );
}

function StatutBadge({ value }) {
    const sortie = isSortie(value);
    return (
        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${sortie ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'}`}>
            {value || '—'}
        </span>
    );
}

function ActionBtn({ title, onClick, icon: Icon, color = 'slate' }) {
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

function buildPrintHtml(row) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Transaction</title>
<style>body{font-family:Arial,sans-serif;padding:28px;color:#1e293b}h1{color:#1e3a5f;font-size:18px;margin-bottom:16px}
table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:8px 10px;font-size:12px;text-align:left}
th{background:#f8fafc;width:140px;font-weight:700}</style></head><body>
<h1>STE SOCIMPRO — Transaction</h1>
<table>
<tr><th>Date</th><td>${row.transaction_date || '—'}</td></tr>
<tr><th>Bénéficiaire</th><td>${row.beneficiary || '—'}</td></tr>
<tr><th>Montant</th><td><strong>${formatMontant(row.amount)}</strong></td></tr>
<tr><th>Coffre</th><td>${row.coffre || '—'}</td></tr>
<tr><th>Type</th><td>${row.type_reglement || '—'}</td></tr>
<tr><th>Statut</th><td>${row.statut || '—'}</td></tr>
<tr><th>Motif</th><td>${row.motif || '—'}</td></tr>
</table></body></html>`;
}

function openPrintable(row) {
    const win = window.open('', '_blank', 'width=700,height=500');
    if (!win) return;
    win.document.write(buildPrintHtml(row));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
}

function buildPrintListHtml(rows, summary, filters) {
    const filterParts = [];
    if (filters.date_from) filterParts.push(`Du ${filters.date_from}`);
    if (filters.date_to) filterParts.push(`Au ${filters.date_to}`);
    if (filters.statut) filterParts.push(`Statut: ${filters.statut}`);
    if (filters.coffre) filterParts.push(`Coffre: ${filters.coffre}`);
    const filterLabel = filterParts.length ? filterParts.join(' · ') : 'Toutes les transactions';

    const bodyRows = rows.map((row) => `
<tr>
<td>${row.transaction_date || '—'}</td>
<td>${row.beneficiary || '—'}</td>
<td class="num">${formatMontant(row.amount)}</td>
<td>${row.coffre || '—'}</td>
<td>${row.type_reglement || '—'}</td>
<td>${row.statut || '—'}</td>
<td class="left">${row.motif || '—'}</td>
</tr>`).join('');

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Transactions</title>
<style>
@page { size: A4 landscape; margin: 10mm; }
body { font-family: Arial, sans-serif; font-size: 10px; color: #1e293b; }
h1 { font-size: 16px; color: #1e3a5f; margin-bottom: 4px; }
.sub { font-size: 9px; color: #64748b; margin-bottom: 12px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #e2e8f0; padding: 5px 6px; text-align: center; }
th { background: #1e3a5f; color: #fff; font-weight: 700; font-size: 8px; text-transform: uppercase; }
td.left { text-align: left; }
td.num { text-align: right; white-space: nowrap; }
tbody tr:nth-child(even) { background: #f8fafc; }
.totals { margin-top: 12px; width: 280px; margin-left: auto; }
.totals td { font-size: 10px; padding: 6px 8px; }
.totals td:first-child { font-weight: 600; color: #64748b; text-align: left; }
.totals td:last-child { text-align: right; font-weight: 700; }
.totals tr:last-child td { background: #1e3a5f; color: #fff; }
.footer { margin-top: 14px; font-size: 8px; color: #94a3b8; text-align: center; }
</style></head><body>
<h1>STE SOCIMPRO — Liste des transactions</h1>
<p class="sub">${filterLabel} · Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
<table>
<thead><tr>
<th>Date</th><th>Bénéficiaire</th><th>Montant</th><th>Coffre</th><th>Type</th><th>Statut</th><th>Motif</th>
</tr></thead>
<tbody>${bodyRows || '<tr><td colspan="7">Aucune transaction</td></tr>'}</tbody>
</table>
<table class="totals">
<tr><td>Total Débit</td><td>${formatMontant(summary.total_debit)}</td></tr>
<tr><td>Total Caisse</td><td>${formatMontant(summary.total_caisse)}</td></tr>
<tr><td>Total Cmpt Pers</td><td>${formatMontant(summary.total_cmpt_pers)}</td></tr>
<tr><td>Total Ste</td><td>${formatMontant(summary.total_cmpt_ste)}</td></tr>
<tr><td>Solde</td><td>${formatMontant(summary.solde)}</td></tr>
</table>
<p class="footer">© STE SOCIMPRO — ${rows.length} transaction(s)</p>
</body></html>`;
}

function openPrintList(rows, summary, filters) {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(buildPrintListHtml(rows, summary, filters));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
}

function ViewModal({ row, onClose }) {
    if (!row) return null;
    const fields = [
        ['Date', row.transaction_date],
        ['Bénéficiaire', row.beneficiary],
        ['Montant', formatMontant(row.amount)],
        ['Coffre', row.coffre],
        ['Type', row.type_reglement],
        ['Statut', row.statut],
        ['Motif', row.motif],
    ];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-brand-navy to-blue-800">
                    <h3 className="text-white font-bold text-sm">Détail transaction</h3>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5 space-y-2 text-sm max-h-[60vh] overflow-y-auto">
                    {fields.map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                            <span className="text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
                            <span className="font-medium text-slate-800 dark:text-white text-right">{value || '—'}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function TransactionsPage() {
    const [form, setForm] = useState(emptyForm);
    const [filters, setFilters] = useState(emptyFilters);
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState({
        total_debit: 0,
        total_caisse: 0,
        total_cmpt_pers: 0,
        total_cmpt_ste: 0,
        solde: 0,
    });
    const [meta, setMeta] = useState({ date: '—' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [viewRow, setViewRow] = useState(null);

    const load = useCallback(() => {
        setLoading(true);
        const params = { all: 1, ...filters };
        Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });

        api.get('/transactions', { params })
            .then((res) => {
                setRows(res.data.data ?? []);
                setSummary(res.data.summary ?? {
                    total_debit: 0,
                    total_caisse: 0,
                    total_cmpt_pers: 0,
                    total_cmpt_ste: 0,
                    solde: 0,
                });
                setMeta(res.data.meta ?? { date: '—' });
            })
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, [filters]);

    useEffect(() => {
        setForm((f) => ({ ...f, transaction_date: new Date().toISOString().slice(0, 10) }));
        load();
    }, [load]);

    const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
    const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

    const resetForm = () => {
        setForm({ ...emptyForm, transaction_date: new Date().toISOString().slice(0, 10) });
        setEditingId(null);
        setError('');
        load();
    };

    const fillForm = (row) => {
        setForm({
            transaction_date: row.transaction_date_raw || '',
            coffre: row.coffre || '',
            statut: row.statut || '',
            type_reglement: row.type_reglement || '',
            amount: row.amount ?? '',
            beneficiary: row.beneficiary || '',
            motif: row.motif || '',
        });
        setEditingId(row.id);
        setError('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const buildPayload = () => ({
        transaction_date: form.transaction_date || new Date().toISOString().slice(0, 10),
        coffre: form.coffre,
        statut: form.statut,
        type_reglement: form.type_reglement || null,
        amount: parseFloat(form.amount) || 0,
        beneficiary: form.beneficiary,
        motif: form.motif || null,
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            const payload = buildPayload();
            if (editingId) {
                await api.put(`/transactions/${editingId}`, payload);
            } else {
                await api.post('/transactions', payload);
            }
            resetForm();
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (row) => {
        if (!window.confirm(`Supprimer la transaction de ${formatMontant(row.amount)} pour « ${row.beneficiary} » ?`)) return;
        try {
            await api.delete(`/transactions/${row.id}`);
            if (editingId === row.id) resetForm();
            else load();
        } catch {
            setError('Impossible de supprimer cette transaction');
        }
    };

    const soldePositive = summary.solde >= 0;

    return (
        <div className="space-y-4">
            <ViewModal row={viewRow} onClose={() => setViewRow(null)} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {SUMMARY_CARDS.map((card) => {
                    const gradient = card.dynamic
                        ? (soldePositive
                            ? 'from-cyan-500 via-sky-600 to-blue-800'
                            : 'from-fuchsia-500 via-pink-600 to-rose-800')
                        : card.gradient;
                    const glow = card.dynamic
                        ? (soldePositive ? 'rgba(14, 165, 233, 0.42)' : 'rgba(219, 39, 119, 0.4)')
                        : card.glow;

                    return (
                        <SummaryCard
                            key={card.key}
                            label={card.label}
                            value={summary[card.key] ?? 0}
                            gradient={gradient}
                            glow={glow}
                            icon={card.icon}
                        />
                    );
                })}
            </div>

            <form onSubmit={handleSubmit} className="glass-card p-4 lg:p-5 shadow-card border border-slate-200/60 dark:border-slate-700/60">
                {error && (
                    <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-800">{error}</div>
                )}
                {editingId && (
                    <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-medium border border-amber-200 dark:border-amber-800">
                        Mode modification — Mettez à jour puis validez
                    </div>
                )}

                <ScrollAreaWithArrows>
                    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid xl:grid-cols-[112px_0.55fr_0.32fr_0.3fr_0.42fr_0.95fr_2.65fr_auto_auto] gap-2 items-end min-w-[980px]">
                        <Field label="Date" compact>
                            <input type="date" required value={form.transaction_date} onChange={(e) => set('transaction_date', e.target.value)} className={`${inputCompact} text-[12px] py-1.5`} />
                        </Field>
                        <Field label="Coffre" compact>
                            <select required value={form.coffre} onChange={(e) => set('coffre', e.target.value)} className={`${inputCompact} max-w-[108px] mx-auto`}>
                                {COFFRE_OPTIONS.map((v) => <option key={v || 'e'} value={v}>{v || '—'}</option>)}
                            </select>
                        </Field>
                        <Field label="Statut" compact>
                            <select required value={form.statut} onChange={(e) => set('statut', e.target.value)} className={`${inputCompact} max-w-[68px] mx-auto text-[10px] px-1`}>
                                {STATUT_OPTIONS.map((v) => <option key={v || 'e'} value={v}>{v || '—'}</option>)}
                            </select>
                        </Field>
                        <Field label="Type" compact>
                            <select value={form.type_reglement} onChange={(e) => set('type_reglement', e.target.value)} className={`${inputCompact} max-w-[56px] mx-auto text-[10px] px-1`}>
                                {TYPE_OPTIONS.map((v) => <option key={v || 'e'} value={v}>{v || '—'}</option>)}
                            </select>
                        </Field>
                        <Field label="Montant" compact>
                            <input type="number" step="0.01" min="0.01" required value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" className={`${inputCompact} max-w-[72px] mx-auto text-[10px] px-1`} />
                        </Field>
                        <Field label="Bénéficiaire">
                            <input type="text" required value={form.beneficiary} onChange={(e) => set('beneficiary', e.target.value)} placeholder="Bénéficiaire" className={inputClass} />
                        </Field>
                        <Field label="Motif">
                            <input type="text" value={form.motif} onChange={(e) => set('motif', e.target.value)} placeholder="Cause de la transaction" className={`${inputClass} min-w-0 w-full`} />
                        </Field>
                        <button type="submit" disabled={saving} className="btn-primary text-xs h-[34px] px-3 self-end whitespace-nowrap">
                            <Save className="w-3.5 h-3.5" />
                            {saving ? '...' : 'Valider'}
                        </button>
                        <button type="button" onClick={resetForm} className="inline-flex items-center justify-center w-8 h-8 self-end rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors" title="Nouvelle transaction">
                            <Plus className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                    </div>
                </ScrollAreaWithArrows>
            </form>

            <div className="glass-card p-4 shadow-card border border-slate-200/60 dark:border-slate-700/60">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_0.9fr_0.9fr_auto_auto] gap-2.5 items-end">
                    <Field label="Date du">
                        <input type="date" value={filters.date_from} onChange={(e) => setFilter('date_from', e.target.value)} className={filterClass} />
                    </Field>
                    <Field label="Date au">
                        <input type="date" value={filters.date_to} onChange={(e) => setFilter('date_to', e.target.value)} className={filterClass} />
                    </Field>
                    <Field label="Statut">
                        <select value={filters.statut} onChange={(e) => setFilter('statut', e.target.value)} className={filterClass}>
                            {STATUT_FILTER_OPTIONS.map((o) => (
                                <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Coffre">
                        <select value={filters.coffre} onChange={(e) => setFilter('coffre', e.target.value)} className={filterClass}>
                            {COFFRE_FILTER_OPTIONS.map((o) => (
                                <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                    </Field>
                    <button type="button" onClick={load} className="btn-secondary text-xs h-[34px] px-4 self-end">
                        <Search className="w-3.5 h-3.5" /> Rechercher
                    </button>
                    <button type="button" onClick={() => openPrintList(rows, summary, filters)} disabled={!rows.length} className="btn-secondary text-xs h-[34px] px-4 self-end disabled:opacity-50">
                        <Printer className="w-3.5 h-3.5" /> Imprimer
                    </button>
                </div>
            </div>

            <div className="glass-card overflow-hidden shadow-card border border-slate-200/60 dark:border-slate-700/60">
                <div className="px-5 py-3.5 bg-gradient-to-r from-brand-navy via-blue-800 to-indigo-900 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Transaction et Charges</h3>
                    <button type="button" onClick={load} disabled={loading} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Actualiser">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <ScrollAreaWithArrows maxHeight="min(55vh, 520px)" deps={[rows.length, loading]}>
                    <table className="w-full text-sm min-w-[900px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                                {['Date', 'Bénéficiaire', 'Montant', 'Coffre', 'Type', 'Statut', 'Motif', 'Actions'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap text-center">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                [...Array(4)].map((_, i) => (
                                    <tr key={i}>{[...Array(8)].map((__, j) => (
                                        <td key={j} className="px-4 py-3 text-center"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[80px]" /></td>
                                    ))}</tr>
                                ))
                            ) : rows.length ? (
                                rows.map((row) => (
                                    <tr key={row.id} className={`hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors ${editingId === row.id ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''}`}>
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.transaction_date}</td>
                                        <td className="px-4 py-2.5 text-center font-medium text-slate-800 dark:text-white">{row.beneficiary || '—'}</td>
                                        <td className={`px-4 py-2.5 text-center font-semibold tabular-nums ${isSortie(row.statut) ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                            {formatMontant(row.amount)}
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{row.coffre || '—'}</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.type_reglement || '—'}</td>
                                        <td className="px-4 py-2.5 text-center"><StatutBadge value={row.statut} /></td>
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300 max-w-[200px] truncate" title={row.motif}>{row.motif || '—'}</td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center justify-center gap-0.5">
                                                <ActionBtn title="Voir" icon={Eye} color="blue" onClick={() => setViewRow(row)} />
                                                <ActionBtn title="Modifier" icon={Pencil} color="amber" onClick={() => fillForm(row)} />
                                                <ActionBtn title="Imprimer" icon={Printer} color="slate" onClick={() => openPrintable(row)} />
                                                <ActionBtn title="Supprimer" icon={Trash2} color="red" onClick={() => handleDelete(row)} />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Aucune transaction enregistrée</td></tr>
                            )}
                        </tbody>
                    </table>
                </ScrollAreaWithArrows>
            </div>
        </div>
    );
}
