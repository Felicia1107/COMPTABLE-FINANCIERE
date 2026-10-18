<script setup>
import { ref } from 'vue'
import { login } from '@/services/clientService'
import { useRouter } from 'vue-router'

const router = useRouter()
const username = ref('')
const password = ref('')

const handleLogin = async () => {
    try {
        const token = await login(username.value, password.value)
        console.log("token Login.vue : " + token)
        router.push('/balance')
        alert('Connexion réussie !')
    } catch (error) {
        console.error(error)
        alert('Échec de la connexion.')
    }
}
</script>

<template>
    <div class="login-container">
        <div class="login-card">
            <h2>Connexion</h2>
            <form @submit.prevent="handleLogin">
                <div class="input-group">
                    <label for="username">Nom d'utilisateur</label>
                    <input 
                        type="text" 
                        id="username" 
                        v-model="username"
                        placeholder="Entrez votre nom d'utilisateur"
                        required
                    />
                </div>
                
                <div class="input-group">
                    <label for="password">Mot de passe</label>
                    <input 
                        type="password" 
                        id="password" 
                        v-model="password"
                        placeholder="••••••••"
                        required
                    />
                </div>
                
                <button type="submit" class="btn btn-success">Se connecter</button>
            </form>
        </div>
    </div>
</template>

<style scoped>
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: #fafcfd;
    /* padding: 20px; */
}

.login-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    padding: 40px;
    width: 100%;
    max-width: 400px;
    transition: transform 0.3s ease;
}

.login-card:hover {
    transform: translateY(-5px);
}

h2 {
    text-align: center;
    color: #2c3e50;
    margin-bottom: 30px;
    font-size: 28px;
}

.input-group {
    margin-bottom: 25px;
}

label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #34495e;
}

input {
    width: 100%;
    padding: 14px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.3s, box-shadow 0.3s;
}

input:focus {
    border-color: #a2c0d5;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
    outline: none;
}

button {
    width: 100%;
    padding: 14px;
    color: rgb(255, 255, 255);
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.3s, transform 0.2s;
}

button:hover {
    background: #008020;
}

button:active {
    transform: scale(0.98);
}

@media (max-width: 480px) {
    .login-card {
        padding: 25px;
    }
    
    h2 {
        font-size: 24px;
    }
}
</style>