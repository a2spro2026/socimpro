import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, Eye, EyeOff, ArrowRight, Shield, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const isDeveloperLogin = (() => {
        const v = email.trim().toLowerCase();
        return v === 'zerragui' || v === 'zerragui@socimpro.com';
    })();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password, status || undefined);
            setEmail('');
            setPassword('');
            setStatus('');
            setOpen(false);
            navigate('/');
        } catch (err) {
            setError(
                err.response?.data?.errors?.status?.[0]
                || err.response?.data?.errors?.email?.[0]
                || err.response?.data?.errors?.password?.[0]
                || err.response?.data?.message
                || 'Identifiants incorrects'
            );
        } finally {
            setLoading(false);
        }
    };

    const closePanel = () => {
        setOpen(false);
        setError('');
    };

    const fieldClass =
        'w-full rounded-xl border-2 border-slate-200 bg-white text-slate-900 text-sm py-3 pl-11 pr-3 outline-none placeholder:text-slate-400 focus:border-[#F26522] transition-colors';

    return (
        <div className="relative min-h-screen flex flex-col overflow-hidden bg-[#1a1a1a]">
            <img
                src="/images/login-bg.png?v=6"
                alt="SOCIMPRO — Solutions pour la construction moderne"
                className="absolute inset-0 w-full h-full object-cover object-[center_28%] select-none pointer-events-none"
                decoding="async"
                fetchPriority="high"
            />

            {/* Bouton en haut à droite */}
            <div className="relative z-20 flex items-start justify-end p-5 sm:p-8 lg:p-10">
                <motion.button
                    type="button"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setOpen(true)}
                    className="px-7 py-3.5 rounded-xl bg-[#F26522] text-white text-base font-bold tracking-wide shadow-2xl shadow-orange-900/50 hover:brightness-110 transition ring-4 ring-white/30"
                >
                    Se connecter
                </motion.button>
            </div>
            <div className="relative z-10 flex-1" aria-hidden="true" />

            <footer className="relative z-10 py-3 px-6 text-center pointer-events-none">
                <p className="text-xs text-white/75 tracking-wide drop-shadow">
                    Créé par <span className="text-[#F26522] font-bold">A2SPRO</span>
                    <span className="mx-2 text-white/35">—</span>
                    <span className="text-white font-semibold">A2S</span>
                </p>
            </footer>

            {/* Panneau de connexion (modal) */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55"
                        onClick={closePanel}
                    >
                        <motion.form
                            key="panel"
                            onSubmit={handleSubmit}
                            initial={{ opacity: 0, y: 24, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 16, scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-[400px] rounded-2xl bg-white p-7 shadow-2xl space-y-4"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-xl font-bold text-[#3A3A3A]">Connexion</h2>
                                    <p className="text-sm text-slate-500 mt-0.5">Espace sécurisé SOCIMPRO</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closePanel}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                                    aria-label="Fermer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <input type="text" name="prevent_autofill_user" autoComplete="username" tabIndex={-1} aria-hidden="true" className="absolute opacity-0 h-0 w-0 pointer-events-none" />
                            <input type="password" name="prevent_autofill_pass" autoComplete="current-password" tabIndex={-1} aria-hidden="true" className="absolute opacity-0 h-0 w-0 pointer-events-none" />

                            <AnimatePresence>
                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="text-sm text-red-600 text-center bg-red-50 border border-red-100 rounded-lg py-2 px-3"
                                    >
                                        {error}
                                    </motion.p>
                                )}
                            </AnimatePresence>

                            <div>
                                <label htmlFor="status" className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    Statut
                                </label>
                                <div className="relative">
                                    <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    <select
                                        id="status"
                                        name="socimpro-status"
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        required={!isDeveloperLogin}
                                        autoComplete="off"
                                        className={`${fieldClass} appearance-none cursor-pointer`}
                                    >
                                        <option value="" disabled>
                                            — Sélectionner —
                                        </option>
                                        <option value="administrateur">Administrateur</option>
                                        <option value="commercial">Commercial</option>
                                        <option value="facturation">Facturation</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    Nom d&apos;utilisateur
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    <input
                                        id="email"
                                        name="socimpro-login"
                                        type="text"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Votre login"
                                        required
                                        autoComplete="off"
                                        className={fieldClass}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    Mot de passe
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    <input
                                        id="password"
                                        name="socimpro-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Votre mot de passe"
                                        required
                                        autoComplete="off"
                                        className={`${fieldClass} pr-11`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#F26522]"
                                        aria-label={showPassword ? 'Masquer' : 'Afficher'}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-1 py-3 rounded-xl bg-gradient-to-r from-[#3A3A3A] to-[#F26522] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg"
                            >
                                {loading ? 'Connexion...' : <>Se connecter <ArrowRight className="w-4 h-4" /></>}
                            </button>
                        </motion.form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
