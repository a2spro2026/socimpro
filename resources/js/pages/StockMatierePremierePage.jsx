import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, XCircle, PlusCircle, Trash2, PackageOpen } from 'lucide-react';
import api from '../lib/api';
import ScrollAreaWithArrows from '../components/ScrollAreaWithArrows';

const UNIT_OPTIONS = ['', 'Kg', 'U', 'Sac', 'ML', 'M²', 'M³', 'Tn', 'M'];

const emptyHeader = {
    receipt_date: '',
    supplier_id: '',
};

const emptyLine = () => ({
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    product_id: '',
    article_ref: '',
    designation: '',
    quantity: '1',
    unit: '',
    unit_price: '',
});

function Field({ label, children, className = '' }) {
    return (
        <div className={`min-w-0 ${className}`}>
            <label className="field-label field-label-compact">{label}</label>
            {children}
        </div>
    );
}

const inputClass =
    'w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-1.5 py-1 text-[11px] text-center outline-none focus:ring-1 focus:ring-brand-navy/30 focus:border-brand-navy transition-all';
const readOnlyClass =
    'w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 px-1.5 py-1 text-[11px] text-center cursor-not-allowed';
const tableInput =
    'w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-1.5 py-1 text-[11px] text-center outline-none focus:ring-1 focus:ring-brand-navy/30 focus:border-brand-navy';

