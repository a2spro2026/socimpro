import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, XCircle, Eye, Pencil, Trash2, X } from 'lucide-react';
import api from '../lib/api';
import ScrollAreaWithArrows from '../components/ScrollAreaWithArrows';

const emptyForm = {
    production_date: '',
    product_key: '',
    article_ref: '',
    designation: '',
    unit: '',
    quantity: '1',
};

function productKey(p) {
    return `${p.ref ?? ''}||${p.designation ?? ''}||${p.unit ?? ''}`;
}

function Field({ label, children }) {
    return (
        <div className="min-w-0">
            <label className="field-label field-label-compact">{label}</label>
            {children}
        </div>
    );
}

const inputClass =
    'w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2 py-1.5 text-xs text-center outline-none focus:ring-1 focus:ring-brand-navy/30 focus:border-brand-navy transition-all';
const readOnlyClass =
    'w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 px-2 py-1.5 text-xs text-center cursor-not-allowed';

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

function ViewModal({ row, onClose }) {
    if (!row) return null;
    const fields = [
        ['Date', row.production_date],
        ['N° BP', row.reference],
        ['Réf', row.article_ref],
        ['Désignation', row.designation],
        ['U', row.unit],
        ['Qte', row.quantity],
    ];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-700">
                    <div>
                        <p className="text-[10px] text-emerald-100 uppercase tracking-wider">Bon Production</p>
                        <h3 className="text-white font-bold">{row.reference}</h3>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5 space-y-2 text-sm">
                    {fields.map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4 py-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500 shrink-0">{label}</span>
                            <span className="font-medium text-slate-800 dark:text-white text-right">{value ?? '—'}</span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <button type="button" onClick={onClose} className="btn-secondary text-xs px-4">Fermer</button>
                </div>
            </div>
        </div>
    );
}

