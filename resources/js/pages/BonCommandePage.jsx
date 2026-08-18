import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Printer, X, XCircle, Trash2, Pencil } from 'lucide-react';
import api from '../lib/api';
import ScrollAreaWithArrows from '../components/ScrollAreaWithArrows';

const emptyHeader = {
    supplier_id: '',
    order_date: '',
    city: '',
};

const emptyLine = () => ({
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    product_id: '',
    article_ref: '',
    description: '',
    unit: '',
    quantity: '1',
    unit_price: '',
});

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
const lineInput =
    'w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-1.5 py-1 text-[11px] text-center outline-none focus:ring-1 focus:ring-brand-navy/30';

function esc(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatMontant(value) {
    const n = Math.round(Number(value) || 0);
    return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}.Fcfa`;
}

function lineSubtotal(line) {
    const qty = parseFloat(String(line.quantity).replace(',', '.')) || 0;
    const price = parseFloat(String(line.unit_price).replace(',', '.')) || 0;
    return qty * price;
}

function buildPrintHtml(rows) {
    const body = rows.map((r) => `
<tr>
<td>${esc(r.order_date || '—')}</td>
<td>${esc(r.reference || '—')}</td>
<td>${esc(r.fournisseur || '—')}</td>
<td>${esc(r.city || '—')}</td>
<td>${esc(r.article_ref || '—')}</td>
<td>${esc(r.description || '—')}</td>
<td>${esc(r.quantity ?? '—')}</td>
<td>${esc(formatMontant(r.unit_price))}</td>
<td><strong>${esc(formatMontant(r.sous_total))}</strong></td>
</tr>`).join('') || '<tr><td colspan="9">Aucune ligne</td></tr>';

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bons de Commande</title>
<style>body{font-family:Arial,sans-serif;padding:28px;color:#1e293b}h1{color:#1e3a5f;font-size:20px;margin:0 0 16px}
table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:7px;font-size:11px;text-align:center}
th{background:#f8fafc;font-weight:700}</style></head><body>
<h1>STE SOCIMPRO — Bons de Commande</h1>
<table>
<thead><tr>
<th>Date</th><th>N° Bn Cmd</th><th>Fournisseur</th><th>Ville Liv</th>
<th>Réf</th><th>Désignation</th><th>Qte</th><th>Prix/U</th><th>Sous-Total</th>
</tr></thead>
<tbody>${body}</tbody>
</table>
</body></html>`;
}

function openPrintable(rows) {
    const w = window.open('', '_blank', 'width=1000,height=700');
    if (!w) return;
    w.document.write(buildPrintHtml(rows));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
}

