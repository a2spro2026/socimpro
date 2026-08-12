import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Send, CheckCircle, Plus, Trash2, Printer, ChevronUp, ChevronDown } from 'lucide-react';
import api from '../../lib/api';
import DesignationPicker from '../../components/DesignationPicker';
import ScrollAreaWithArrows from '../../components/ScrollAreaWithArrows';
import {
    CONSISTANCE_OPTIONS,
    UNIT_OPTIONS,
    TYPE_OPTIONS,
    emptyHeader,
    newLine,
    parseDelayInput,
    formatDelaySave,
    lineSubtotal,
    calcTotals,
    mapRowToLines,
    openPrintable,
} from './devisUtils';

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
const readOnlyClass = 'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 px-2 py-1.5 text-xs text-center cursor-not-allowed min-w-0';
const readOnlyCompact = `${readOnlyClass} py-1 text-[11px]`;
const lineInputClass = 'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2 py-1.5 text-xs text-center outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy min-w-0';
const typeTravauxFilledClass = '!bg-yellow-100 dark:!bg-yellow-900/35 !border-yellow-300 dark:!border-yellow-600/50 !text-brand-navy dark:!text-blue-400 font-semibold';
const subtotalFrameClass = 'inline-block min-w-[72px] px-2 py-1 rounded-md border border-brand-navy/35 dark:border-blue-500/40 bg-slate-50 dark:bg-slate-800/80 font-semibold tabular-nums text-brand-navy dark:text-violet-400 text-xs';

