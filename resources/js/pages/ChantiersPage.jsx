import { useEffect, useState } from 'react';
import { Plus, Search, Archive, FileDown } from 'lucide-react';
import api from '../lib/api';

const statusLabels = { planifie: 'En préparation', en_cours: 'En cours', suspendu: 'Suspendu', termine: 'Terminé', annule: 'Annulé' };

export default function ChantiersPage() {
    const [data, setData] = useState({ data: [] });
    const [search, setSearch] = useState('');

    const load = () => api.get('/chantiers', { params: { search } }).then((r) => setData(r.data));
    useEffect(() => { load(); }, [search]);

    const archive = async (id) => {
        await api.post(`/chantiers/${id}/archive`);
        load();
    };

    const exportCsv = () => window.open('/api/reports/export/chantiers?format=csv&token=' + (localStorage.getItem('socimpro_token') || localStorage.getItem('batixpert_token') || localStorage.getItem('autopilote_token')));


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestion des chantiers</h1>
                    <p className="text-slate-500 text-sm mt-1">Suivi complet de vos projets BTP</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportCsv} className="btn-secondary text-sm"><FileDown className="w-4 h-4" /> Export</button>
                    <button className="btn-primary text-sm"><Plus className="w-4 h-4" /> Nouveau chantier</button>
                </div>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Recherche avancée..." className="input-field pl-10" />
            </div>

            <div className="glass-card overflow-hidden shadow-card">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-bold uppercase text-slate-500">
                        <tr>
                            <th className="px-5 py-3 text-left">N° Chantier</th>
                            <th className="px-5 py-3 text-left">Nom</th>
                            <th className="px-5 py-3 text-left">Client</th>
                            <th className="px-5 py-3 text-left">Ville</th>
                            <th className="px-5 py-3 text-center">Progression</th>
                            <th className="px-5 py-3 text-center">Statut</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.data?.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                <td className="px-5 py-3 font-mono text-xs">{c.reference}</td>
                                <td className="px-5 py-3 font-medium text-slate-800 dark:text-white">{c.name}</td>
                                <td className="px-5 py-3">{c.client?.name}</td>
                                <td className="px-5 py-3">{c.city}</td>
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-2 justify-center">
                                        <div className="w-16 bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                            <div className="bg-brand-orange h-2 rounded-full" style={{ width: `${c.progress}%` }} />
                                        </div>
                                        <span className="text-xs">{c.progress}%</span>
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-center">
                                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                        {statusLabels[c.status] || c.status}
                                    </span>
                                </td>
                                <td className="px-5 py-3 text-right">
                                    <button onClick={() => archive(c.id)} className="text-slate-500 hover:text-brand-orange" title="Archiver"><Archive className="w-4 h-4 inline" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