function FormPanel({
    open, form, currentRef, saving, error, editingId, products, onChange, onSelectProduct, onClose, onSubmit,
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wide">
                        {editingId ? `Modifier ${currentRef || ''}` : 'Nouveau Bon Production'}
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

                    {!products.length && (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs border border-amber-100 dark:border-amber-800">
                            Aucun produit en stock matière première — créez d&apos;abord un bon d&apos;achat.
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Date">
                            <input
                                type="date"
                                required
                                value={form.production_date}
                                onChange={(e) => onChange('production_date', e.target.value)}
                                className={inputClass}
                            />
                        </Field>
                        <Field label="N° BP">
                            <input type="text" readOnly value={currentRef} className={readOnlyClass} />
                        </Field>
                        <div className="col-span-2">
                            <Field label="Réf (stock matière première)">
                                <select
                                    required
                                    value={form.product_key}
                                    onChange={(e) => onSelectProduct(e.target.value)}
                                    className={inputClass}
                                >
                                    <option value="">— Choisir un produit —</option>
                                    {products.map((p) => (
                                        <option key={productKey(p)} value={productKey(p)}>
                                            {p.ref} — {p.designation}
                                            {p.unit && p.unit !== '—' ? ` (${p.unit})` : ''}
                                            {` · stock ${Number(p.quantity).toLocaleString('fr-FR', { maximumFractionDigits: 3 })}`}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                        <div className="col-span-2">
                            <Field label="Désignation">
                                <input type="text" readOnly value={form.designation} className={`${readOnlyClass} text-left`} />
                            </Field>
                        </div>
                        <Field label="U">
                            <input type="text" readOnly value={form.unit || '—'} className={readOnlyClass} />
                        </Field>
                        <Field label="Qte">
                            <input
                                type="number"
                                step="0.001"
                                min="0.001"
                                required
                                value={form.quantity}
                                onChange={(e) => onChange('quantity', e.target.value)}
                                className={inputClass}
                            />
                        </Field>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" onClick={onClose} className="btn-secondary text-xs px-4">Fermer</button>
                        <button type="submit" disabled={saving || !products.length} className="btn-primary text-xs px-4">
                            {saving ? 'Validation...' : 'Valider'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function BonProductionPage() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [products, setProducts] = useState([]);
    const [meta, setMeta] = useState({ next_ref: '—', date_raw: '' });
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(emptyForm);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [viewRow, setViewRow] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(() => {
        setLoading(true);
        Promise.all([
            api.get('/production-orders'),
            api.get('/stock/matiere-premiere'),
        ])
            .then(([ordersRes, stockRes]) => {
                setRows(ordersRes.data.data ?? []);
                setMeta(ordersRes.data.meta ?? { next_ref: '—', date_raw: '' });
                setProducts(stockRes.data.data ?? []);
            })
            .catch(() => {
                setRows([]);
                setProducts([]);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const productsByKey = useMemo(() => {
        const map = new Map();
        products.forEach((p) => map.set(productKey(p), p));
        return map;
    }, [products]);

    const onChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));

    const onSelectProduct = (key) => {
        const p = productsByKey.get(key);
        if (!p) {
            setForm((f) => ({ ...f, product_key: '', article_ref: '', designation: '', unit: '' }));
            return;
        }
        setForm((f) => ({
            ...f,
            product_key: key,
            article_ref: p.ref || '',
            designation: p.designation || '',
            unit: p.unit && p.unit !== '—' ? p.unit : '',
        }));
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingId(null);
        setError('');
        setForm(emptyForm);
    };

    const openAjouter = () => {
        setForm({
            ...emptyForm,
            production_date: meta.date_raw || new Date().toISOString().slice(0, 10),
        });
        setEditingId(null);
        setError('');
        load();
        setModalOpen(true);
    };

    const openEdit = (row) => {
        const key = productKey({
            ref: row.article_ref || '',
            designation: row.designation || '',
            unit: row.unit || '',
        });
        const matched = products.find((p) => productKey(p) === key)
            || products.find((p) =>
                (p.ref || '').toLowerCase() === (row.article_ref || '').toLowerCase()
                && (p.designation || '').toLowerCase() === (row.designation || '').toLowerCase());

        setForm({
            production_date: row.production_date_raw || '',
            product_key: matched ? productKey(matched) : '',
            article_ref: matched?.ref || row.article_ref || '',
            designation: matched?.designation || row.designation || '',
            unit: matched?.unit && matched.unit !== '—' ? matched.unit : (row.unit || ''),
            quantity: row.quantity != null ? String(row.quantity) : '1',
        });
        setEditingId(row.id);
        setError('');
        setModalOpen(true);
    };

    const handleDelete = async (row) => {
        if (!window.confirm(`Supprimer le bon « ${row.reference} » ?`)) return;
        try {
            await api.delete(`/production-orders/${row.id}`);
            if (editingId === row.id) closeModal();
            load();
        } catch {
            setError('Impossible de supprimer ce bon de production');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.article_ref || !form.designation?.trim()) {
            setError('Sélectionnez un produit du stock matière première');
            return;
        }
        setSaving(true);
        const payload = {
            production_date: form.production_date || new Date().toISOString().slice(0, 10),
            article_ref: form.article_ref,
            designation: form.designation.trim(),
            unit: form.unit || null,
            quantity: parseFloat(String(form.quantity).replace(',', '.')) || 0,
        };
        try {
            if (editingId) {
                await api.put(`/production-orders/${editingId}`, payload);
            } else {
                await api.post('/production-orders', payload);
            }
            closeModal();
            load();
        } catch (err) {
            const msg = err.response?.data?.errors?.article_ref?.[0]
                || err.response?.data?.message
                || 'Erreur lors de la validation';
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    const currentRef = editingId
        ? rows.find((r) => r.id === editingId)?.reference ?? meta.next_ref
        : meta.next_ref;

    return (
        <div className="space-y-4">
            <ViewModal row={viewRow} onClose={() => setViewRow(null)} />
            <FormPanel
                open={modalOpen}
                form={form}
                currentRef={currentRef}
                saving={saving}
                error={error}
                editingId={editingId}
                products={products}
                onChange={onChange}
                onSelectProduct={onSelectProduct}
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
            </div>

            <div className="glass-card overflow-hidden shadow-card border border-slate-200/60 dark:border-slate-700/60">
                <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Tableau des Bons de Production</h3>
                </div>
                <ScrollAreaWithArrows maxHeight="min(60vh, 560px)" deps={[rows.length, loading]}>
                    <table className="w-full text-sm min-w-[720px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                                {['Date', 'Réf', 'Désignation', 'Qte', 'Actions'].map((h) => (
                                    <th key={h} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap text-center">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                [...Array(3)].map((_, i) => (
                                    <tr key={i}>
                                        {[...Array(5)].map((__, j) => (
                                            <td key={j} className="px-4 py-3 text-center">
                                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[80px]" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : rows.length ? (
                                rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-emerald-50/40 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.production_date}</td>
                                        <td className="px-4 py-2.5 text-center font-mono text-xs font-semibold text-brand-navy dark:text-emerald-400">
                                            {row.article_ref || row.reference}
                                        </td>
                                        <td className="px-4 py-2.5 text-center font-medium text-slate-800 dark:text-white">{row.designation || '—'}</td>
                                        <td className="px-4 py-2.5 text-center font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                                            {Number(row.quantity).toLocaleString('fr-FR', { maximumFractionDigits: 3 })}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center justify-center gap-0.5">
                                                <ActionBtn title="Voir" icon={Eye} color="blue" onClick={() => setViewRow(row)} />
                                                <ActionBtn title="Modifier" icon={Pencil} color="amber" onClick={() => openEdit(row)} />
                                                <ActionBtn title="Supprimer" icon={Trash2} color="red" onClick={() => handleDelete(row)} />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                                        Aucun bon de production — cliquez sur Ajouter
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
