import { useCallback, useEffect, useState } from 'react';
import { Save, RotateCcw, Eye, Pencil, Trash2, Printer, FileText, X, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { formatMontant } from '../lib/formatMontant';
import ScrollAreaWithArrows from '../components/ScrollAreaWithArrows';
import { parseDelayInput, formatDelaySave } from './devis/devisUtils';

const REGLEMENT_OPTIONS = [
    { value: '', label: '—' },
    { value: 'Esp', label: 'Esp' },
    { value: 'Chq', label: 'Chq' },
    { value: 'Eff', label: 'Eff' },
    { value: 'Vir', label: 'Vir' },
    { value: 'Vers', label: 'Vers' },
];

const TYPE_OPTIONS = [
    { value: '', label: '—' },
    { value: 'Rev', label: 'Rev' },
    { value: 'Entr', label: 'Entr' },
    { value: 'Pro', label: 'Pro' },
];

const emptyForm = {
    name: '',
    phone: '',
    city: '',
    chantier_type: '',
    reglement: '',
    chantier_address: '',
    work_delay: '', // Échéance
    budget: '', // Solde Initial
};

function Field({ label, children, className = '' }) {
    return (
        <div className={className}>
            <label className="field-label">
                {label}
            </label>
            {children}
        </div>
    );
}

const inputClass =
    'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2.5 py-1.5 text-xs text-center outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy transition-all';

const readOnlyClass =
    'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 px-2.5 py-1.5 text-xs text-center cursor-not-allowed';

function formatSolde(value) {
    return formatMontant(value);
}

function hasSoldeInitial(value) {
    const n = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(n) && n !== 0;
}

function parseSoldeInput(value) {
    if (value === '' || value == null) return '';
    const n = Number(String(value).replace(',', '.'));
    return Number.isFinite(n) ? String(Math.round(n)) : '';
}

/** Solde total = solde initial + ventes − paiements. */
function remainingSolde(row) {
    if (row?.solde != null && row.solde !== '') return row.solde;
    return row?.budget ?? row?.initial_balance ?? 0;
}

function buildFicheHtml(row) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fiche ${row.code}</title>
<style>
body{font-family:Arial,sans-serif;padding:32px;color:#1e293b}
h1{color:#1e3a5f;margin:0 0 4px;font-size:22px}
.sub{color:#64748b;font-size:12px;margin-bottom:24px}
table{width:100%;border-collapse:collapse;margin-top:16px}
th,td{border:1px solid #e2e8f0;padding:10px 12px;text-align:left;font-size:13px}
th{background:#f8fafc;width:180px;font-weight:700}
.footer{margin-top:32px;font-size:11px;color:#94a3b8;text-align:center}
.badge{display:inline-block;padding:4px 10px;border-radius:999px;background:#fff7ed;color:#ea580c;font-weight:700}
</style></head><body>
<h1>STE SOCIMPRO — Fiche Client</h1>
<p class="sub">Document généré le ${new Date().toLocaleDateString('fr-FR')}</p>
<table>
<tr><th>CR</th><td><span class="badge">${row.code}</span></td></tr>
<tr><th>Nom Client</th><td>${row.name || '—'}</td></tr>
<tr><th>Contact</th><td>${row.contact || '—'}</td></tr>
<tr><th>Ville</th><td>${row.city || '—'}</td></tr>
<tr><th>Type</th><td>${row.chantier_type || '—'}</td></tr>
<tr><th>Régl</th><td>${row.reglement || '—'}</td></tr>
<tr><th>Adresse</th><td>${row.chantier_address || '—'}</td></tr>
<tr><th>Échéance</th><td>${row.work_delay || row.echeance || '—'}</td></tr>
<tr><th>Solde Initial</th><td>${formatSolde(row.budget ?? row.initial_balance ?? 0)}</td></tr>
<tr><th>Solde</th><td><strong>${formatSolde(remainingSolde(row))}</strong></td></tr>
<tr><th>Date création</th><td>${row.created_at || '—'}</td></tr>
</table>
<p class="footer">© STE SOCIMPRO — A2SPRO</p>
</body></html>`;
}

function openPrintable(row) {
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    win.document.write(buildFicheHtml(row));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
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
        <button
            type="button"
            title={title}
            onClick={onClick}
            className={`p-1.5 rounded-lg text-slate-400 transition-colors ${colors[color]}`}
        >
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
    );
}

function ViewModal({ row, onClose }) {
    if (!row) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-brand-navy to-blue-800">
                    <div>
                        <p className="text-[10px] text-blue-200 uppercase tracking-wider">Fiche Client</p>
                        <h3 className="text-white font-bold">{row.code}</h3>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5 space-y-3 text-sm">
                    {[
                        ['Nom Client', row.name],
                        ['Contact', row.contact],
                        ['Ville', row.city],
                        ['Type', row.chantier_type],
                        ['Régl', row.reglement],
                        ['Adresse', row.chantier_address],
                        ['Échéance', row.work_delay || row.echeance],
                        ['Solde Initial', formatSolde(row.budget ?? row.initial_balance ?? 0), hasSoldeInitial(row.budget ?? row.initial_balance)],
                        ['Solde', formatSolde(remainingSolde(row)), hasSoldeInitial(remainingSolde(row))],
                        ['Date', row.created_at],
                    ].map(([label, value, isRed]) => (
                        <div key={label} className="flex justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                            <span className="text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
                            <span className={`font-medium text-right ${isRed ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-800 dark:text-white'}`}>{value || '—'}</span>
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

export default function FicheClientPage() {
    const [form, setForm] = useState(emptyForm);
    const [rows, setRows] = useState([]);
    const [meta, setMeta] = useState({ next_id: '—', date: '—' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [viewRow, setViewRow] = useState(null);

    const load = useCallback(() => {
        setLoading(true);
        api.get('/clients', { params: { all: 1 } })
            .then((r) => {
                setRows(r.data.data ?? []);
                setMeta(r.data.meta ?? { next_id: '—', date: '—' });
            })
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

    const resetForm = () => {
        setForm(emptyForm);
        setEditingId(null);
        setError('');
        load();
    };

    const fillForm = (row) => {
        setForm({
            name: row.name || '',
            phone: row.phone || row.contact || '',
            city: row.city || '',
            chantier_type: row.chantier_type || '',
            reglement: row.reglement || '',
            chantier_address: row.chantier_address || '',
            work_delay: parseDelayInput(row.work_delay || row.echeance || ''),
            budget: parseSoldeInput(row.budget ?? row.initial_balance),
        });
        setEditingId(row.id);
        setError('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (row) => {
        if (!window.confirm(`Supprimer le client « ${row.name} » ?`)) return;
        try {
            await api.delete(`/clients/${row.id}`);
            if (editingId === row.id) resetForm();
            load();
        } catch {
            setError('Impossible de supprimer ce client');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        const payload = {
            name: form.name,
            phone: form.phone || null,
            city: form.city || null,
            chantier_type: form.chantier_type || null,
            reglement: form.reglement || null,
            chantier_address: form.chantier_address || null,
            work_delay: formatDelaySave(form.work_delay),
            budget: form.budget === '' ? 0 : Number(parseSoldeInput(form.budget) || 0),
        };
        try {
            if (editingId) {
                await api.put(`/clients/${editingId}`, payload);
            } else {
                await api.post('/clients', payload);
            }
            resetForm();
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <ViewModal row={viewRow} onClose={() => setViewRow(null)} />

            <form onSubmit={handleSubmit} className="glass-card p-5 lg:p-6 shadow-card border border-slate-200/60 dark:border-slate-700/60">
                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-800">
                        {error}
                    </div>
                )}

                {editingId && (
                    <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-medium border border-amber-200 dark:border-amber-800">
                        Mode modification — modifiez les champs puis cliquez sur Mettre à jour
                    </div>
                )}

                <ScrollAreaWithArrows variant="table">
                    <div className="grid grid-cols-[78px_72px_minmax(120px,1.2fr)_95px_90px_minmax(120px,1.1fr)_70px_70px_88px_95px] gap-1.5 items-end min-w-[1100px]">
                        <Field label="Date">
                            <input type="text" readOnly value={meta.date} className={readOnlyClass} />
                        </Field>
                        <Field label="CR">
                            <input type="text" readOnly value={editingId ? rows.find((r) => r.id === editingId)?.code ?? meta.next_id : meta.next_id} className={readOnlyClass} />
                        </Field>
                        <Field label="Nom Client">
                            <input type="text" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Raison sociale" className={inputClass} />
                        </Field>
                        <Field label="Contact">
                            <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="06 XX XX XX XX" className={inputClass} />
                        </Field>
                        <Field label="Ville">
                            <input type="text" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Ville" className={inputClass} />
                        </Field>
                        <Field label="Adresse">
                            <input type="text" value={form.chantier_address} onChange={(e) => set('chantier_address', e.target.value)} placeholder="Adresse" className={inputClass} />
                        </Field>
                        <Field label="Type">
                            <select value={form.chantier_type} onChange={(e) => set('chantier_type', e.target.value)} className={inputClass}>
                                {TYPE_OPTIONS.map((opt) => (
                                    <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Régl">
                            <select value={form.reglement} onChange={(e) => set('reglement', e.target.value)} className={inputClass}>
                                {REGLEMENT_OPTIONS.map((opt) => (
                                    <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Échéance">
                            <div className="relative flex items-center">
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={form.work_delay}
                                    onChange={(e) => set('work_delay', e.target.value)}
                                    placeholder="0"
                                    className={`${inputClass} pr-9`}
                                />
                                <span className="absolute right-2 text-[10px] font-bold text-slate-400 pointer-events-none">Jrs</span>
                            </div>
                        </Field>
                        <Field label="Solde Initial">
                            <input
                                type="text"
                                inputMode="decimal"
                                value={form.budget}
                                onChange={(e) => set('budget', e.target.value.replace(/[^\d.,\-]/g, ''))}
                                onBlur={() => set('budget', parseSoldeInput(form.budget))}
                                placeholder="0"
                                className={`${inputClass} ${hasSoldeInitial(form.budget) ? 'border-red-400 text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-950/30 focus:ring-red-400/40 focus:border-red-500' : ''}`}
                            />
                        </Field>
                    </div>
                </ScrollAreaWithArrows>

                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button type="submit" disabled={saving} className="btn-primary text-sm">
                        <Save className="w-4 h-4" />
                        {saving ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Enregistrer'}
                    </button>
                    <button type="button" onClick={resetForm} className="btn-muted">
                        <RotateCcw className="w-4 h-4" />
                        {editingId ? 'Annuler' : 'Nouveau'}
                    </button>
                    <button type="button" onClick={load} disabled={loading} className="btn-secondary text-sm" title="Actualiser">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Actualiser
                    </button>
                </div>
            </form>

            <div className="glass-card rounded-2xl shadow-card border border-slate-200/60 dark:border-slate-700/60">
                <div className="px-5 py-3.5 rounded-t-2xl bg-gradient-to-r from-brand-navy via-blue-800 to-blue-900 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Liste des clients</h3>
                </div>
                <ScrollAreaWithArrows variant="table" deps={[rows.length, loading]}>
                    <table className="w-full text-sm min-w-[1050px]">
                        <thead className="sticky top-0 z-10">                            <tr className="bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                                {['CR', 'Nom Client', 'Contact', 'Ville', 'Adresse', 'Type', 'Régl', 'Échéance', 'Solde Initial', 'Solde', 'Actions'].map((h) => (
                                    <th
                                        key={h}
                                        className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap text-center"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                [...Array(3)].map((_, i) => (
                                    <tr key={i}>
                                        {[...Array(11)].map((__, j) => (
                                            <td key={j} className="px-4 py-3 text-center">
                                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[80px]" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : rows.length ? (
                                rows.map((row) => (
                                    <tr key={row.id} className={`hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors ${editingId === row.id ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''}`}>
                                        <td className="px-4 py-2.5 text-center font-mono text-xs font-semibold text-brand-navy dark:text-orange-400">{row.code}</td>
                                        <td className="px-4 py-2.5 text-center font-medium text-slate-800 dark:text-white">{row.name}</td>
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.contact || '—'}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                {row.city || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300 max-w-[160px] truncate mx-auto">{row.chantier_address || '—'}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${
                                                row.chantier_type === 'Rev' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                                : row.chantier_type === 'Entr' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                                                : row.chantier_type === 'Pro' ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                            }`}>
                                                {row.chantier_type || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-brand-navy dark:text-blue-300">
                                                {row.reglement || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                                {row.work_delay || '—'}
                                            </span>
                                        </td>
                                        <td className={`px-4 py-2.5 text-center font-semibold tabular-nums ${hasSoldeInitial(row.budget ?? row.initial_balance) ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>
                                            {formatSolde(row.budget ?? row.initial_balance ?? 0)}
                                        </td>
                                        <td className={`px-4 py-2.5 text-center font-semibold tabular-nums ${hasSoldeInitial(remainingSolde(row)) ? 'text-red-600 dark:text-red-400' : 'text-brand-navy dark:text-orange-400'}`}>
                                            {formatSolde(remainingSolde(row))}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center justify-center gap-0.5">
                                                <ActionBtn title="Voir" icon={Eye} color="blue" onClick={() => setViewRow(row)} />
                                                <ActionBtn title="Modifier" icon={Pencil} color="amber" onClick={() => fillForm(row)} />
                                                <ActionBtn title="Supprimer" icon={Trash2} color="red" onClick={() => handleDelete(row)} />
                                                <ActionBtn title="Imprimer" icon={Printer} color="slate" onClick={() => openPrintable(row)} />
                                                <ActionBtn title="PDF" icon={FileText} color="orange" onClick={() => openPrintable(row)} />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                                        Aucun client enregistré
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
