import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Printer, Download, XCircle, X, Search } from 'lucide-react';
import api from '../lib/api';
import ScrollAreaWithArrows from '../components/ScrollAreaWithArrows';


function ActionBtn({ title, onClick, icon: Icon, color = 'slate' }) {
    const colors = {
        amber: 'hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/30 dark:hover:text-amber-400',
        slate: 'hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200',
        orange: 'hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/30 dark:hover:text-orange-400',
    };
    return (
        <button type="button" title={title} onClick={onClick} className={`p-1.5 rounded-lg text-slate-400 transition-colors ${colors[color]}`}>
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
    );
}

function buildPrintHtml(row, month, daysInMonth) {
    const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => i + 1)
        .map((d) => `<th>${d}</th>`).join('');
    const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1)
        .map((d) => `<td>${row.days?.[d] || ''}</td>`).join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Emploi Opérationnel ${row.full_name}</title>
<style>body{font-family:Arial,sans-serif;padding:24px;color:#1e293b}h1{font-size:18px;color:#1e3a5f}
table{border-collapse:collapse;width:100%;margin-top:12px;font-size:11px}
th,td{border:1px solid #cbd5e1;padding:4px;text-align:center}th{background:#f8fafc}</style></head><body>
<h1>STE SOCIMPRO — Emploi Opérationnel</h1>
<p><strong>${row.full_name}</strong> — ${row.position || '—'} — ${month}</p>
<table><thead><tr><th>ID</th><th>Nom</th><th>Fonction</th>${dayHeaders}</tr></thead>
<tbody><tr><td>${row.matricule || row.id}</td><td>${row.full_name}</td><td>${row.position || '—'}</td>${dayCells}</tr></tbody></table>
<p style="margin-top:8px">P = Présent · A = Absent · <span style="color:#059669;font-weight:700">Nbrs Jrs Actif: ${row.present_count || 0}</span> · <span style="color:#dc2626;font-weight:700">Nbrs Jrs Inactif: ${row.absent_count || 0}</span></p>
</body></html>`;
}

function openPrintable(row, month, daysInMonth) {
    const w = window.open('', '_blank', 'width=1100,height=700');
    if (!w) return;
    w.document.write(buildPrintHtml(row, month, daysInMonth));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
}

function downloadCsv(row, month, daysInMonth) {
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const header = ['Mois', 'ID', 'Nom', 'Fonction', ...days.map(String)].join(';');
    const line = [month, row.matricule || row.id, row.full_name, row.position || '', ...days.map((d) => row.days?.[d] || '')].join(';');
    const blob = new Blob([`${header}\n${line}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emploi-operationnel-${row.matricule || row.id}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function EditPanel({ open, row, daysInMonth, month, saving, onClose, onSave }) {
    const [days, setDays] = useState({});

    useEffect(() => {
        if (row) setDays({ ...(row.days || {}) });
    }, [row]);

    if (!open || !row) return null;

    const toggle = (day) => {
        setDays((prev) => {
            const cur = prev[day];
            const next = cur === 'P' ? 'A' : cur === 'A' ? null : 'P';
            return { ...prev, [day]: next };
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[95vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-brand-navy via-blue-800 to-indigo-900 shrink-0">
                    <div>
                        <p className="text-[10px] text-blue-200 uppercase tracking-wider">Emploi Opérationnel · {month}</p>
                        <h3 className="text-white font-bold text-sm">{row.full_name}</h3>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5 overflow-y-auto flex-1">
                    <p className="text-xs text-slate-500 mb-3">Cliquez sur un jour : vide → P → A → vide</p>
                    <div className="grid grid-cols-7 sm:grid-cols-10 gap-2">
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                            const mark = days[d];
                            const cls = mark === 'P'
                                ? 'bg-emerald-500 text-white border-emerald-600'
                                : mark === 'A'
                                    ? 'bg-red-500 text-white border-red-600'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-600';
                            return (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => toggle(d)}
                                    className={`h-10 rounded-lg border text-xs font-bold transition ${cls}`}
                                >
                                    {d}{mark ? ` · ${mark}` : ''}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                    <button type="button" onClick={onClose} className="btn-secondary text-xs px-4">Fermer</button>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => onSave(row.id, days)}
                        className="btn-primary text-xs px-4"
                    >
                        {saving ? '...' : 'Valider'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function PersonnelEtatPaiementPage() {
    const navigate = useNavigate();
    const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [name, setName] = useState('');
    const [etat, setEtat] = useState('');
    const [rows, setRows] = useState([]);
    const [daysInMonth, setDaysInMonth] = useState(30);
    const [loading, setLoading] = useState(true);
    const [editRow, setEditRow] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(() => {
        setLoading(true);
        const params = { month };
        if (name) params.name = name;
        if (etat) params.etat = etat;
        api.get('/attendances', { params })
            .then((r) => {
                setRows(r.data.data ?? []);
                setDaysInMonth(r.data.days_in_month || 30);
            })
            .catch(() => setRows([]))
            .finally(() => setLoading(false));
    }, [month, name, etat]);

    useEffect(() => { load(); }, [load]);

    const dayHeaders = useMemo(
        () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
        [daysInMonth],
    );

    const handleSave = async (employeeId, days) => {
        setSaving(true);
        setError('');
        try {
            await api.post('/attendances/month', { month, employee_id: employeeId, days });
            setEditRow(null);
            load();
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur enregistrement');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <EditPanel
                open={!!editRow}
                row={editRow}
                daysInMonth={daysInMonth}
                month={month}
                saving={saving}
                onClose={() => setEditRow(null)}
                onSave={handleSave}
            />

            <div className="flex flex-wrap items-center gap-2.5">
                <button type="button" onClick={() => navigate('/')} className="btn-danger text-sm">
                    <XCircle className="w-4 h-4" /> Fermer
                </button>

                <div className="ml-auto flex flex-wrap items-center gap-2">
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-brand-navy/30"
                    />
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nom Personnel"
                            className="pl-8 pr-2 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs w-40 outline-none focus:ring-2 focus:ring-brand-navy/30"
                        />
                    </div>
                    <select
                        value={etat}
                        onChange={(e) => setEtat(e.target.value)}
                        className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs outline-none focus:ring-2 focus:ring-brand-navy/30"
                    >
                        <option value="">État (tous)</option>
                        <option value="present">Présent</option>
                        <option value="absent">Absent</option>
                    </select>
                </div>
            </div>

            {error && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">{error}</div>
            )}

            <div className="glass-card rounded-2xl shadow-card border border-slate-200/60 dark:border-slate-700/60">
                <div className="px-5 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-orange-700 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">Emploi Opérationnel</h3>
                </div>
                <ScrollAreaWithArrows variant="table" deps={[rows.length, loading, daysInMonth]}>
                    <table className="w-full text-sm min-w-[1400px]">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700">
                                {['Date', 'ID', 'Nom Personnel', 'Fonction'].map((h) => (
                                    <th key={h} className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap text-center">{h}</th>
                                ))}
                                {dayHeaders.map((d) => (
                                    <th key={d} className="px-1 py-3 text-[10px] font-bold text-slate-500 text-center w-7">{d}</th>
                                ))}
                                <th className="px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-emerald-600 whitespace-nowrap text-center">Nbrs Jrs Actif</th>
                                <th className="px-2 py-3 text-[10px] font-bold uppercase tracking-wider text-red-600 whitespace-nowrap text-center">Nbrs Jrs Inactif</th>
                                <th className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={7 + daysInMonth} className="px-4 py-10 text-center text-slate-400">Chargement…</td></tr>
                            ) : rows.length ? (
                                rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-orange-50/30 dark:hover:bg-slate-800/40">
                                        <td className="px-3 py-2 text-center text-xs text-slate-600">{row.date}</td>
                                        <td className="px-3 py-2 text-center font-mono text-xs font-semibold text-brand-navy dark:text-orange-400">{row.matricule || row.id}</td>
                                        <td className="px-3 py-2 text-center text-xs font-medium text-slate-800 dark:text-white whitespace-nowrap">{row.full_name}</td>
                                        <td className="px-3 py-2 text-center text-xs text-slate-600">{row.position || '—'}</td>
                                        {dayHeaders.map((d) => {
                                            const mark = row.days?.[d];
                                            return (
                                                <td key={d} className="px-0.5 py-2 text-center">
                                                    <span className={`inline-flex w-5 h-5 items-center justify-center rounded text-[10px] font-bold ${
                                                        mark === 'P' ? 'bg-emerald-100 text-emerald-700' : mark === 'A' ? 'bg-red-100 text-red-700' : 'text-slate-300'
                                                    }`}>
                                                        {mark || '·'}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                        <td className="px-2 py-2 text-center">
                                            <span className="inline-flex min-w-[2rem] justify-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                {row.present_count ?? 0}
                                            </span>
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <span className="inline-flex min-w-[2rem] justify-center px-2 py-0.5 rounded-md text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                                {row.absent_count ?? 0}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center justify-center gap-0.5">
                                                <ActionBtn title="Modifier" icon={Pencil} color="amber" onClick={() => setEditRow(row)} />
                                                <ActionBtn title="Imprimer" icon={Printer} color="slate" onClick={() => openPrintable(row, month, daysInMonth)} />
                                                <ActionBtn title="Télécharger" icon={Download} color="orange" onClick={() => downloadCsv(row, month, daysInMonth)} />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={7 + daysInMonth} className="px-4 py-12 text-center text-slate-400">Aucun personnel actif pour ce mois</td></tr>
                            )}
                        </tbody>
                    </table>
                </ScrollAreaWithArrows>
            </div>
        </div>
    );
}
