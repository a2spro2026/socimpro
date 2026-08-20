import { useCallback, useEffect, useState } from 'react';
import {
    Plus, Eye, Pencil, Trash2, Printer, FileText, X, RefreshCw, Wallet, Scale,
} from 'lucide-react';
import api from '../lib/api';
import ScrollAreaWithArrows from '../components/ScrollAreaWithArrows';

const TYPE_OPTIONS = ['', 'Esp', 'Chq', 'Eff', 'Vir', 'Vers'];
const BANQUE_OPTIONS = [
    '', 'Attijariwafa', 'BMCE', 'Banque Populaire', 'CIH', 'SGMB',
    'Crédit Agricole', 'CDM', 'Al Barid Bank', 'Autre',
];

const emptyForm = {
    charge_date: '',
    designation: '',
    beneficiaire: '',
    type_reglement: '',
    numero: '',
    banque: '',
    nom_tire: '',
    montant: '',
    date_decaissement: '',
    remarque: '',
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
    'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2.5 py-2 text-xs text-center outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy transition-all';
const readOnlyClass =
    'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 px-2.5 py-2 text-xs text-center cursor-not-allowed';

function formatMontant(value) {
    const n = Math.round(Number(value) || 0);
    return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}.Fcfa`;
}

function ActionBtn({ title, icon: Icon, color = 'slate', onClick }) {
    const colors = {
        blue: 'hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400',
        amber: 'hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/30 dark:hover:text-amber-400',
        red: 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400',
        orange: 'hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/30 dark:hover:text-orange-400',
        slate: 'hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200',
    };
    return (
        <button type="button" title={title} onClick={onClick} className={`p-1.5 rounded-lg text-slate-400 transition-colors ${colors[color]}`}>
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
    );
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

function buildPrintHtml(row) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Charge ${row.reference || ''}</title>
<style>body{font-family:Arial,sans-serif;padding:32px;color:#1e293b}h1{color:#1e3a5f;font-size:22px}
table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #e2e8f0;padding:8px;font-size:12px;text-align:center}
th{background:#f8fafc;font-weight:700}.badge{background:#dbeafe;color:#1d4ed8;padding:4px 10px;border-radius:999px;font-weight:700}
</style></head><body>
<h1>STE SOCIMPRO — Bon Charge <span class="badge">${row.reference || ''}</span></h1>
<table>
<tr><th>Date</th><td>${row.charge_date || '—'}</td><th>Réf</th><td>${row.reference || '—'}</td></tr>
<tr><th>Désignation</th><td>${row.designation || '—'}</td><th>Bénéficiaire</th><td>${row.beneficiaire || '—'}</td></tr>
<tr><th>Type Rég</th><td>${row.type_reglement || '—'}</td><th>N°</th><td>${row.numero || '—'}</td></tr>
<tr><th>Banque</th><td>${row.banque || '—'}</td><th>Tiré</th><td>${row.nom_tire || '—'}</td></tr>
<tr><th>Montant</th><td><strong>${formatMontant(row.montant)}</strong></td><th>Date Décaiss</th><td>${row.date_decaissement || '—'}</td></tr>
<tr><th>Remarque</th><td colspan="3">${row.remarque || '—'}</td></tr>
</table>
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
        ['Date', row.charge_date],
        ['Désignation', row.designation],
        ['Bénéficiaire', row.beneficiaire],
        ['Type Rég', row.type_reglement],
        ['N°', row.numero],
        ['Banque', row.banque],
        ['Tiré', row.nom_tire],
        ['Montant', formatMontant(row.montant)],
        ['Date Décaiss', row.date_decaissement],
        ['Remarque', row.remarque],
    ];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-teal-600 to-cyan-800">
                    <div>
                        <p className="text-[10px] text-teal-100 uppercase tracking-wider">Bon Charge</p>
                        <h3 className="text-white font-bold">{row.reference}</h3>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5 grid grid-cols-2 gap-3 text-sm max-h-[65vh] overflow-y-auto">
                    {fields.map(([label, value]) => (
                        <div key={label} className={label === 'Remarque' || label === 'Désignation' ? 'col-span-2' : ''}>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
                            <p className="font-medium text-slate-800 dark:text-slate-100">{value || '—'}</p>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <button type="button" onClick={() => openPrintable(row)} className="btn-secondary text-xs flex-1">
                        <Printer className="w-3.5 h-3.5" /> Imprimer
                    </button>
                    <button type="button" onClick={() => openPrintable(row)} className="btn-primary text-xs flex-1">
                        <FileText className="w-3.5 h-3.5" /> PDF
                    </button>
                </div>
            </div>
        </div>
    );
}

function FormModal({ open, form, meta, editingId, saving, error, onChange, onTypeChange, onClose, onSubmit }) {
    if (!open) return null;
    const isEsp = form.type_reglement === 'Esp';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-teal-600 via-cyan-700 to-slate-800">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wide">
                        {editingId ? `Modifier Charge ${form._ref || ''}` : 'Nouveau Bon Charge'}
                    </h3>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-5 space-y-4">
                    {error && (
                        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-800">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        <Field label="Date">
                            <input type="date" required value={form.charge_date} onChange={(e) => onChange('charge_date', e.target.value)} className={inputClass} />
                        </Field>
                        <Field label="Réf">
                            <input type="text" readOnly value={editingId ? (form._ref || '') : (meta.next_ref || 'CH-0001')} className={readOnlyClass} />
                        </Field>
                        <Field label="Désignation">
                            <input type="text" value={form.designation} onChange={(e) => onChange('designation', e.target.value)} placeholder="Désignation" className={inputClass} />
                        </Field>
                        <Field label="Bénéficiaire">
                            <input type="text" required value={form.beneficiaire} onChange={(e) => onChange('beneficiaire', e.target.value)} placeholder="Bénéficiaire" className={inputClass} />
                        </Field>
                        <Field label="Type">
                            <select value={form.type_reglement} onChange={(e) => onTypeChange(e.target.value)} className={inputClass}>
                                {TYPE_OPTIONS.map((v) => <option key={v || 't'} value={v}>{v || '—'}</option>)}
                            </select>
                        </Field>
                        <Field label="N°">
                            <input
                                type="text"
                                value={form.numero}
                                onChange={(e) => onChange('numero', e.target.value)}
                                placeholder="N°"
                                disabled={isEsp}
                                className={isEsp ? readOnlyClass : inputClass}
                            />
                        </Field>
                        <Field label="Bnq">
                            <select
                                value={form.banque}
                                onChange={(e) => onChange('banque', e.target.value)}
                                disabled={isEsp}
                                className={isEsp ? readOnlyClass : inputClass}
                            >
                                {BANQUE_OPTIONS.map((v) => <option key={v || 'b'} value={v}>{v || '—'}</option>)}
                            </select>
                        </Field>
                        <Field label="Tiré">
                            <input
                                type="text"
                                value={form.nom_tire}
                                onChange={(e) => onChange('nom_tire', e.target.value)}
                                placeholder="Nom tiré"
                                disabled={isEsp}
                                className={isEsp ? readOnlyClass : inputClass}
                            />
                        </Field>
                        <Field label="Montant">
                            <input type="number" step="0.01" min="0" required value={form.montant} onChange={(e) => onChange('montant', e.target.value)} placeholder="0.00" className={inputClass} />
                        </Field>
                        <Field label="Date Décaiss">
                            <input type="date" value={form.date_decaissement} onChange={(e) => onChange('date_decaissement', e.target.value)} className={inputClass} />
                        </Field>
                        <div className="col-span-2 sm:col-span-3 lg:col-span-2">
                            <Field label="Remarque">
                                <input type="text" value={form.remarque} onChange={(e) => onChange('remarque', e.target.value)} placeholder="Remarque" className={inputClass} />
                            </Field>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" onClick={onClose} className="btn-secondary text-xs px-4">
                            Fermer
                        </button>
                        <button type="submit" disabled={saving} className="btn-primary text-xs px-4">
                            {saving ? '...' : 'Valider'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function ChargesPage() {
    const [rows, setRows] = useState([]);
    const [summary, setSummary] = useState({ total_charge: 0, solde_charge: 0 });
    const [meta, setMeta] = useState({ next_ref: 'CH-0001', date_raw: '' });
    const [form, setForm] = useState(emptyForm);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [viewRow, setViewRow] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const loadMeta = useCallback(() => {
        api.get('/charges/meta')
            .then((r) => setMeta(r.data ?? { next_ref: 'CH-0001', date_raw: '' }))
            .catch(() => {});
    }, []);

    const load = useCallback(() => {
        setLoading(true);
        api.get('/charges')
            .then((r) => {
                setRows(r.data.data ?? []);
                setSummary({
                    total_charge: Number(r.data.meta?.total_charge) || 0,
                    solde_charge: Number(r.data.meta?.solde_charge) || 0,
                });
            })
            .catch(() => {
                setRows([]);
                setSummary({ total_charge: 0, solde_charge: 0 });
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        loadMeta();
        load();
    }, [load, loadMeta]);

    const onChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));

    const onTypeChange = (value) => {
        setForm((f) => ({
            ...f,
            type_reglement: value,
            ...(value === 'Esp' ? { numero: '', banque: '', nom_tire: '' } : {}),
        }));
    };

    const openNouveau = () => {
        const today = meta.date_raw || new Date().toISOString().slice(0, 10);
        setForm({ ...emptyForm, charge_date: today, date_decaissement: today, _ref: '' });
        setEditingId(null);
        setError('');
        loadMeta();
        setModalOpen(true);
    };

    const openEdit = (row) => {
        setForm({
            charge_date: row.charge_date_raw || '',
            designation: row.designation || '',
            beneficiaire: row.beneficiaire || '',
            type_reglement: row.type_reglement || '',
            numero: row.numero || '',
            banque: row.banque || '',
            nom_tire: row.nom_tire || '',
            montant: row.montant ?? '',
            date_decaissement: row.date_decaissement_raw || '',
            remarque: row.remarque || '',
            _ref: row.reference || '',
        });
        setEditingId(row.id);
        setError('');
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingId(null);
        setError('');
        setForm(emptyForm);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            const payload = {
                charge_date: form.charge_date,
                designation: form.designation || null,
                beneficiaire: form.beneficiaire,
                type_reglement: form.type_reglement || null,
                numero: form.numero || null,
                banque: form.banque || null,
                nom_tire: form.nom_tire || null,
                montant: parseFloat(form.montant) || 0,
                date_decaissement: form.date_decaissement || null,
                remarque: form.remarque || null,
            };
            if (editingId) {
                await api.put(`/charges/${editingId}`, payload);
            } else {
                await api.post('/charges', payload);
            }
            closeModal();
            load();
            loadMeta();
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (row) => {
        if (!window.confirm(`Supprimer la charge ${row.reference} ?`)) return;
        try {
            await api.delete(`/charges/${row.id}`);
            if (editingId === row.id) closeModal();
            load();
            loadMeta();
        } catch {
            setError('Impossible de supprimer cette charge');
        }
    };

    const headers = ['Date', 'Réf', 'Désignation', 'Bénéficiaire', 'Type Rég', 'N°', 'Bnq', 'Tiré', 'Date Décaiss', 'Remarque', 'Actions'];

    return (
        <div className="space-y-4">
            <ViewModal row={viewRow} onClose={() => setViewRow(null)} />
            <FormModal
                open={modalOpen}
                form={form}
                meta={meta}
                editingId={editingId}
                saving={saving}
                error={error}
                onChange={onChange}
                onTypeChange={onTypeChange}
                onClose={closeModal}
                onSubmit={handleSubmit}
            />

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Charge</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Bons de charge et décaissements</p>
                </div>
                <button type="button" onClick={openNouveau} className="btn-primary text-sm self-start sm:self-auto">
                    <Plus className="w-4 h-4" /> Nouveau
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                <SummaryCard
                    label="Total Charge"
                    value={summary.total_charge}
                    gradient="from-teal-600 via-cyan-700 to-slate-800"
                    glow="rgba(13, 148, 136, 0.45)"
                    icon={Wallet}
                />
                <SummaryCard
                    label="Solde Charge"
                    value={summary.solde_charge}
                    gradient="from-amber-500 via-orange-500 to-orange-700"
                    glow="rgba(249, 115, 22, 0.4)"
                    icon={Scale}
                />
            </div>

            <div className="glass-card rounded-2xl shadow-card border border-slate-200/60 dark:border-slate-700/60">
                <div className="px-5 py-3.5 bg-gradient-to-r from-teal-600 via-cyan-700 to-slate-800 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Liste des Charges</h3>
                    <button type="button" onClick={load} disabled={loading} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="Actualiser">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <ScrollAreaWithArrows variant="table" deps={[rows.length, loading]}>
                    <table className="w-full text-sm min-w-[1200px]">
                        <thead className="sticky top-0 z-10">                            <tr className="bg-gradient-to-r from-slate-100 via-slate-200/90 to-slate-100 dark:from-slate-800 dark:via-slate-700/80 dark:to-slate-800 border-b-2 border-slate-300 dark:border-slate-600">
                                {headers.map((h) => (
                                    <th key={h} className="px-3 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300 whitespace-nowrap text-center">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                [...Array(4)].map((_, i) => (
                                    <tr key={i}>
                                        {[...Array(11)].map((__, j) => (
                                            <td key={j} className="px-3 py-3 text-center">
                                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[80px]" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : rows.length ? (
                                rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-teal-50/40 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.charge_date || '—'}</td>
                                        <td className="px-3 py-2.5 text-center font-mono text-xs font-semibold text-teal-700 dark:text-teal-400">{row.reference}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-700 dark:text-slate-200 max-w-[160px] truncate" title={row.designation}>{row.designation || '—'}</td>
                                        <td className="px-3 py-2.5 text-center font-medium text-slate-800 dark:text-white">{row.beneficiaire || '—'}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.type_reglement || '—'}</td>
                                        <td className="px-3 py-2.5 text-center font-mono text-xs text-slate-600 dark:text-slate-300">{row.numero || '—'}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.banque || '—'}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.nom_tire || '—'}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.date_decaissement || '—'}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300 max-w-[180px] truncate" title={row.remarque}>{row.remarque || '—'}</td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center justify-center gap-0.5">
                                                <ActionBtn title="Voir" icon={Eye} color="blue" onClick={() => setViewRow(row)} />
                                                <ActionBtn title="Modifier" icon={Pencil} color="amber" onClick={() => openEdit(row)} />
                                                <ActionBtn title="Imprimer" icon={Printer} color="slate" onClick={() => openPrintable(row)} />
                                                <ActionBtn title="PDF" icon={FileText} color="orange" onClick={() => openPrintable(row)} />
                                                <ActionBtn title="Supprimer" icon={Trash2} color="red" onClick={() => handleDelete(row)} />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={11} className="px-4 py-12 text-center text-slate-400">Aucune charge enregistrée</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </ScrollAreaWithArrows>
            </div>
        </div>
    );
}