function FormPanel({
    open, form, lines, meta, editingId, saving, error, suppliers, products,
    onChange, onLineChange, onSelectProduct, onAddLine, onRemoveLine, onClose, onSubmit,
}) {
    if (!open) return null;

    const total = lines.reduce((sum, l) => sum + lineSubtotal(l), 0);
    const currentRef = editingId ? (form._ref || meta.next_ref) : (meta.next_ref || 'BC-…');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[95vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-brand-navy via-blue-800 to-indigo-900 shrink-0">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wide">
                        {editingId ? `Modifier ${form._ref || ''}` : 'Nouveau Bon de Commande'}
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

                        <ScrollAreaWithArrows variant="table">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-[640px]">
                            <Field label="Date">
                                <input type="date" required value={form.order_date} onChange={(e) => onChange('order_date', e.target.value)} className={inputClass} />
                            </Field>
                            <Field label="N° Bn Cmd">
                                <input type="text" readOnly value={currentRef} className={readOnlyClass} />
                            </Field>
                            <Field label="Fournisseur">
                                <select required value={form.supplier_id} onChange={(e) => onChange('supplier_id', e.target.value)} className={inputClass}>
                                    <option value="">—</option>
                                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </Field>
                            <Field label="Ville Liv">
                                <input type="text" value={form.city} onChange={(e) => onChange('city', e.target.value)} placeholder="Ville livraison" className={inputClass} />
                            </Field>
                        </div>
                        </ScrollAreaWithArrows>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Lignes articles</p>
                                <button type="button" onClick={onAddLine} className="text-xs text-brand-navy dark:text-orange-400 font-semibold hover:underline">
                                    + Ligne
                                </button>
                            </div>
                            <div className="rounded-lg border border-slate-200 dark:border-slate-700">
                                <ScrollAreaWithArrows variant="table">
                                <table className="w-full text-xs min-w-[640px]">
                                    <thead className="sticky top-0 z-10">                                        <tr className="bg-slate-50 dark:bg-slate-800/80">
                                            {['Réf', 'Désignation', 'Qte', 'Prix/U', 'Sous-Total', ''].map((h) => (
                                                <th key={h || 'x'} className="px-2 py-2 font-bold uppercase text-slate-500">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {lines.map((line) => (
                                            <tr key={line.key}>
                                                <td className="px-2 py-1.5 w-[140px]">
                                                    <select
                                                        value={line.product_id}
                                                        onChange={(e) => onSelectProduct(line.key, e.target.value)}
                                                        className={lineInput}
                                                    >
                                                        <option value="">— Réf —</option>
                                                        {products.map((p) => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.article_id || p.reference || p.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    <input
                                                        type="text"
                                                        required
                                                        value={line.description}
                                                        onChange={(e) => onLineChange(line.key, 'description', e.target.value)}
                                                        placeholder="Désignation"
                                                        className={`${lineInput} text-left`}
                                                    />
                                                </td>
                                                <td className="px-2 py-1.5 w-20">
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        min="0.001"
                                                        required
                                                        value={line.quantity}
                                                        onChange={(e) => onLineChange(line.key, 'quantity', e.target.value)}
                                                        className={lineInput}
                                                    />
                                                </td>
                                                <td className="px-2 py-1.5 w-24">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        required
                                                        value={line.unit_price}
                                                        onChange={(e) => onLineChange(line.key, 'unit_price', e.target.value)}
                                                        className={lineInput}
                                                    />
                                                </td>
                                                <td className="px-2 py-1.5 text-center font-semibold tabular-nums w-28">
                                                    {formatMontant(lineSubtotal(line))}
                                                </td>
                                                <td className="px-2 py-1.5 w-10">
                                                    {lines.length > 1 && (
                                                        <button type="button" onClick={() => onRemoveLine(line.key)} className="p-1 text-red-400 hover:text-red-600">
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </ScrollAreaWithArrows>
                            </div>
                            <div className="flex justify-end mt-3 text-sm">
                                <span>Total : <strong className="tabular-nums text-brand-navy dark:text-orange-400">{formatMontant(total)}</strong></span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                        <button type="button" onClick={onClose} className="btn-secondary text-xs px-4">Fermer</button>
                        <button type="submit" disabled={saving} className="btn-primary text-xs px-4">
                            {saving ? '...' : 'Valider'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function BonCommandePage() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [meta, setMeta] = useState({ next_ref: 'BC-…' });
    const [form, setForm] = useState(emptyHeader);
    const [lines, setLines] = useState([emptyLine()]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const flatRows = useMemo(() => {
        const out = [];
        rows.forEach((order) => {
            const items = order.items?.length
                ? order.items
                : [{
                    article_ref: order.article_ref,
                    description: order.designation,
                    quantity: order.quantity,
                    unit_price: order.unit_price,
                    total: order.subtotal,
                }];
            items.forEach((item, idx) => {
                out.push({
                    key: `${order.id}-${item.id || idx}`,
                    order_id: order.id,
                    order_date: order.order_date,
                    reference: order.reference,
                    fournisseur: order.fournisseur,
                    city: order.city,
                    article_ref: item.article_ref,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    sous_total: item.total ?? (Number(item.quantity) * Number(item.unit_price)),
                    order,
                });
            });
        });
        return out;
    }, [rows]);

    const load = useCallback(() => {
        setLoading(true);
        Promise.all([
            api.get('/purchase-orders', { params: { all: 1, doc_type: 'bon_commande' } }),
            api.get('/suppliers', { params: { all: 1 } }),
            api.get('/products', { params: { all: 1 } }),
        ])
            .then(([ordersRes, suppliersRes, productsRes]) => {
                setRows(ordersRes.data.data ?? []);
                setMeta(ordersRes.data.meta ?? { next_ref: 'BC-…' });
                setSuppliers(suppliersRes.data.data ?? []);
                setProducts(productsRes.data.data ?? []);
            })
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const onChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));
    const onLineChange = (key, field, value) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
    const onAddLine = () => setLines((prev) => [...prev, emptyLine()]);
    const onRemoveLine = (key) => setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));

    const onSelectProduct = (lineKey, productId) => {
        const product = products.find((p) => String(p.id) === String(productId));
        if (!product) {
            onLineChange(lineKey, 'product_id', '');
            setLines((prev) => prev.map((l) => (l.key === lineKey
                ? { ...l, product_id: '', article_ref: '', description: '', unit: '' }
                : l)));
            return;
        }
        setLines((prev) => prev.map((l) => (l.key === lineKey
            ? {
                ...l,
                product_id: product.id,
                article_ref: product.article_id || product.reference || '',
                description: product.name || '',
                unit: product.unit || '',
            }
            : l)));
    };

    const openAjouter = () => {
        setForm({
            ...emptyHeader,
            order_date: new Date().toISOString().slice(0, 10),
            _ref: '',
        });
        setLines([emptyLine()]);
        setEditingId(null);
        setError('');
        load();
        setModalOpen(true);
    };

    const openEdit = (order) => {
        setForm({
            supplier_id: order.supplier_id || '',
            order_date: order.order_date_raw || '',
            city: order.city || '',
            _ref: order.reference || '',
        });
        setLines((order.items?.length ? order.items : [{
            description: order.designation,
            article_ref: order.article_ref,
            quantity: order.quantity,
            unit_price: order.unit_price,
            product_id: '',
            unit: order.unit,
        }]).map((i) => ({
            key: `${i.id || Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            product_id: i.product_id || '',
            article_ref: i.article_ref || '',
            description: i.description || '',
            unit: i.unit || '',
            quantity: String(i.quantity ?? 1),
            unit_price: String(i.unit_price ?? ''),
        })));
        setEditingId(order.id);
        setError('');
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingId(null);
        setError('');
        setForm(emptyHeader);
        setLines([emptyLine()]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const validLines = lines.filter((l) => l.description?.trim());
        if (!validLines.length) {
            setError('Ajoutez au moins un article avec une désignation');
            return;
        }
        setSaving(true);
        const payload = {
            supplier_id: form.supplier_id,
            order_date: form.order_date || new Date().toISOString().slice(0, 10),
            doc_type: 'bon_commande',
            city: form.city || null,
            status: 'valide',
            items: validLines.map((l) => ({
                product_id: l.product_id || null,
                article_ref: l.article_ref || null,
                description: l.description,
                unit: l.unit || null,
                quantity: parseFloat(String(l.quantity).replace(',', '.')) || 1,
                unit_price: parseFloat(String(l.unit_price).replace(',', '.')) || 0,
            })),
        };
        try {
            if (editingId) {
                await api.put(`/purchase-orders/${editingId}`, payload);
            } else {
                await api.post('/purchase-orders', payload);
            }
            closeModal();
            load();
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de la validation');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (order) => {
        if (!window.confirm(`Supprimer le bon de commande « ${order.reference} » ?`)) return;
        try {
            await api.delete(`/purchase-orders/${order.id}`);
            if (selectedId === order.id) setSelectedId(null);
            if (editingId === order.id) closeModal();
            load();
        } catch {
            setError('Impossible de supprimer ce bon de commande');
        }
    };

    const handlePrint = () => {
        if (selectedId) {
            const selected = flatRows.filter((r) => r.order_id === selectedId);
            openPrintable(selected.length ? selected : flatRows);
            return;
        }
        openPrintable(flatRows);
    };

    const headers = ['Date', 'N° Bn Cmd', 'Fournisseur', 'Ville Liv', 'Réf', 'Désignation', 'Qte', 'Prix/U', 'Sous-Total', ''];

    return (
        <div className="space-y-4">
            <FormPanel
                open={modalOpen}
                form={form}
                lines={lines}
                meta={meta}
                editingId={editingId}
                saving={saving}
                error={error}
                suppliers={suppliers}
                products={products}
                onChange={onChange}
                onLineChange={onLineChange}
                onSelectProduct={onSelectProduct}
                onAddLine={onAddLine}
                onRemoveLine={onRemoveLine}
                onClose={closeModal}
                onSubmit={handleSubmit}
            />

            <div className="flex flex-wrap items-center gap-2.5">
                <button type="button" onClick={openAjouter} className="btn-primary text-sm">
                    <Plus className="w-4 h-4" /> Ajouter
                </button>
                <button type="button" onClick={handlePrint} className="btn-secondary text-sm">
                    <Printer className="w-4 h-4" /> Imprimer
                </button>
                <button type="button" onClick={() => navigate('/')} className="btn-danger text-sm">
                    <XCircle className="w-4 h-4" /> Fermer
                </button>
            </div>

            <div className="glass-card rounded-2xl shadow-card border border-slate-200/60 dark:border-slate-700/60">
                <div className="px-5 py-3.5 bg-gradient-to-r from-brand-navy via-blue-800 to-indigo-900 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Tableau des Bons de Commande</h3>
                </div>
                <ScrollAreaWithArrows variant="table" deps={[flatRows.length, loading]}>
                    <table className="w-full text-sm min-w-[1100px]">
                        <thead className="sticky top-0 z-10">                            <tr className="bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                                {headers.map((h) => (
                                    <th key={h || 'act'} className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap text-center">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                [...Array(4)].map((_, i) => (
                                    <tr key={i}>
                                        {[...Array(10)].map((__, j) => (
                                            <td key={j} className="px-3 py-3 text-center">
                                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[80px]" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : flatRows.length ? (
                                flatRows.map((row) => (
                                    <tr
                                        key={row.key}
                                        onClick={() => setSelectedId(row.order_id)}
                                        className={`cursor-pointer hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors ${selectedId === row.order_id ? 'bg-blue-50/70 dark:bg-blue-900/20' : ''}`}
                                    >
                                        <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.order_date || '—'}</td>
                                        <td className="px-3 py-2.5 text-center font-mono text-xs font-semibold text-brand-navy dark:text-orange-400">{row.reference || '—'}</td>
                                        <td className="px-3 py-2.5 text-center font-medium text-slate-800 dark:text-white">{row.fournisseur || '—'}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.city || '—'}</td>
                                        <td className="px-3 py-2.5 text-center font-mono text-xs text-slate-600 dark:text-slate-300">{row.article_ref || '—'}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-700 dark:text-slate-200">{row.description || '—'}</td>
                                        <td className="px-3 py-2.5 text-center tabular-nums font-semibold">{row.quantity ?? '—'}</td>
                                        <td className="px-3 py-2.5 text-center tabular-nums">{formatMontant(row.unit_price)}</td>
                                        <td className="px-3 py-2.5 text-center tabular-nums font-semibold text-brand-navy dark:text-orange-400">{formatMontant(row.sous_total)}</td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center justify-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    title="Modifier"
                                                    onClick={() => openEdit(row.order)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/30"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    title="Supprimer"
                                                    onClick={() => handleDelete(row.order)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                                        Aucun bon de commande — cliquez sur Ajouter
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