export default function DevisFormPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isNew = !id;

    const [header, setHeader] = useState({ ...emptyHeader, quote_date: new Date().toISOString().slice(0, 10) });
    const [lines, setLines] = useState([newLine()]);
    const [clients, setClients] = useState([]);
    const [products, setProducts] = useState([]);
    const [meta, setMeta] = useState({ next_ref: '—', date: '—' });
    const [reference, setReference] = useState('—');
    const [statut, setStatut] = useState('');
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const linesScrollRef = useRef(null);
    const [canScrollUp, setCanScrollUp] = useState(false);
    const [canScrollDown, setCanScrollDown] = useState(false);

    const updateScrollState = () => {
        const el = linesScrollRef.current;
        if (!el) return;
        setCanScrollUp(el.scrollTop > 4);
        setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
    };

    useEffect(() => {
        updateScrollState();
    }, [lines.length]);

    const totalHt = useMemo(
        () => lines.reduce((sum, line) => sum + lineSubtotal(line), 0),
        [lines],
    );

    const { tva, totalTtc } = useMemo(() => calcTotals(totalHt), [totalHt]);

    const isValidated = statut === 'Validé';

    useEffect(() => {
        Promise.all([
            api.get('/clients', { params: { all: 1 } }),
            api.get('/products', { params: { all: 1 } }),
            api.get('/quotes', { params: { all: 1 } }),
        ]).then(([clientsRes, productsRes, quotesRes]) => {
            setClients(clientsRes.data.data ?? []);
            setProducts(productsRes.data.data ?? []);
            const m = quotesRes.data.meta ?? { next_ref: '—', date: new Date().toLocaleDateString('fr-FR') };
            setMeta(m);
            if (isNew) {
                setReference(m.next_ref);
                setHeader((h) => ({ ...h, quote_date: new Date().toISOString().slice(0, 10) }));
            }
        }).catch(() => {});
    }, [isNew]);

    useEffect(() => {
        if (isNew) return;

        setLoading(true);
        api.get(`/quotes/${id}`)
            .then(({ data }) => {
                setHeader({
                    client_id: data.client_id || '',
                    quote_date: data.quote_date_raw || '',
                    contact: data.contact || '',
                    city: data.city || '',
                    chantier_type: data.chantier_type || '',
                    budget: data.budget ?? '',
                    work_delay: parseDelayInput(data.work_delay),
                });
                setLines(mapRowToLines(data));
                setReference(data.reference);
                setStatut(data.statut || '');
            })
            .catch(() => setError('Impossible de charger ce devis'))
            .finally(() => setLoading(false));
    }, [id, isNew]);

    const setH = (key, value) => setHeader((h) => ({ ...h, [key]: value }));

    const updateLine = (index, key, value) => {
        setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [key]: value } : line)));
    };

    const handleDesignationSelect = (index, product) => {
        setLines((prev) => prev.map((line, i) => (
            i === index
                ? {
                    ...line,
                    designation: product.name,
                    consistance: product.consistance || line.consistance,
                    unit: product.unit || line.unit,
                }
                : line
        )));
    };

    const addLine = () => {
        setLines((prev) => [...prev, newLine()]);
        requestAnimationFrame(() => {
            const el = linesScrollRef.current;
            if (el) {
                el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
                updateScrollState();
            }
        });
    };
    const removeLine = (index) => setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));

    const scrollLines = (direction) => {
        const el = linesScrollRef.current;
        if (!el) return;
        el.scrollBy({ top: direction * 52, behavior: 'smooth' });
        requestAnimationFrame(updateScrollState);
    };

    const handleClientChange = (clientId) => {
        const client = clients.find((c) => String(c.id) === String(clientId));
        setHeader((h) => ({
            ...h,
            client_id: clientId,
            contact: client?.phone || client?.contact || h.contact,
            city: client?.city || h.city,
            chantier_type: client?.chantier_type || h.chantier_type,
            budget: client?.budget ?? h.budget,
            work_delay: parseDelayInput(client?.work_delay) || h.work_delay,
        }));
    };

    const buildPayload = () => ({
        client_id: header.client_id,
        quote_date: header.quote_date || new Date().toISOString().slice(0, 10),
        contact: header.contact || null,
        city: header.city || null,
        chantier_type: header.chantier_type || null,
        budget: parseFloat(header.budget) || 0,
        work_delay: formatDelaySave(header.work_delay),
        items: lines
            .filter((line) => line.designation?.trim())
            .map((line) => ({
                type_travaux: line.type_travaux?.trim() || null,
                designation: line.designation.trim(),
                consistance: line.consistance || null,
                unit: line.unit || null,
                quantity: parseFloat(line.quantity) || 1,
                unit_price: parseFloat(line.unit_price) || 0,
            })),
    });

    const goToList = () => navigate('/clients/devis');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const payload = buildPayload();
        if (!payload.items.length) {
            setError('Ajoutez au moins une ligne produit au devis');
            return;
        }

        setSaving(true);
        try {
            if (isNew) {
                await api.post('/quotes', payload);
            } else {
                await api.put(`/quotes/${id}`, payload);
            }
            goToList();
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
        } finally {
            setSaving(false);
        }
    };

    const ensureSaved = async () => {
        const payload = buildPayload();
        if (!payload.items.length) throw new Error('no_items');
        if (!isNew) return id;
        const { data } = await api.post('/quotes', payload);
        return data.id;
    };

    const handleValidate = async () => {
        setError('');
        setSuccess('');
        setSaving(true);
        try {
            const quoteId = await ensureSaved();
            const { data } = await api.post(`/quotes/${quoteId}/validate`);
            setSuccess(data.message);
            setTimeout(goToList, 1200);
        } catch (err) {
            if (err.message === 'no_items') {
                setError('Ajoutez au moins une ligne produit avant de valider');
            } else {
                setError(err.response?.data?.message || 'Impossible de valider le devis');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleSend = async () => {
        setError('');
        setSuccess('');
        setSaving(true);
        try {
            const quoteId = await ensureSaved();
            const { data } = await api.post(`/quotes/${quoteId}/send`);
            setSuccess(data.message);
        } catch (err) {
            if (err.message === 'no_items') {
                setError('Ajoutez au moins une ligne produit avant d\'envoyer');
            } else {
                setError(err.response?.data?.message || 'Impossible d\'envoyer le devis');
            }
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = () => {
        const client = clients.find((c) => String(c.id) === String(header.client_id));
        const items = lines
            .filter((line) => line.designation?.trim())
            .map((line) => ({
                type_travaux: line.type_travaux?.trim() || '',
                designation: line.designation.trim(),
                consistance: line.consistance,
                unit: line.unit,
                quantity: parseFloat(line.quantity) || 1,
                unit_price: parseFloat(line.unit_price) || 0,
                subtotal: lineSubtotal(line),
            }));

        openPrintable({
            reference,
            quote_date: meta.date,
            client_name: client?.name,
            contact: header.contact,
            city: header.city,
            chantier_type: header.chantier_type,
            budget: parseFloat(header.budget) || 0,
            work_delay: formatDelaySave(header.work_delay),
            statut: statut || 'En Attente',
            items,
            subtotal: totalHt,
            tva,
            total_ttc: totalTtc,
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-10.5rem)] min-h-0">
            <button type="button" onClick={goToList} className="btn-secondary text-sm shrink-0 self-start mb-3">
                <ArrowLeft className="w-4 h-4" />
                Retour à la liste
            </button>

            <form onSubmit={handleSubmit} className="glass-card p-4 lg:p-5 shadow-card border border-slate-200/60 dark:border-slate-700/60 flex flex-col flex-1 min-h-0 overflow-hidden">
                {error && (
                    <div className="mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-100 dark:border-red-800 shrink-0">{error}</div>
                )}
                {success && (
                    <div className="mb-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm border border-emerald-100 dark:border-emerald-800 shrink-0">{success}</div>
                )}
                {!isNew && (
                    <div className="mb-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-medium border border-amber-200 dark:border-amber-800 shrink-0">
                        {isValidated ? 'Devis validé — consultation uniquement' : 'Mode modification — Mettez à jour puis enregistrez'}
                    </div>
                )}

                <ScrollAreaWithArrows className="shrink-0">
                    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid xl:grid-cols-[92px_72px_minmax(100px,0.9fr)_minmax(68px,0.6fr)_0.75fr_96px_0.75fr_80px] gap-2 items-end min-w-[900px]">
                        <Field label="Date" compact>
                            <input type="text" readOnly value={meta.date} className={readOnlyCompact} />
                        </Field>
                        <Field label="Réf Devis" compact>
                            <input type="text" readOnly value={reference} className={readOnlyCompact} />
                        </Field>
                        <Field label="Nom Client" compact>
                            <select required disabled={isValidated} value={header.client_id} onChange={(e) => handleClientChange(e.target.value)} className={`${inputCompact} text-[11px]`}>
                                <option value="">— Sélectionner —</option>
                                {clients.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Contact" compact>
                            <input type="text" disabled={isValidated} value={header.contact} onChange={(e) => setH('contact', e.target.value)} placeholder="Contact" className={inputCompact} />
                        </Field>
                        <Field label="Ville">
                            <input type="text" disabled={isValidated} value={header.city} onChange={(e) => setH('city', e.target.value)} placeholder="Ville" className={inputClass} />
                        </Field>
                        <Field label="Type Chantier">
                            <select disabled={isValidated} value={header.chantier_type} onChange={(e) => setH('chantier_type', e.target.value)} className={inputClass}>
                                {TYPE_OPTIONS.map((v) => <option key={v || 'e'} value={v}>{v || '—'}</option>)}
                            </select>
                        </Field>
                        <Field label="Budget" compact>
                            <input type="number" step="0.01" min="0" disabled={isValidated} value={header.budget} onChange={(e) => setH('budget', e.target.value)} placeholder="0.00" className={inputCompact} />
                        </Field>
                        <Field label="Délai" compact>
                            <div className="relative flex items-center">
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    disabled={isValidated}
                                    value={header.work_delay}
                                    onChange={(e) => setH('work_delay', e.target.value)}
                                    placeholder="0"
                                    className={`${inputCompact} pr-7 text-[10px] px-1`}
                                />
                                <span className="absolute right-1 text-[9px] font-bold text-slate-400 pointer-events-none">Jrs</span>
                            </div>
                        </Field>
                    </div>
                </ScrollAreaWithArrows>

                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col flex-1 min-h-0">
                    <div className="flex shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
                        <div className="flex-1 min-w-0 flex flex-col">
                            <table className="w-full text-sm table-fixed">
                                <colgroup>
                                    <col className="w-[23%]" />
                                    <col className="w-[32%]" />
                                    <col className="w-[9%]" />
                                    <col className="w-[8%]" />
                                    <col className="w-[7%]" />
                                    <col className="w-[8%]" />
                                    <col className="w-[13%]" />
                                    <col className="w-8" />
                                </colgroup>
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                        {['Type Travaux', 'Désignation Travaux', 'Consistance', 'Unité', 'Qté', 'Prix HT', 'Sous-Total HT'].map((h) => (
                                            <th
                                                key={h}
                                                className={`px-2 py-2 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap text-center ${
                                                    h === 'Type Travaux'
                                                        ? 'text-brand-navy dark:text-blue-400'
                                                        : 'text-slate-500 dark:text-slate-400'
                                                }`}
                                            >
                                                {h}
                                            </th>
                                        ))}
                                        <th className="w-8 px-0.5 py-2 text-center">
                                            {!isValidated && (
                                                <button
                                                    type="button"
                                                    title="Ajouter une ligne"
                                                    onClick={addLine}
                                                    className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-colors"
                                                >
                                                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                                                </button>
                                            )}
                                        </th>
                                    </tr>
                                </thead>
                            </table>

                            <div
                                ref={linesScrollRef}
                                onScroll={updateScrollState}
                                className="h-[min(360px,48vh)] overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                            >
                                <table className="w-full text-sm table-fixed">
                                    <colgroup>
                                        <col className="w-[23%]" />
                                        <col className="w-[32%]" />
                                        <col className="w-[9%]" />
                                        <col className="w-[8%]" />
                                        <col className="w-[7%]" />
                                        <col className="w-[8%]" />
                                        <col className="w-[13%]" />
                                        <col className="w-8" />
                                    </colgroup>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {lines.map((line, index) => {
                                            const sub = lineSubtotal(line);
                                            const hasTypeTravaux = Boolean(line.type_travaux?.trim());
                                            return (
                                                <tr key={line._key} className="hover:bg-violet-50/30 dark:hover:bg-slate-800/30">
                                                    <td className="px-2 py-1.5">
                                                        <input
                                                            type="text"
                                                            disabled={isValidated}
                                                            value={line.type_travaux}
                                                            onChange={(e) => updateLine(index, 'type_travaux', e.target.value)}
                                                            placeholder="Type Travaux"
                                                            className={isValidated
                                                                ? `${readOnlyClass}${hasTypeTravaux ? ` ${typeTravauxFilledClass}` : ''}`
                                                                : `${lineInputClass}${hasTypeTravaux ? ` ${typeTravauxFilledClass}` : ''}`}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        {isValidated ? (
                                                            <input type="text" readOnly value={line.designation} className={readOnlyClass} />
                                                        ) : (
                                                            <DesignationPicker
                                                                products={products}
                                                                value={line.designation}
                                                                onSelect={(product) => handleDesignationSelect(index, product)}
                                                                placeholder="— Sélectionner travaux —"
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="px-1 py-1.5">
                                                        <select disabled={isValidated} value={line.consistance} onChange={(e) => updateLine(index, 'consistance', e.target.value)} className={lineInputClass}>
                                                            {CONSISTANCE_OPTIONS.map((v) => <option key={v || 'e'} value={v}>{v || '—'}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="px-1 py-1.5">
                                                        <select disabled={isValidated} value={line.unit} onChange={(e) => updateLine(index, 'unit', e.target.value)} className={lineInputClass}>
                                                            {UNIT_OPTIONS.map((v) => <option key={v || 'e'} value={v}>{v || '—'}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="px-1 py-1.5">
                                                        <input type="number" step="0.001" min="0.001" disabled={isValidated} value={line.quantity} onChange={(e) => updateLine(index, 'quantity', e.target.value)} className={lineInputClass} />
                                                    </td>
                                                    <td className="px-1 py-1.5">
                                                        <input type="number" step="0.01" min="0" disabled={isValidated} value={line.unit_price} onChange={(e) => updateLine(index, 'unit_price', e.target.value)} className={lineInputClass} placeholder="0.00" />
                                                    </td>
                                                    <td className="px-1 py-1.5 text-center">
                                                        <span className={subtotalFrameClass}>
                                                            {sub ? `${Math.round(sub).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}.Fcfa` : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="w-8 px-0.5 py-1.5 text-center">
                                                        {!isValidated && lines.length > 1 && (
                                                            <button type="button" title="Supprimer la ligne" onClick={() => removeLine(index)} className="p-1 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex flex-col w-9 shrink-0 bg-slate-200 dark:bg-slate-700 border-l border-slate-300 dark:border-slate-600">
                            <button
                                type="button"
                                title="Défiler vers le haut"
                                onClick={() => scrollLines(-1)}
                                disabled={!canScrollUp}
                                className="h-10 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-35 disabled:cursor-not-allowed border-b border-slate-300 dark:border-slate-600 transition-colors"
                            >
                                <ChevronUp className="w-5 h-5" strokeWidth={2.5} />
                            </button>
                            <div className="flex-1 bg-slate-200 dark:bg-slate-700" />
                            <button
                                type="button"
                                title="Défiler vers le bas"
                                onClick={() => scrollLines(1)}
                                disabled={!canScrollDown}
                                className="h-10 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronDown className="w-5 h-5" strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>

                    <div className="shrink-0 mt-4 flex justify-end pr-10">
                        <div className="min-w-[280px] space-y-1.5 text-sm">
                            <div className="flex items-center justify-between gap-8 px-1">
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total HT</span>
                                <span className="font-bold tabular-nums text-brand-navy dark:text-violet-400">
                                    {`${Math.round(totalHt).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}.Fcfa`}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-8 px-1">
                                <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">TVA 20%</span>
                                <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                                    {`${Math.round(tva).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}.Fcfa`}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-8 px-1 pt-1 border-t border-slate-200 dark:border-slate-700">
                                <span className="text-xs font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">Total TTC</span>
                                <span className="font-bold tabular-nums text-brand-navy dark:text-violet-400 text-base">
                                    {`${Math.round(totalTtc).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}.Fcfa`}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="shrink-0 mt-auto flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    {!isValidated && (
                        <button type="submit" disabled={saving} className="btn-primary text-sm">
                            <Save className="w-4 h-4" />
                            {saving ? 'Enregistrement...' : isNew ? 'Enregistrer' : 'Mettre à jour'}
                        </button>
                    )}
                    {!isValidated && (
                        <button type="button" disabled={saving} onClick={handleValidate} className="btn-primary text-sm bg-emerald-600 hover:bg-emerald-700 border-emerald-600">
                            <CheckCircle className="w-4 h-4" />
                            Valider
                        </button>
                    )}
                    {!isValidated && (
                        <button type="button" disabled={saving} onClick={handleSend} className="btn-secondary text-sm bg-blue-600 hover:bg-blue-700 text-white border-blue-600">
                            <Send className="w-4 h-4" />
                            Envoyer
                        </button>
                    )}
                    <button type="button" onClick={handlePrint} className="btn-secondary text-sm">
                        <Printer className="w-4 h-4" />
                        Imprimer
                    </button>
                    <button type="button" onClick={goToList} className="btn-muted">
                        Annuler
                    </button>
                </div>
            </form>
        </div>
    );
}
