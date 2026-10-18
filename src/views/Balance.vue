<script setup>
import { ref, computed, onMounted } from 'vue';
import journalService from '@/services/journalService.js';

const grandLivre = ref([]);
const error = ref(null);
const dateMin = ref(null);
const dateMax = ref(null);
const referenceFilter = ref('');
const showModal = ref(false);
const selectedAccount = ref(null);

// Formater les montants en devise (USD)
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount || 0);
};

// Formater les dates
const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
};

// Réinitialiser les filtres
const resetFilters = () => {
    dateMin.value = null;
    dateMax.value = null;
    referenceFilter.value = '';
};

// Ouvrir la modale
const openModal = (accountName) => {
    selectedAccount.value = accountName;
    showModal.value = true;
};

// Fermer la modale
const closeModal = () => {
    showModal.value = false;
    selectedAccount.value = null;
};

// Données de la balance
const balanceData = computed(() => {
    const grouped = {};

    // Filtrer les journaux
    const filteredJournals = grandLivre.value.filter(journal => {
        let matches = true;

        // Filtre par date
        const journalDate = new Date(journal.DateAcct);
        if (dateMin.value) {
            const minDate = new Date(dateMin.value);
            matches = matches && journalDate >= minDate;
        }
        if (dateMax.value) {
            const maxDate = new Date(dateMax.value);
            maxDate.setHours(23, 59, 59, 999);
            matches = matches && journalDate <= maxDate;
        }

        // Filtre par libellé/référence pièce
        if (referenceFilter.value) {
            const refLower = referenceFilter.value.toLowerCase();
            matches =
                matches &&
                ((journal.Description || '').toLowerCase().includes(refLower) ||
                    (journal.DocumentNo || '').toLowerCase().includes(refLower));
        }

        return matches;
    });

    // Regrouper par compte
    filteredJournals.forEach(journal => {
        (journal.GL_JournalLine || []).forEach(line => {
            const accountName = line.Account_ID?.identifier || 'Compte inconnu';
            if (!grouped[accountName]) {
                grouped[accountName] = {
                    totalDebit: 0,
                    totalCredit: 0,
                };
            }
            grouped[accountName].totalDebit += line.AmtAcctDr || 0;
            grouped[accountName].totalCredit += line.AmtAcctCr || 0;
        });
    });

    // Trier les comptes par nom
    return Object.fromEntries(
        Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
    );
});

// Calculer les totaux généraux de la balance
const balanceTotals = computed(() => {
    let totalDebit = 0;
    let totalCredit = 0;

    Object.values(balanceData.value).forEach(account => {
        totalDebit += account.totalDebit;
        totalCredit += account.totalCredit;
    });

    return {
        totalDebit,
        totalCredit,
    };
});

// Lignes pour le compte sélectionné dans la modale
const accountLines = computed(() => {
    if (!selectedAccount.value) return [];

    const lines = [];

    // Filtrer les journaux
    const filteredJournals = grandLivre.value.filter(journal => {
        let matches = true;

        // Filtre par date
        const journalDate = new Date(journal.DateAcct);
        if (dateMin.value) {
            const minDate = new Date(dateMin.value);
            matches = matches && journalDate >= minDate;
        }
        if (dateMax.value) {
            const maxDate = new Date(dateMax.value);
            maxDate.setHours(23, 59, 59, 999);
            matches = matches && journalDate <= maxDate;
        }

        // Filtre par libellé/référence pièce
        if (referenceFilter.value) {
            const refLower = referenceFilter.value.toLowerCase();
            matches =
                matches &&
                ((journal.Description || '').toLowerCase().includes(refLower) ||
                    (journal.DocumentNo || '').toLowerCase().includes(refLower));
        }

        return matches;
    });

    // Extraire les lignes pour le compte sélectionné
    filteredJournals.forEach(journal => {
        (journal.GL_JournalLine || []).forEach(line => {
            if (line.Account_ID?.identifier === selectedAccount.value) {
                lines.push({
                    ...line,
                    journalDescription: journal.Description || 'N/A',
                    DocumentNo: journal.DocumentNo || 'N/A',
                    DateAcct: line.DateAcct || journal.DateAcct,
                });
            }
        });
    });

    // Trier par date et Line
    return lines.sort((a, b) => {
        const dateA = new Date(a.DateAcct);
        const dateB = new Date(b.DateAcct);
        return dateA - dateB || a.Line - b.Line;
    });
});

// Calculer les soldes courants pour la modale
const runningBalances = computed(() => {
    let runningBalance = 0;
    return accountLines.value.map(line => {
        runningBalance += (line.AmtAcctDr || 0) - (line.AmtAcctCr || 0); // Solde = Débit - Crédit
        return runningBalance;
    });
});

