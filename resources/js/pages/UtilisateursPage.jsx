import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, XCircle, Eye, Pencil, Ban, X, CheckCircle2, RefreshCw,
} from 'lucide-react';
import api from '../lib/api';
import ScrollAreaWithArrows from '../components/ScrollAreaWithArrows';

const emptyForm = {
    name: '',
    phone: '',
    role_id: '',
    email: '',
    password: '',
};

const inputClass =
    'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2.5 py-2 text-xs text-center outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy transition-all';
const readOnlyClass =
    'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 px-2.5 py-2 text-xs text-center cursor-not-allowed';

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
                        <p className="text-[10px] text-blue-200 uppercase tracking-wider">Utilisateur</p>
                        <h3 className="text-white font-bold">{row.code}</h3>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5 space-y-3 text-sm">
                    {[
                        ['Date', row.created_at],
                        ['ID', row.code],
                        ['Nom Complet', row.name],
                        ['Contact', row.contact || row.phone],
                        ['Statut', row.statut],
                        ['Login', row.login || row.email],
                        ['Mot de passe', row.password_mask || '••••••••'],
                    ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                            <span className="text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
                            <span className="font-medium text-right text-slate-800 dark:text-white">{value || '—'}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function FormPanel({
    open, form, meta, editingId, saving, error, roles, onChange, onClose, onSubmit,
}) {
    if (!open) return null;

    const currentId = editingId
        ? (form._code || meta.next_id)
        : (meta.next_id || 'U-…');
    const currentDate = editingId
        ? (form._date || meta.date)
        : (meta.date || '—');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[95vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-brand-navy via-blue-800 to-indigo-900 shrink-0">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wide">
                        {editingId ? `Modifier ${form._code || ''}` : 'Nouvel Utilisateur'}
                    </h3>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
                    <div className="p-5 space-y-4 overflow-y-auto flex-1">
                        {error && (
                            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-800">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            <Field label="Date">
                                <input type="text" readOnly value={currentDate} className={readOnlyClass} />
                            </Field>
                            <Field label="ID">
                                <input type="text" readOnly value={currentId} className={readOnlyClass} />
                            </Field>
                            <Field label="Nom Complet">
                                <input
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={(e) => onChange('name', e.target.value)}
                                    placeholder="Nom complet"
                                    className={inputClass}
                                />
                            </Field>
                            <Field label="Contact">
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) => onChange('phone', e.target.value)}
                                    placeholder="06 XX XX XX XX"
                                    className={inputClass}
                                />
                            </Field>
                            <Field label="Statut">
                                <select
                                    required
                                    value={form.role_id}
                                    onChange={(e) => onChange('role_id', e.target.value)}
                                    className={inputClass}
                                >
                                    <option value="">—</option>
                                    {roles.map((r) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Login">
                                <input
                                    type="email"
                                    required
                                    value={form.email}
                                    onChange={(e) => onChange('email', e.target.value)}
                                    placeholder="email@exemple.com"
                                    className={inputClass}
                                />
                            </Field>
                            <Field label="Mot de passe">
                                <input
                                    type="password"
                                    required={!editingId}
                                    value={form.password}
                                    onChange={(e) => onChange('password', e.target.value)}
                                    placeholder={editingId ? 'Laisser vide = inchangé' : 'Mot de passe'}
                                    className={inputClass}
                                    autoComplete="new-password"
                                />
                            </Field>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                        <button type="button" onClick={onClose} className="btn-secondary text-xs px-4">
                            Fermer
                        </button>
                        <button type="submit" disabled={saving} className="btn-primary text-xs px-4">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {saving ? '...' : 'Valider'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function UtilisateursPage() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [roles, setRoles] = useState([]);
    const [meta, setMeta] = useState({ next_id: '—', date: '—' });
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [viewRow, setViewRow] = useState(null);

    const load = useCallback(() => {
        setLoading(true);
        api.get('/users', { params: { all: 1 } })
            .then((r) => {
                setRows(r.data.data ?? []);
                setMeta(r.data.meta ?? { next_id: '—', date: '—' });
                setRoles(r.data.meta?.roles ?? []);
            })
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const onChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));

    const closeModal = () => {
        setModalOpen(false);
        setEditingId(null);
        setForm(emptyForm);
        setError('');
    };

    const openAjouter = () => {
        setEditingId(null);
        setForm(emptyForm);
        setError('');
        setModalOpen(true);
    };

    const openEdit = (row) => {
        setEditingId(row.id);
        setForm({
            name: row.name || '',
            phone: row.phone || row.contact || '',
            role_id: row.role_id ? String(row.role_id) : '',
            email: row.email || row.login || '',
            password: '',
            _code: row.code,
            _date: row.created_at,
        });
        setError('');
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        const payload = {
            name: form.name,
            phone: form.phone || null,
            role_id: Number(form.role_id),
            email: form.email,
            is_active: true,
        };
        if (form.password) payload.password = form.password;

        try {
            if (editingId) {
                await api.put(`/users/${editingId}`, payload);
            } else {
                await api.post('/users', { ...payload, password: form.password });
            }
            closeModal();
            load();
        } catch (err) {
            const msg = err.response?.data?.message
                || Object.values(err.response?.data?.errors || {}).flat()?.[0]
                || 'Erreur lors de la validation';
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleSuspend = async (row) => {
        if (!row.is_active) {
            if (!window.confirm(`Réactiver l'utilisateur « ${row.name} » ?`)) return;
            try {
                await api.put(`/users/${row.id}`, { is_active: true });
                load();
            } catch (err) {
                setError(err.response?.data?.message || 'Impossible de réactiver');
            }
            return;
        }
        if (!window.confirm(`Suspendre l'utilisateur « ${row.name} » ?`)) return;
        try {
            await api.post(`/users/${row.id}/suspend`);
            load();
        } catch (err) {
            setError(err.response?.data?.message || 'Impossible de suspendre');
        }
    };

    const headers = ['Date', 'ID', 'Nom Complet', 'Statut', 'Login', 'Mot de passe', 'Actions'];

    return (
        <div className="space-y-4">
            <ViewModal row={viewRow} onClose={() => setViewRow(null)} />
            <FormPanel
                open={modalOpen}
                form={form}
                meta={meta}
                editingId={editingId}
                saving={saving}
                error={error}
                roles={roles}
                onChange={onChange}
                onClose={closeModal}
                onSubmit={handleSubmit}
            />

            <div className="flex flex-wrap items-center gap-2.5">
                <button type="button" onClick={openAjouter} className="btn-primary text-sm">
                    <Plus className="w-4 h-4" /> Ajouter
                </button>
                <button type="button" onClick={() => navigate('/')} className="btn-danger text-sm">
                    <XCircle className="w-4 h-4" /> Fermer
                </button>
                <button type="button" onClick={load} disabled={loading} className="btn-secondary text-sm ml-auto" title="Actualiser">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualiser
                </button>
            </div>

            {error && !modalOpen && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-800">
                    {error}
                </div>
            )}

            <div className="glass-card overflow-hidden shadow-card border border-slate-200/60 dark:border-slate-700/60">
                <div className="px-5 py-3.5 bg-gradient-to-r from-brand-navy via-blue-800 to-indigo-900 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Tableau des Utilisateurs</h3>
                </div>
                <ScrollAreaWithArrows maxHeight="min(55vh, 520px)" deps={[rows.length, loading]}>
                    <table className="w-full text-sm min-w-[980px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                                {headers.map((h) => (
                                    <th key={h} className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap text-center">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                [...Array(4)].map((_, i) => (
                                    <tr key={i}>
                                        {[...Array(7)].map((__, j) => (
                                            <td key={j} className="px-3 py-3 text-center">
                                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[80px]" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : rows.length ? (
                                rows.map((row) => (
                                    <tr key={row.id} className={`hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors ${!row.is_active ? 'opacity-70' : ''}`}>
                                        <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.created_at || '—'}</td>
                                        <td className="px-3 py-2.5 text-center font-mono text-xs font-semibold text-brand-navy dark:text-orange-400">{row.code}</td>
                                        <td className="px-3 py-2.5 text-center font-medium text-slate-800 dark:text-white">{row.name}</td>
                                        <td className="px-3 py-2.5 text-center">
                                            <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${
                                                !row.is_active
                                                    ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                                    : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                            }`}>
                                                {row.statut}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.login || row.email}</td>
                                        <td className="px-3 py-2.5 text-center font-mono text-xs tracking-widest text-slate-500">{row.password_mask || '••••••••'}</td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center justify-center gap-0.5">
                                                <ActionBtn title="Voir" icon={Eye} color="blue" onClick={() => setViewRow(row)} />
                                                <ActionBtn title="Modifier" icon={Pencil} color="amber" onClick={() => openEdit(row)} />
                                                <ActionBtn
                                                    title={row.is_active ? 'Suspendre' : 'Réactiver'}
                                                    icon={Ban}
                                                    color="red"
                                                    onClick={() => handleSuspend(row)}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                                        Aucun utilisateur — cliquez sur Ajouter
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
