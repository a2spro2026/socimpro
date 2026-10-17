import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, XCircle, Pencil, Ban, X, Search } from 'lucide-react';
import api from '../lib/api';
import ScrollAreaWithArrows from '../components/ScrollAreaWithArrows';

const CONTRACT_OPTIONS = ['CDI', 'CDD', 'Vacataire'];
const REMUNERATION_OPTIONS = ['Salaire', 'Jour', 'Heure', 'Mission'];
const STATUS_OPTIONS = [
    { value: '', label: 'Tous' },
    { value: 'actif', label: 'Actif' },
    { value: 'inactif', label: 'Suspendu' },
];

const emptyForm = {
    first_name: '',
    last_name: '',
    position: '',
    hire_date: '',
    contract_type: 'CDI',
    remuneration_type: 'Salaire',
    monthly_salary: '',
    daily_rate: '',
    phone: '',
    status: 'actif',
};

const inputClass =
    'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2.5 py-2 text-xs text-center outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy transition-all';

function Field({ label, children }) {
    return (
        <div className="min-w-0">
            <label className="field-label field-label-compact">{label}</label>
            {children}
        </div>
    );
}

function ActionBtn({ title, onClick, icon: Icon, color = 'slate' }) {
    const colors = {
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

function FormPanel({ open, form, editingId, saving, error, onChange, onClose, onSubmit }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[95vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-brand-navy via-blue-800 to-indigo-900 shrink-0">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wide">
                        {editingId ? 'Modifier Fiche Personnel' : 'Nouvelle Fiche Personnel'}
                    </h3>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={onSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
                    <div className="p-5 space-y-3 overflow-y-auto flex-1">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 text-sm border border-red-100">{error}</div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <Field label="Prénom">
                                <input required value={form.first_name} onChange={(e) => onChange('first_name', e.target.value)} className={inputClass} />
                            </Field>
                            <Field label="Nom">
                                <input required value={form.last_name} onChange={(e) => onChange('last_name', e.target.value)} className={inputClass} />
                            </Field>
                            <Field label="Fonction">
                                <input required value={form.position} onChange={(e) => onChange('position', e.target.value)} className={inputClass} />
                            </Field>
                            <Field label="Date Début">
                                <input type="date" value={form.hire_date} onChange={(e) => onChange('hire_date', e.target.value)} className={inputClass} />
                            </Field>
                            <Field label="T/Contrat">
                                <select value={form.contract_type} onChange={(e) => onChange('contract_type', e.target.value)} className={inputClass}>
                                    {CONTRACT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </Field>
                            <Field label="Rémunération">
                                <select value={form.remuneration_type} onChange={(e) => onChange('remuneration_type', e.target.value)} className={inputClass}>
                                    {REMUNERATION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </Field>
                            <Field label="Salaire / Montant">
                                <input type="number" min="0" step="0.01" value={form.monthly_salary} onChange={(e) => onChange('monthly_salary', e.target.value)} className={inputClass} />
                            </Field>
                            <Field label="Taux jour">
                                <input type="number" min="0" step="0.01" value={form.daily_rate} onChange={(e) => onChange('daily_rate', e.target.value)} className={inputClass} />
                            </Field>
                            <Field label="Téléphone">
                                <input value={form.phone} onChange={(e) => onChange('phone', e.target.value)} className={inputClass} />
                            </Field>
                            <Field label="Statut">
                                <select value={form.status} onChange={(e) => onChange('status', e.target.value)} className={inputClass}>
                                    <option value="actif">Actif</option>
                                    <option value="inactif">Suspendu</option>
                                </select>
                            </Field>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                        <button type="button" onClick={onClose} className="btn-secondary text-xs px-4">Fermer</button>
                        <button type="submit" disabled={saving} className="btn-primary text-xs px-4">{saving ? '...' : 'Valider'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function FichePersonnelPage() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ id: '', name: '', status: '' });
    const [form, setForm] = useState(emptyForm);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(() => {
        setLoading(true);
        const params = {};
        if (filters.id) params.id = filters.id;
        if (filters.name) params.name = filters.name;
        if (filters.status) params.status = filters.status;
        api.get('/employees', { params })
            .then((r) => setRows(r.data.data ?? []))
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, [filters]);

    useEffect(() => { load(); }, [load]);

    const onChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));

    const openAdd = () => {
        setForm({ ...emptyForm, hire_date: new Date().toISOString().slice(0, 10) });
        setEditingId(null);
        setError('');
        setModalOpen(true);
    };

    const openEdit = (row) => {
        setForm({
            first_name: row.first_name || '',
            last_name: row.last_name || '',
            position: row.position || '',
            hire_date: row.hire_date_raw || '',
            contract_type: row.contract_type || 'CDI',
            remuneration_type: row.remuneration_type || 'Salaire',
            monthly_salary: String(row.monthly_salary ?? ''),
            daily_rate: String(row.daily_rate ?? ''),
            phone: row.phone || '',
            status: row.status || 'actif',
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
        const payload = {
            ...form,
            monthly_salary: parseFloat(String(form.monthly_salary).replace(',', '.')) || 0,
            daily_rate: parseFloat(String(form.daily_rate).replace(',', '.')) || 0,
            hire_date: form.hire_date || null,
        };
        try {
            if (editingId) {
                await api.put(`/employees/${editingId}`, payload);
            } else {
                await api.post('/employees', payload);
            }
            closeModal();
            load();
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de la validation');
        } finally {
            setSaving(false);
        }
    };

    const handleSuspend = async (row) => {
        const next = row.status === 'actif' ? 'suspendre' : 'réactiver';
        if (!window.confirm(`Voulez-vous ${next} « ${row.full_name} » ?`)) return;
        try {
            await api.post(`/employees/${row.id}/suspend`);
            load();
        } catch {
            setError('Impossible de modifier le statut');
        }
    };

    const headers = useMemo(
        () => ['Date', 'ID', 'Nom Personnel', 'Fonction', 'Date Début', 'T/Contrat', 'Rémunération', 'Actions'],
        [],
    );

    return (
        <div className="space-y-4">
            <FormPanel
                open={modalOpen}
                form={form}
                editingId={editingId}
                saving={saving}
                error={error}
                onChange={onChange}
                onClose={closeModal}
                onSubmit={handleSubmit}
            />

            <div className="flex flex-wrap items-center gap-2.5">
                <button type="button" onClick={openAdd} className="btn-primary text-sm">
                    <Plus className="w-4 h-4" /> Ajouter
                </button>
                <button type="button" onClick={() => navigate('/')} className="btn-danger text-sm">
                    <XCircle className="w-4 h-4" /> Fermer
                </button>

                <div className="ml-auto flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={filters.id}
                            onChange={(e) => setFilters((f) => ({ ...f, id: e.target.value }))}
                            placeholder="ID"
                            className="pl-8 pr-2 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs w-28 outline-none focus:ring-2 focus:ring-brand-navy/30"
                        />
                    </div>
                    <input
                        value={filters.name}
                        onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Nom Personnel"
                        className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs w-40 outline-none focus:ring-2 focus:ring-brand-navy/30"
                    />
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                        className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-brand-navy/30"
                    >
                        {STATUS_OPTIONS.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            <div className="glass-card rounded-2xl shadow-card border border-slate-200/60 dark:border-slate-700/60">
                <div className="px-5 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-orange-700 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Tableau Fiche Personnel</h3>
                </div>
                <ScrollAreaWithArrows variant="table" deps={[rows.length, loading]}>
                    <table className="w-full text-sm min-w-[1000px]">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700">
                                {headers.map((h) => (
                                    <th key={h} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap text-center">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                [...Array(3)].map((_, i) => (
                                    <tr key={i}>{[...Array(8)].map((__, j) => (
                                        <td key={j} className="px-4 py-3 text-center"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[70px]" /></td>
                                    ))}</tr>
                                ))
                            ) : rows.length ? (
                                rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-orange-50/40 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.created_at || '—'}</td>
                                        <td className="px-4 py-2.5 text-center font-mono text-xs font-semibold text-brand-navy dark:text-orange-400">{row.matricule || row.id}</td>
                                        <td className="px-4 py-2.5 text-center font-medium text-slate-800 dark:text-white">{row.full_name}</td>
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.position || '—'}</td>
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.hire_date || '—'}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                                {row.contract_type || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                                {row.remuneration_type || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center justify-center gap-0.5">
                                                <ActionBtn title="Modifier" icon={Pencil} color="amber" onClick={() => openEdit(row)} />
                                                <ActionBtn
                                                    title={row.status === 'actif' ? 'Suspendre' : 'Réactiver'}
                                                    icon={Ban}
                                                    color={row.status === 'actif' ? 'red' : 'orange'}
                                                    onClick={() => handleSuspend(row)}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Aucun personnel — cliquez sur Ajouter</td></tr>
                            )}
                        </tbody>
                    </table>
                </ScrollAreaWithArrows>
            </div>
        </div>
    );
}