// Calculer les totaux pour la modale
const totalDebit = computed(() => {
    return accountLines.value.reduce((sum, line) => sum + (line.AmtAcctDr || 0), 0);
});
const totalCredit = computed(() => {
    return accountLines.value.reduce((sum, line) => sum + (line.AmtAcctCr || 0), 0);
});

onMounted(async () => {
    try {
        const grandLivreResponse = await journalService.getGrandLivre();
        const rawResponse = grandLivreResponse || [];
        grandLivre.value = rawResponse;
        console.log('Données Balance:', grandLivre.value);
    } catch (err) {
        error.value = 'Erreur lors du chargement de la Balance';
        console.error('Erreur API:', err.response ? err.response.data : err.message);
    }
});
</script>

<template>
    <nav class="navbar">
        <div class="navbar-links">
            <router-link to="/balance">
                <span>Balance</span>
            </router-link>
            <router-link to="/grandLivre">
                <span>GrandLivre</span>
            </router-link>
            <router-link to="/dashboard">
                <span>Dashboard</span>
            </router-link>
            <router-link to="/import">
                <span>Import</span>
            </router-link>
        </div>
    </nav>
    <div>
        <h1>Balance Comptable</h1>
        <div v-if="error" class="error">{{ error }}</div>

        <!-- Tableau de la balance -->
        <table v-if="Object.keys(balanceData).length" border="1">
            <thead>
                <tr>
                    <th>Compte</th>
                    <th>Débit</th>
                    <th>Crédit</th>
                    <th>Solde</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(account, accountName) in balanceData" :key="accountName">
                    <td>
                        <span class="account-link" @click="openModal(accountName)">
                            {{ accountName }}
                        </span>
                    </td>
                    <td>{{ formatCurrency(account.totalDebit) }}</td>
                    <td>{{ formatCurrency(account.totalCredit) }}</td>
                    <td>{{ formatCurrency(account.totalDebit - account.totalCredit) }}</td>
                </tr>
            </tbody>
            <tfoot>
                <tr>
                    <td class="text-right">Total Balance</td>
                    <td>{{ formatCurrency(balanceTotals.totalDebit) }}</td>
                    <td>{{ formatCurrency(balanceTotals.totalCredit) }}</td>
                    <td>{{ formatCurrency(balanceTotals.totalDebit - balanceTotals.totalCredit) }}</td>
                </tr>
            </tfoot>
        </table>
        <div v-else class="no-data">Aucune donnée disponible pour les filtres sélectionnés.</div>

        <!-- Modale pour le grand livre du compte -->
        <div v-if="showModal" class="modal-overlay">
            <div class="modal-content">
                <h2>Grand Livre : {{ selectedAccount }}</h2>
                <table v-if="accountLines.length" border="1">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Document No</th>
                            <th>Libellé</th>
                            <th>Débit</th>
                            <th>Crédit</th>
                            <th>Solde</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(line, index) in accountLines" :key="line.id">
                            <td>{{ formatDate(line.DateAcct) }}</td>
                            <td>{{ line.DocumentNo }}</td>
                            <td>{{ line.journalDescription || 'N/A' }}</td>
                            <td>{{ formatCurrency(line.AmtAcctDr) }}</td>
                            <td>{{ formatCurrency(line.AmtAcctCr) }}</td>
                            <td>{{ formatCurrency(runningBalances[index]) }}</td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3" class="text-right">Total</td>
                            <td>{{ formatCurrency(totalDebit) }}</td>
                            <td>{{ formatCurrency(totalCredit) }}</td>
                            <td>{{ formatCurrency(totalDebit - totalCredit) }}</td>
                        </tr>
                    </tfoot>
                </table>
                <div v-else class="no-data">Aucune transaction pour ce compte avec les filtres sélectionnés.</div>
                <button @click="closeModal" class="close-button">Fermer</button>
            </div>
        </div>
    </div>
</template>


<style scoped>
table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 2rem;
}

th,
td {
    padding: 8px;
    text-align: left;
}

th {
    background-color: #f2f2f2;
}

.error {
    color: red;
    margin-bottom: 1rem;
}

.text-right {
    text-align: right;
}

tfoot {
    font-weight: bold;
    background-color: #e0e0e0;
}

.filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
}

.filter-group {
    display: flex;
    flex-direction: column;
}

.filter-group label {
    margin-bottom: 0.2rem;
}

.filter-group input {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.reset-button {
    padding: 0.5rem 1rem;
    background-color: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.reset-button:hover {
    background-color: #d32f2f;
}

.no-data {
    text-align: center;
    color: #666;
    margin-top: 1rem;
}

.account-link {
    color: #007bff;
    text-decoration: none;
    cursor: pointer;
}

.account-link:hover {
    text-decoration: underline;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    max-width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
}

.close-button {
    display: block;
    margin: 1rem auto 0;
    padding: 0.5rem 1rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.close-button:hover {
    background-color: #0056b3;
}
</style>