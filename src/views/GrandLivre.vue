<script setup>
import { ref, computed, onMounted } from 'vue';
import journalService from '@/services/journalService.js';


const grandLivre = ref([]);
const error = ref(null);
const dateMin = ref(null);
const dateMax = ref(null);
const referenceFilter = ref('');

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount || 0);
};

const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
};

const resetFilters = () => {
    dateMin.value = null;
    dateMax.value = null;
    referenceFilter.value = '';
};

const groupedJournals = computed(() => {
    const grouped = {};

    const filteredJournals = grandLivre.value.filter(journal => {
        let matches = true;

        const journalDate = new Date(journal.DateAcct);
        if (dateMin.value) {
            const minDate = new Date(dateMin.value);
            matches = matches && journalDate >= minDate;
        }
        if (dateMax.value) {
            const maxDate = new Date(dateMax.value);
            maxDate.setHours(23, 59, 59, 999); // Inclure toute la journée
            matches = matches && journalDate <= maxDate;
        }

        if (referenceFilter.value) {
            const refLower = referenceFilter.value.toLowerCase();
            matches =
                matches &&
                ((journal.Description || '').toLowerCase().includes(refLower) ||
                    (journal.DocumentNo || '').toLowerCase().includes(refLower));
        }

        return matches;
    });

    filteredJournals.forEach(journal => {
        (journal.GL_JournalLine || []).forEach(line => {
            const accountName = line.Account_ID?.identifier || 'Compte inconnu';
            if (!grouped[accountName]) {
                grouped[accountName] = {
                    lines: [],
                    runningBalances: [],
                    totalDebit: 0,
                    totalCredit: 0,
                };
            }

            const lineData = {
                ...line,
                journalDescription: journal.Description || 'N/A',
                DocumentNo: journal.DocumentNo || 'N/A',
                DateAcct: line.DateAcct || journal.DateAcct,
            };

            grouped[accountName].lines.push(lineData);
            grouped[accountName].totalDebit += line.AmtAcctDr || 0;
            grouped[accountName].totalCredit += line.AmtAcctCr || 0;
        });
    });

    Object.values(grouped).forEach(group => {
        group.lines.sort((a, b) => {
            const dateA = new Date(a.DateAcct);
            const dateB = new Date(b.DateAcct);
            return dateA - dateB || a.Line - b.Line;
        });

        let runningBalance = 0;
        group.runningBalances = group.lines.map(line => {
            runningBalance += (line.AmtAcctCr || 0) - (line.AmtAcctDr || 0);
            return runningBalance;
        });
    });

    return grouped;
});

const grandLivreTotals = computed(() => {
    let totalDebit = 0;
    let totalCredit = 0;

    Object.values(groupedJournals.value).forEach(group => {
        totalDebit += group.totalDebit;
        totalCredit += group.totalCredit;
    });

    return {
        totalDebit,
        totalCredit,
    };
});

onMounted(async () => {
    try {
        const grandLivreResponse = await journalService.getGrandLivre();
        const rawResponse = grandLivreResponse || [];
        grandLivre.value = rawResponse;
        console.log('Données Grand Livre:', grandLivre.value);
    } catch (err) {
        error.value = 'Erreur lors du chargement du Grand Livre';
        console.error('Erreur API:', err.response ? err.response.data : err.message);
    }
});
</script>

<template>
    <div class="row h-100">
        <div class="col-2 bg-light">
            <div class="container mt-3" id="navbarNav">
                <ul class="navbar-nav">
                    <li class="nav-item">
                        <router-link to="/balance" class="nav-link">Balance</router-link>
                    </li>
                    <li class="nav-item">
                        <router-link to="/grandLivre" class="nav-link">Grand Livre</router-link>
                    </li>
                    <li class="nav-item">
                        <router-link to="/dashboard" class="nav-link">Dashboard</router-link>
                    </li>
                    <li class="nav-item">
                        <router-link to="/import" class="nav-link">Import</router-link>
                    </li>
                </ul>
            </div>
        </div>

        <div class="col-10 p-4">
            <h1 class="mb-4">Grand Livre Général</h1>
            <div v-if="error" class="alert alert-danger">{{ error }}</div>

            <!-- Filtres Bootstrap -->
            <div class="row mb-4 g-3 align-items-end">
                <div class="col-md-3">
                    <label for="dateMin" class="form-label">Date min :</label>
                    <input type="date" v-model="dateMin" id="dateMin" class="form-control form-control-sm" />
                </div>
                <div class="col-md-3">
                    <label for="dateMax" class="form-label">Date max :</label>
                    <input type="date" v-model="dateMax" id="dateMax" class="form-control form-control-sm" />
                </div>
                <div class="col-md-4">
                    <label for="reference" class="form-label">Libellé/Référence pièce :</label>
                    <input type="text" v-model="referenceFilter" id="reference" class="form-control form-control-sm"
                        placeholder="REF01, 1046..." />
                </div>
                <div class="col-md-2">
                    <button @click="resetFilters" class="btn btn-outline-secondary w-100">Réinitialiser</button>
                </div>
            </div>

            <!-- Comptes avec tables Bootstrap -->
            <div v-for="(accountGroup, accountName) in groupedJournals" :key="accountName" class="mb-5">
                <h2 class="mb-3">{{ accountName }}</h2>
                <div class="table-responsive">
                    <table class="table table-sm table-bordered table-hover table-striped">
                        <thead class="table-light">
                            <tr>
                                <th>Date</th>
                                <th>Document No</th>
                                <th>Libellé</th>
                                <th class="text-end">Débit</th>
                                <th class="text-end">Crédit</th>
                                <th class="text-end">Solde</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(line, index) in accountGroup.lines" :key="line.id">
                                <td>{{ formatDate(line.DateAcct) }}</td>
                                <td>{{ line.DocumentNo }}</td>
                                <td>{{ line.journalDescription || 'N/A' }}</td>
                                <td class="text-end">{{ formatCurrency(line.AmtAcctDr) }}</td>
                                <td class="text-end">{{ formatCurrency(line.AmtAcctCr) }}</td>
                                <td class="text-end">{{ formatCurrency(accountGroup.runningBalances[index]) }}</td>
                            </tr>
                        </tbody>
                        <tfoot class="table-group-divider">
                            <tr>
                                <td colspan="3" class="text-end fw-bold">Total</td>
                                <td class="text-end fw-bold">{{ formatCurrency(accountGroup.totalDebit) }}</td>
                                <td class="text-end fw-bold">{{ formatCurrency(accountGroup.totalCredit) }}</td>
                                <td class="text-end fw-bold">{{ formatCurrency(accountGroup.totalCredit -
                                    accountGroup.totalDebit) }}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <!-- Total général -->
            <div v-if="Object.keys(groupedJournals).length" class="mt-5">
                <div class="table-responsive">
                    <table class="table table-sm table-bordered">
                        <tfoot>
                            <tr class="table-primary">
                                <td colspan="3" class="text-end fw-bold fs-5">Total Grand Livre</td>
                                <td class="text-end fw-bold fs-5">{{ formatCurrency(grandLivreTotals.totalDebit) }}</td>
                                <td class="text-end fw-bold fs-5">{{ formatCurrency(grandLivreTotals.totalCredit) }}
                                </td>
                                <td class="text-end fw-bold fs-5">{{ formatCurrency(grandLivreTotals.totalDebit -
                                    grandLivreTotals.totalCredit) }}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    </div>
</template>

<style></style>