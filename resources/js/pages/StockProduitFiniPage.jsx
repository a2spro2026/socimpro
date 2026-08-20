import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, XCircle, Eye, Pencil, Trash2, X, Printer, ImagePlus } from 'lucide-react';
import api from '../lib/api';
import ScrollAreaWithArrows from '../components/ScrollAreaWithArrows';

const UNIT_OPTIONS = ['', 'Kg', 'U', 'Sac', 'ML', 'M²', 'M³', 'Tn', 'M'];

const emptyForm = {
    article_ref: '',
    designation: '',
    unit: '',
    quantity: '1',
    photo_file: null,
    photo_preview: '',
    photo_url: '',
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
    'w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2 py-1.5 text-xs text-center outline-none focus:ring-1 focus:ring-brand-navy/30 focus:border-brand-navy transition-all';

function fmtQty(value) {
    return Number(value ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 3 });
}

function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildPrintHtml(row) {
    const photoBlock = row.photo_url
        ? `<p style="margin-top:16px;text-align:center"><img src="${esc(row.photo_url)}" alt="Photo" style="max-width:280px;max-height:220px;border:1px solid #e2e8f0;border-radius:8px"/></p>`
        : '';

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Produit fini ${esc(row.article_ref)}</title>
<style>body{font-family:Arial,sans-serif;padding:32px;color:#1e293b}h1{color:#0f766e;font-size:22px}
table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #e2e8f0;padding:8px;font-size:12px;text-align:center}
th{background:#f8fafc;font-weight:700}.badge{background:#ecfdf5;color:#047857;padding:4px 10px;border-radius:999px;font-weight:700}
</style></head><body>
<h1>STE SOCIMPRO — Stock Produit Fini <span class="badge">${esc(row.article_ref || '—')}</span></h1>
<table>
<tr><th>Réf</th><td>${esc(row.article_ref || '—')}</td><th>Désignation</th><td>${esc(row.designation || '—')}</td></tr>
<tr><th>Unité</th><td>${esc(row.unit || '—')}</td><th>Quantité</th><td>${esc(fmtQty(row.quantity))}</td></tr>
<tr><th>Qte Vendue</th><td>${esc(fmtQty(row.quantity_sold))}</td><th>Stock Actuel</th><td><strong>${esc(fmtQty(row.stock_actuel))}</strong></td></tr>
</table>
${photoBlock}
</body></html>`;
}

function openPrintable(row) {
    if (!row) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(buildPrintHtml(row));
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
        ['Réf', row.article_ref],
        ['Désignation', row.designation],
        ['Unité', row.unit || '—'],
        ['Quantité', fmtQty(row.quantity)],
        ['Qte Vendue', fmtQty(row.quantity_sold)],
        ['Stock Actuel', fmtQty(row.stock_actuel)],
    ];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-teal-600 to-cyan-700">
                    <div>
                        <p className="text-[10px] text-teal-100 uppercase tracking-wider">Stock Produit Fini</p>
                        <h3 className="text-white font-bold">{row.article_ref || '—'}</h3>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5 space-y-2 text-sm">
                    {row.photo_url && (
                        <div className="mb-3 flex justify-center">
                            <img src={row.photo_url} alt={row.designation || 'Photo'} className="max-h-40 rounded-lg border border-slate-200 dark:border-slate-700 object-contain" />
                        </div>
                    )}
                    {fields.map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4 py-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500 shrink-0">{label}</span>
                            <span className="font-medium text-slate-800 dark:text-white text-right">{value ?? '—'}</span>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <button type="button" onClick={() => openPrintable(row)} className="btn-secondary text-xs px-4">
                        <Printer className="w-3.5 h-3.5" /> Imprimer
                    </button>
                    <button type="button" onClick={onClose} className="btn-secondary text-xs px-4">Fermer</button>
                </div>
            </div>
        </div>
    );
}

function FormPanel({
    open, form, saving, error, editingId, fileInputRef, onChange, onPhotoChange, onClose, onSubmit, onPrint,
}) {
    if (!open) return null;
    const previewSrc = form.photo_preview || form.photo_url || '';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-teal-600 via-cyan-600 to-cyan-700">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wide">
                        {editingId ? 'Modifier Produit Fini' : 'Nouveau Produit Fini'}
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

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Réf">
                            <input
                                type="text"
                                required
                                value={form.article_ref}
                                onChange={(e) => onChange('article_ref', e.target.value)}
                                placeholder="Réf"
                                className={inputClass}
                            />
                        </Field>
                        <Field label="Unité">
                            <select value={form.unit} onChange={(e) => onChange('unit', e.target.value)} className={inputClass}>
                                {UNIT_OPTIONS.map((v) => (
                                    <option key={v || 'u'} value={v}>{v || '—'}</option>
                                ))}
                            </select>
                        </Field>
                        <div className="col-span-2">
                            <Field label="Désignation">
                                <input
                                    type="text"
                                    required
                                    value={form.designation}
                                    onChange={(e) => onChange('designation', e.target.value)}
                                    placeholder="Désignation"
                                    className={`${inputClass} text-left`}
                                />
                            </Field>
                        </div>
                        <Field label="Quantité">
                            <input
                                type="number"
                                step="0.001"
                                min="0"
                                required
                                value={form.quantity}
                                onChange={(e) => onChange('quantity', e.target.value)}
                                className={inputClass}
                            />
                        </Field>
                        <div className="col-span-2">
                            <Field label="Photo">
                                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={onPhotoChange}
                                        className="block w-full text-[11px] text-slate-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-teal-50 file:text-teal-700 dark:file:bg-teal-900/40 dark:file:text-teal-300 hover:file:bg-teal-100"
                                    />
                                    {previewSrc ? (
                                        <img src={previewSrc} alt="Aperçu" className="h-16 w-16 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                                    ) : (
                                        <div className="h-16 w-16 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 shrink-0">
                                            <ImagePlus className="w-5 h-5" />
                                        </div>
                                    )}
                                </div>
                            </Field>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button type="button" onClick={onClose} className="btn-secondary text-xs px-4">Fermer</button>
                        <button type="button" onClick={onPrint} className="btn-secondary text-xs px-4">
                            <Printer className="w-3.5 h-3.5" /> Imprimer
                        </button>
                        <button type="submit" disabled={saving} className="btn-primary text-xs px-4">
                            {saving ? 'Validation...' : 'Valider'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function StockProduitFiniPage() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(emptyForm);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [viewRow, setViewRow] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [previewSold, setPreviewSold] = useState(0);
    const [previewStock, setPreviewStock] = useState(0);

    const load = useCallback(() => {
        setLoading(true);
        api.get('/finished-products')
            .then((r) => setRows(r.data.data ?? []))
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const onChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));

    const onPhotoChange = (e) => {
        const file = e.target.files?.[0] || null;
        if (form.photo_preview) URL.revokeObjectURL(form.photo_preview);
        setForm((f) => ({
            ...f,
            photo_file: file,
            photo_preview: file ? URL.createObjectURL(file) : '',
        }));
    };

    const closeModal = () => {
        if (form.photo_preview) URL.revokeObjectURL(form.photo_preview);
        setModalOpen(false);
        setEditingId(null);
        setError('');
        setForm(emptyForm);
        setPreviewSold(0);
        setPreviewStock(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const openAjouter = () => {
        if (form.photo_preview) URL.revokeObjectURL(form.photo_preview);
        setForm(emptyForm);
        setEditingId(null);
        setPreviewSold(0);
        setPreviewStock(0);
        setError('');
        setModalOpen(true);
    };

    const openEdit = (row) => {
        if (form.photo_preview) URL.revokeObjectURL(form.photo_preview);
        setForm({
            article_ref: row.article_ref || '',
            designation: row.designation || '',
            unit: row.unit || '',
            quantity: row.quantity != null ? String(row.quantity) : '1',
            photo_file: null,
            photo_preview: '',
            photo_url: row.photo_url || '',
        });
        setPreviewSold(Number(row.quantity_sold) || 0);
        setPreviewStock(Number(row.stock_actuel) || 0);
        setEditingId(row.id);
        setError('');
        setModalOpen(true);
    };

    const handleDelete = async (row) => {
        if (!window.confirm(`Supprimer le produit « ${row.article_ref} » ?`)) return;
        try {
            await api.delete(`/finished-products/${row.id}`);
            if (editingId === row.id) closeModal();
            load();
        } catch {
            setError('Impossible de supprimer ce produit');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.article_ref?.trim() || !form.designation?.trim()) {
            setError('Réf et désignation sont obligatoires');
            return;
        }
        setSaving(true);

        const fd = new FormData();
        fd.append('article_ref', form.article_ref.trim());
        fd.append('designation', form.designation.trim());
        fd.append('unit', form.unit || '');
        fd.append('quantity', String(parseFloat(String(form.quantity).replace(',', '.')) || 0));
        if (form.photo_file) fd.append('photo', form.photo_file);

        try {
            let saved;
            if (editingId) {
                fd.append('_method', 'PUT');
                saved = (await api.post(`/finished-products/${editingId}`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                })).data.data;
            } else {
                saved = (await api.post('/finished-products', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                })).data.data;
            }
            closeModal();
            load();
            if (saved) {
                setPreviewSold(Number(saved.quantity_sold) || 0);
                setPreviewStock(Number(saved.stock_actuel) || 0);
            }
        } catch (err) {
            const msg = err.response?.data?.errors?.photo?.[0]
                || err.response?.data?.message
                || 'Erreur lors de la validation';
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    const handlePrintForm = () => {
        const qty = parseFloat(String(form.quantity).replace(',', '.')) || 0;
        openPrintable({
            article_ref: form.article_ref,
            designation: form.designation,
            unit: form.unit,
            quantity: qty,
            quantity_sold: previewSold,
            stock_actuel: editingId ? previewStock : qty,
            photo_url: form.photo_preview || form.photo_url || '',
        });
    };

    return (
        <div className="space-y-4">
            <ViewModal row={viewRow} onClose={() => setViewRow(null)} />
            <FormPanel
                open={modalOpen}
                form={form}
                saving={saving}
                error={error}
                editingId={editingId}
                fileInputRef={fileInputRef}
                onChange={onChange}
                onPhotoChange={onPhotoChange}
                onClose={closeModal}
                onSubmit={handleSubmit}
                onPrint={handlePrintForm}
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
                <div className="px-5 py-3.5 bg-gradient-to-r from-teal-600 via-cyan-600 to-cyan-700 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Stock Produit Fini</h3>
                </div>
                <ScrollAreaWithArrows maxHeight="min(60vh, 560px)" deps={[rows.length, loading]}>
                    <table className="w-full text-sm min-w-[900px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                                {['Réf', 'Désignation', 'Qte', 'U', 'Qte Vendue', 'Stock Actuel', 'Actions'].map((h) => (
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
                                        {[...Array(7)].map((__, j) => (
                                            <td key={j} className="px-4 py-3 text-center">
                                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[80px]" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : rows.length ? (
                                rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-teal-50/40 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-2.5 text-center font-mono text-xs font-semibold text-brand-navy dark:text-teal-400">{row.article_ref || '—'}</td>
                                        <td className="px-4 py-2.5 text-center font-medium text-slate-800 dark:text-white">{row.designation || '—'}</td>
                                        <td className="px-4 py-2.5 text-center font-semibold tabular-nums text-slate-700 dark:text-slate-200">{fmtQty(row.quantity)}</td>
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.unit || '—'}</td>
                                        <td className="px-4 py-2.5 text-center font-semibold tabular-nums text-amber-700 dark:text-amber-300">{fmtQty(row.quantity_sold)}</td>
                                        <td className="px-4 py-2.5 text-center font-semibold tabular-nums text-teal-700 dark:text-teal-300">{fmtQty(row.stock_actuel)}</td>
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
                                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                                        Aucun produit fini — cliquez sur Ajouter
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
