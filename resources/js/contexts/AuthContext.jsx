import { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/api';

const TOKEN_KEY = 'socimpro_token';
const USER_KEY = 'socimpro_user';
const LEGACY_KEYS = [
    'batixpert_token', 'batixpert_user',
    'autopilote_token', 'autopilote_user',
];

function readToken() {
    return localStorage.getItem(TOKEN_KEY)
        || localStorage.getItem('batixpert_token')
        || localStorage.getItem('autopilote_token');
}

function readUser() {
    const raw = localStorage.getItem(USER_KEY)
        || localStorage.getItem('batixpert_user')
        || localStorage.getItem('autopilote_user');
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function clearAuthStorage() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
}

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => readUser());
    const [loading, setLoading] = useState(!!readToken());

    useEffect(() => {
        const token = readToken();
        if (token) {
            // Migrate legacy keys to socimpro_*
            localStorage.setItem(TOKEN_KEY, token);
            api.get('/user')
                .then((r) => {
                    setUser(r.data);
                    localStorage.setItem(USER_KEY, JSON.stringify(r.data));
                })
                .catch(() => {
                    clearAuthStorage();
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password, status) => {
        const { data } = await api.post('/login', { email, password, status });
        clearAuthStorage();
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
    };

    const logout = async () => {
        try { await api.post('/logout'); } catch {}
        clearAuthStorage();
        setUser(null);
    };

    const can = (permission) => user?.is_admin || user?.permissions?.includes(permission);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, can }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