function formatMontant(value) {
    const n = Math.round(Number(value) || 0);
    return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}.Fcfa`;
}

function lineSubtotal(line) {
    const qty = parseFloat(String(line.quantity).replace(',', '.')) || 0;
    const price = parseFloat(String(line.unit_price).replace(',', '.')) || 0;
    return (qty * price).toFixed(2);
}

function FormPanel({
    open,
    form,
    lines,
    currentRef,
    saving,
    error,
    suppliers,
    products,
    onChange,
    updateLine,
    handleSelectProduct,
    addLine,
    removeLine,
    onClose,
    onSubmit,
}) {
    const totalBon = useMemo(
        () => formatMontant(lines.reduce((sum, line) => sum + Number(lineSubtotal(line)), 0)),
        [lines],
    );

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-700"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 shrink-0">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                        Saisie stock matière première — {currentRef}
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

                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 items-end max-w-2xl">
                                <Field label="Date">
                                    <input
                                        type="date"
                                        required
                                        value={form.receipt_date}
                                        onChange={(e) => onChange('receipt_date', e.target.value)}
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="N°">
                                    <input type="text" readOnly value={currentRef} className={readOnlyClass} />
                                </Field>
                                <Field label="Fournisseur">
                                    <select
                                        required
                                        value={form.supplier_id}
                                        onChange={(e) => onChange('supplier_id', e.target.value)}
                                        className={inputClass}
                                    >
                                        <option value="">— Sélectionner —</option>
                                        {suppliers.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </Field>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="px-4 py-2 bg-gradient-to-r from-brand-navy via-blue-800 to-blue-900 flex items-center justify-between">
                                <h3 className="text-xs font-bold text-white uppercase tracking-wide">Lignes matière première</h3>
                                <span className="text-[10px] text-blue-200 font-semibold tabular-nums">Total : {totalBon}</span>
                            </div>
                            <ScrollAreaWithArrows variant="table">
                                <table className="w-full text-sm min-w-[820px]">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm">
                                            {['Réf', 'Désignation', 'Qte', 'U', 'Prix/U', 'Sous-Total'].map((h) => (
                                                <th key={h} className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                            <th className="w-9 px-0.5 py-2 text-center">
                                                <button
                                                    type="button"
                                                    title="Ajouter une ligne"
                                                    onClick={addLine}
                                                    className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                                                </button>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {lines.map((line) => (
                                            <tr key={line.key} className="hover:bg-emerald-50/30 dark:hover:bg-slate-800/30">
                                                <td className="px-2 py-1.5 w-[120px]">
                                                    <select
                                                        value={line.product_id}
                                                        onChange={(e) => handleSelectProduct(line.key, e.target.value)}
                                                        className={tableInput}
                                                    >
                                                        <option value="">— Réf —</option>
                                                        {products.map((p) => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.article_id || p.reference || p.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-2 py-1.5 min-w-[180px]">
                                                    <input
                                                        type="text"
                                                        required
                                                        value={line.designation}
                                                        onChange={(e) => updateLine(line.key, { designation: e.target.value })}
                                                        placeholder="Désignation"
                                                        className={`${tableInput} text-left`}
                                                    />
                                                </td>
                                                <td className="px-2 py-1.5 w-[80px]">
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        min="0.001"
                                                        value={line.quantity}
                                                        onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                                                        className={tableInput}
                                                    />
                                                </td>
                                                <td className="px-2 py-1.5 w-[72px]">
                                                    <select
                                                        value={line.unit}
                                                        onChange={(e) => updateLine(line.key, { unit: e.target.value })}
                                                        className={tableInput}
                                                    >
                                                        {UNIT_OPTIONS.map((v) => (
                                                            <option key={v || 'u'} value={v}>{v || '—'}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-2 py-1.5 w-[95px]">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={line.unit_price}
                                                        onChange={(e) => updateLine(line.key, { unit_price: e.target.value })}
                                                        placeholder="0.00"
                                                        className={tableInput}
                                                    />
                                                </td>
                                                <td className="px-2 py-1.5 w-[95px]">
                                                    <input type="text" readOnly value={lineSubtotal(line)} className={readOnlyClass} />
                                                </td>
                                                <td className="px-2 py-1.5 w-[44px] text-center">
                                                    {lines.length > 1 && (
                                                        <button
                                                            type="button"
                                                            title="Supprimer la ligne"
                                                            onClick={() => removeLine(line.key)}
                                                            className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </ScrollAreaWithArrows>
                            <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                <button
                                    type="button"
                                    onClick={addLine}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    Ajouter ligne
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                        <button type="button" onClick={onClose} className="btn-secondary text-xs px-4">Fermer</button>
                        <button type="submit" disabled={saving} className="btn-primary text-xs px-4">
                            {saving ? 'Validation...' : 'Valider'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function StockMatierePremierePage() {
    const navigate = useNavigate();
    const [form, setForm] = useState(emptyHeader);
    const [lines, setLines] = useState([emptyLine()]);
    const [rows, setRows] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [meta, setMeta] = useState({ next_ref: '—', date_raw: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [panelOpen, setPanelOpen] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        api.get('/raw-material-stock')
            .then((res) => setRows(res.data.data ?? []))
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
        Promise.all([
            api.get('/suppliers', { params: { all: 1 } }),
            api.get('/products', { params: { all: 1 } }),
            api.get('/raw-material-stock/meta'),
        ]).then(([suppliersRes, productsRes, metaRes]) => {
            setSuppliers(suppliersRes.data.data ?? []);
            setProducts(productsRes.data.data ?? []);
            setMeta(metaRes.data ?? { next_ref: '—', date_raw: new Date().toISOString().slice(0, 10) });
        }).catch(() => {});
    }, [load]);

    const onChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));

    const updateLine = (key, patch) => {
        setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
    };

    const handleSelectProduct = (key, productId) => {
        const product = products.find((p) => String(p.id) === String(productId));
        if (!product) {
            updateLine(key, { product_id: '', article_ref: '' });
            return;
        }
        updateLine(key, {
            product_id: productId,
            article_ref: product.article_id || product.reference || '',
            designation: product.name || '',
            unit: product.unit || '',
        });
    };

    const addLine = () => setLines((prev) => [...prev, emptyLine()]);

    const removeLine = (key) => setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));

    const openAjouter = () => {
        setError('');
        setForm({
            receipt_date: meta.date_raw || new Date().toISOString().slice(0, 10),
            supplier_id: '',
        });
        setLines([emptyLine()]);
        setPanelOpen(true);
    };

    const closePanel = () => {
        setPanelOpen(false);
        setError('');
    };

    const handleFermer = () => {
        if (panelOpen) {
            closePanel();
            return;
        }
        navigate('/');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        const validLines = lines.filter((l) => l.designation?.trim());
        if (!validLines.length) {
            setError('Ajoutez au moins une ligne avec une désignation.');
            setSaving(false);
            return;
        }

        const payload = {
            receipt_date: form.receipt_date || new Date().toISOString().slice(0, 10),
            supplier_id: form.supplier_id,
            items: validLines.map((l) => ({
                product_id: l.product_id || null,
                article_ref: l.article_ref || null,
                designation: l.designation.trim(),
                quantity: parseFloat(String(l.quantity).replace(',', '.')) || 1,
                unit: l.unit || null,
                unit_price: parseFloat(String(l.unit_price).replace(',', '.')) || 0,
            })),
        };

        try {
            await api.post('/raw-material-stock', payload);
            const metaRes = await api.get('/raw-material-stock/meta');
            setMeta(metaRes.data ?? meta);
            closePanel();
            load();
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de la validation');
        } finally {
            setSaving(false);
        }
    };

    const totalMontant = useMemo(
        () => rows.reduce((sum, row) => sum + (Number(row.subtotal) || 0), 0),
        [rows],
    );

    const columns = ['Réf', 'Désignation', 'Fournisseur', 'Qte', 'U', 'Prix/U', 'Sous-Total'];

    return (
        <div className="space-y-3">
            <FormPanel
                open={panelOpen}
                form={form}
                lines={lines}
                currentRef={meta.next_ref}
                saving={saving}
                error={error}
                suppliers={suppliers}
                products={products}
                onChange={onChange}
                updateLine={updateLine}
                handleSelectProduct={handleSelectProduct}
                addLine={addLine}
                removeLine={removeLine}
                onClose={closePanel}
                onSubmit={handleSubmit}
            />

            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-lg">
                    <PackageOpen className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Stock Matière Première</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Entrées et suivi des matières premières</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 -mt-1">
                <button type="button" onClick={openAjouter} className="btn-primary text-sm">
                    <Plus className="w-4 h-4" /> Ajouter
                </button>
                <button type="button" onClick={handleFermer} className="btn-danger text-sm">
                    <XCircle className="w-4 h-4" /> Fermer
                </button>

                <div className="ml-auto flex items-center gap-3 px-4 py-2 rounded-xl border shadow-sm bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border-teal-200 dark:border-teal-800">
                    <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total stock</p>
                        <p className="text-base font-bold tabular-nums leading-tight text-teal-700 dark:text-teal-300">
                            {formatMontant(totalMontant)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="glass-card rounded-2xl shadow-card border border-slate-200/60 dark:border-slate-700/60 -mt-1">
                <div className="px-5 py-3.5 rounded-t-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Stock matière première</h3>
                </div>

                <ScrollAreaWithArrows variant="table" height="min(42vh, 380px)" deps={[rows.length, loading]}>
                    <table className="w-full text-sm min-w-[900px]">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-gradient-to-r from-slate-100 via-slate-200/90 to-slate-100 dark:from-slate-800 dark:via-slate-700/80 dark:to-slate-800 border-b-2 border-slate-300 dark:border-slate-600 backdrop-blur-sm">
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
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        {columns.map((__, j) => (
                                            <td key={j} className="px-4 py-3 text-center">
                                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto max-w-[80px]" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : rows.length ? (
                                rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-emerald-50/40 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-2.5 text-center font-mono text-xs font-semibold text-brand-navy dark:text-emerald-400">{row.reference}</td>
                                        <td className="px-4 py-2.5 text-center font-medium text-slate-800 dark:text-white">{row.designation}</td>
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.fournisseur}</td>
                                        <td className="px-4 py-2.5 text-center tabular-nums">{Number(row.quantity).toLocaleString('fr-FR', { maximumFractionDigits: 3 })}</td>
                                        <td className="px-4 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.unit}</td>
                                        <td className="px-4 py-2.5 text-center tabular-nums text-slate-700 dark:text-slate-200">{formatMontant(row.unit_price)}</td>
                                        <td className="px-4 py-2.5 text-center font-semibold tabular-nums text-brand-navy dark:text-emerald-400">{formatMontant(row.subtotal)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                                        Aucune matière première — cliquez sur Ajouter
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
