import axios from 'axios';

const TOKEN_KEY = 'socimpro_token';
const USER_KEY = 'socimpro_user';

function readToken() {
    return localStorage.getItem(TOKEN_KEY)
        || localStorage.getItem('batixpert_token')
        || localStorage.getItem('autopilote_token');
}

const api = axios.create({
    baseURL: '/api',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
    const token = readToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (r) => r,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            localStorage.removeItem('batixpert_token');
            localStorage.removeItem('batixpert_user');
            localStorage.removeItem('autopilote_token');
            localStorage.removeItem('autopilote_user');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/app/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
