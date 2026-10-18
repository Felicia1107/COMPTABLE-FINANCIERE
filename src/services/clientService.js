import axios from 'axios';

const authApi = axios.create({
    baseURL: '/api/api/v1',
});

export async function login(username, password) {
    const response = await authApi.post('/auth/tokens', {
        userName: username,
        password: password
    });

    const token = response.data.token;
    localStorage.setItem('token', token);

    return token;
}