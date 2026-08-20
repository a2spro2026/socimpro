import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, Eye, EyeOff, ArrowRight, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function PasswordField({ value, onChange, showPassword, onToggle }) {
    const [focused, setFocused] = useState(false);
    const hasValue = value.length > 0;

    return (
        <div className="relative">
            <label htmlFor="password" className="field-label-form">
                Mot de passe
            </label>
            <motion.div
                animate={{
                    scale: focused ? 1.01 : 1,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="relative"
            >
                {/* Halo lumineux au focus */}
                <AnimatePresence>
                    {focused && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute -inset-1 rounded-xl bg-gradient-to-r from-brand-orange/30 via-amber-400/20 to-brand-navy/30 blur-md pointer-events-none"
                        />
                    )}
                </AnimatePresence>

                <div
                    className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                        focused
                            ? 'border-brand-orange password-field-active bg-gradient-to-r from-orange-50/80 to-white'
                            : hasValue
                                ? 'border-brand-navy/40 bg-white'
                                : 'border-slate-300 bg-white'
                    }`}
                >
                    {/* Ligne de scan sécurité */}
                    {focused && (
                        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-orange to-transparent password-scan-line pointer-events-none z-10" />
                    )}

                    <Lock
                        className={`absolute left-3.5 top-1/2 w-4 h-4 pointer-events-none transition-colors duration-300 ${
                            focused ? 'password-lock-active' : 'text-slate-400 -translate-y-1/2'
                        }`}
                    />

                    <input
                        id="password"
                        name="socimpro-password"
                        type={showPassword ? 'text' : 'password'}
                        value={value}
                        onChange={onChange}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        placeholder="Votre mot de passe"
                        required
                        autoComplete="new-password"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        data-lpignore="true"
                        data-1p-ignore="true"
                        className="relative z-[1] block w-full pl-11 pr-11 py-3 text-sm text-slate-900 bg-transparent outline-none placeholder:text-slate-400"
                    />

                    <motion.button
                        type="button"
                        onClick={onToggle}
                        whileTap={{ scale: 0.9 }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-[2] p-1 rounded-lg text-slate-400 hover:text-brand-orange hover:bg-orange-50 transition-colors"
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                                key={showPassword ? 'hide' : 'show'}
                                initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
                                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
                                transition={{ duration: 0.2 }}
                                className="block"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </motion.span>
                        </AnimatePresence>
                    </motion.button>
                </div>

                {/* Indicateur force visuelle (points animés) */}
                <AnimatePresence>
                    {hasValue && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-1.5 mt-2 px-1"
                        >
                            {[1, 2, 3, 4].map((i) => (
                                <motion.div
                                    key={i}
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: value.length >= i * 2 ? 1 : 0.3 }}
                                    className={`h-1 flex-1 rounded-full origin-left transition-colors duration-300 ${
                                        value.length >= i * 3
                                            ? 'bg-gradient-to-r from-brand-orange to-amber-500'
                                            : value.length >= i * 2
                                                ? 'bg-brand-navy/50'
                                                : 'bg-slate-200'
                                    }`}
                                />
                            ))}
                            <span className="text-[10px] text-slate-400 ml-1 shrink-0">
                                {focused ? 'Saisie sécurisée' : ''}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}

export default function Login() {
    const [status, setStatus] = useState('administrateur');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password, status);
            setEmail('');
            setPassword('');
            navigate('/');
        } catch (err) {
            setError(
                err.response?.data?.errors?.status?.[0]
                || err.response?.data?.errors?.email?.[0]
                || err.response?.data?.message
                || 'Identifiants incorrects'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex flex-col overflow-hidden">
            {/* Arrière-plan */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
                style={{ backgroundImage: "url('/images/login-bg.png')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/55 via-slate-900/25 to-slate-900/75" />

            {/* Particules décoratives */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 rounded-full bg-brand-orange/40"
                        style={{ left: `${15 + i * 14}%`, top: `${20 + (i % 3) * 25}%` }}
                        animate={{
                            y: [0, -30, 0],
                            opacity: [0.2, 0.6, 0.2],
                            scale: [1, 1.5, 1],
                        }}
                        transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
                    />
                ))}
            </div>

            {/* Contenu principal */}
            <div className="relative z-10 flex-1 flex items-center p-4 sm:p-8 lg:p-12">
                <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                    <div className="hidden lg:block" aria-hidden="true" />

                    {/* Carte connexion — droite */}
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.15, type: 'spring', stiffness: 120 }}
                        className="login-card-wrapper w-full max-w-[460px] mx-auto lg:ml-auto lg:-mr-8 xl:-mr-20"
                    >
                        {/* Bordure animée */}
                        <div className="relative p-[2px] rounded-2xl login-card-border">
                            <motion.div
                                whileHover={{ scale: 1.01 }}
                                transition={{ type: 'spring', stiffness: 300 }}
                                className="relative login-card-shine login-card-glow bg-white/95 backdrop-blur-xl rounded-[14px] p-8 border border-white/50 overflow-hidden"
                            >
                                {/* Reflet coin */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand-orange/10 to-transparent rounded-bl-full pointer-events-none" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-brand-navy/10 to-transparent rounded-tr-full pointer-events-none" />

                                <div className="relative z-[2]">
                                    <motion.div
                                        className="text-center mb-6"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                    >
                                        <motion.div
                                            animate={{ rotate: [0, 5, -5, 0] }}
                                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-orange via-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-orange-500/40"
                                        >
                                            <Lock className="w-6 h-6 text-white drop-shadow" />
                                        </motion.div>
                                        <h2 className="text-xl font-bold text-slate-800 flex items-center justify-center gap-2">
                                            Bienvenue !
                                            <Sparkles className="w-4 h-4 text-brand-orange" />
                                        </h2>
                                        <p className="text-slate-500 text-sm mt-0.5">Connectez-vous à votre espace SOCIMPRO</p>
                                    </motion.div>

                                    <form
                                        onSubmit={handleSubmit}
                                        className="space-y-4"
                                        autoComplete="off"
                                        autoCorrect="off"
                                        autoCapitalize="off"
                                        spellCheck={false}
                                    >
                                        <AnimatePresence>
                                            {error && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className="p-2.5 rounded-lg bg-red-50 text-red-600 text-sm text-center border border-red-100"
                                                >
                                                    {error}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Champs leurres pour bloquer l'autofill navigateur */}
                                        <input type="text" name="prevent_autofill_user" autoComplete="username" tabIndex={-1} aria-hidden="true" className="absolute opacity-0 h-0 w-0 pointer-events-none" />
                                        <input type="password" name="prevent_autofill_pass" autoComplete="current-password" tabIndex={-1} aria-hidden="true" className="absolute opacity-0 h-0 w-0 pointer-events-none" />

                                        <div>
                                            <label htmlFor="status" className="field-label-form">
                                                Statut
                                            </label>
                                            <div className="relative rounded-xl border-2 border-slate-300 overflow-hidden transition-all duration-300 focus-within:border-brand-navy focus-within:shadow-[0_0_20px_rgba(30,58,95,0.2)]">
                                                <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                                <select
                                                    id="status"
                                                    name="socimpro-status"
                                                    value={status}
                                                    onChange={(e) => setStatus(e.target.value)}
                                                    required
                                                    autoComplete="off"
                                                    className="block w-full pl-11 pr-10 py-3 text-sm text-slate-900 bg-white outline-none appearance-none cursor-pointer"
                                                >
                                                    <option value="administrateur">Administrateur</option>
                                                    <option value="commercial">Commercial</option>
                                                    <option value="facturation">Facturation</option>
                                                </select>
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">⌄</span>
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="email" className="field-label-form">
                                                Nom d'utilisateur
                                            </label>
                                            <motion.div
                                                animate={{ scale: emailFocused ? 1.01 : 1 }}
                                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                                className={`relative rounded-xl border-2 transition-all duration-300 overflow-hidden ${
                                                    emailFocused
                                                        ? 'border-brand-navy shadow-[0_0_20px_rgba(30,58,95,0.2)]'
                                                        : 'border-slate-300'
                                                }`}
                                            >
                                                <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${emailFocused ? 'text-brand-navy' : 'text-slate-400'}`} />
                                                <input
                                                    id="email"
                                                    name="socimpro-login"
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    onFocus={() => setEmailFocused(true)}
                                                    onBlur={() => setEmailFocused(false)}
                                                    placeholder="Votre email"
                                                    required
                                                    autoComplete="off"
                                                    autoCorrect="off"
                                                    autoCapitalize="off"
                                                    spellCheck={false}
                                                    data-lpignore="true"
                                                    data-1p-ignore="true"
                                                    className="block w-full pl-11 pr-3 py-3 text-sm text-slate-900 bg-white outline-none placeholder:text-slate-400"
                                                />
                                            </motion.div>
                                        </div>

                                        <PasswordField
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            showPassword={showPassword}
                                            onToggle={() => setShowPassword(!showPassword)}
                                        />

                                        <motion.button
                                            type="submit"
                                            disabled={loading}
                                            whileHover={{ scale: loading ? 1 : 1.02, boxShadow: '0 20px 40px rgba(249,115,22,0.35)' }}
                                            whileTap={{ scale: loading ? 1 : 0.98 }}
                                            className="relative w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-navy via-blue-800 to-brand-orange text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg overflow-hidden group"
                                        >
                                            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                            <span className="relative flex items-center gap-2">
                                                {loading ? (
                                                    <>
                                                        <motion.span
                                                            animate={{ rotate: 360 }}
                                                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                                        />
                                                        Connexion...
                                                    </>
                                                ) : (
                                                    <>Se connecter <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                                                )}
                                            </span>
                                        </motion.button>
                                    </form>

                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.6 }}
                                        className="mt-5 flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-slate-50 text-xs text-slate-600 border border-blue-100/80"
                                    >
                                        <Shield className="w-4 h-4 text-brand-navy shrink-0" />
                                        Connexion sécurisée — vos données sont protégées.
                                    </motion.div>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Pied de page A2SPRO */}
            <footer className="relative z-10 py-4 px-6 text-center">
                <p className="text-xs text-white/50 tracking-wide">
                    Créé par{' '}
                    <span className="text-brand-orange font-bold tracking-wider">A2SPRO</span>
                    <span className="mx-2 text-white/30">—</span>
                    <span className="text-white/70 font-semibold">A2S</span>
                    <span className="mx-2 text-white/30">|</span>
                    Tous droits réservés
                </p>
            </footer>
        </div>
    );
}
