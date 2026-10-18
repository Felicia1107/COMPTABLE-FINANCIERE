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
        <h1>Import</h1>
        <form @submit.prevent="importerFichiers">
            <div class="form-group">
                <label for="compteFileInput">Import Compte (fichier 2) :</label>
                <input type="file" id="compteFileInput" accept=".csv" @change="handleCompteChange" /><br />

                <label for="ecritureFileInput">Import Écriture (fichier 1) :</label>
                <input type="file" id="ecritureFileInput" accept=".csv" @change="handleEcritureChange" /><br />
            </div>
            <button type="submit">Importer</button>
        </form>

        <div v-if="compteData.length" class="preview">
            <h2>Données Compte</h2>
            <table border="1">
                <thead>
                    <tr>
                        <th v-for="(value, key) in compteData[0]" :key="key">
                            {{ key }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(row, index) in compteData" :key="index"
                        :style="{ backgroundColor: !!row.existeDeja ? 'red' : 'inherit' }">
                        <td v-for="(value, key) in row" :key="key">
                            {{ value }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div v-if="ecritureData.length" class="preview">
            <h2>Données Écriture</h2>
            <table border="1">
                <thead>
                    <tr>
                        <th v-for="(value, key) in ecritureData[0]" :key="key">
                            {{ key }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(row, index) in ecritureData" :key="index"
                        :style="{ backgroundColor: !!row.dateValide ? 'inherit' : 'red' }">
                        <td v-for="(value, key) in row" :key="key">
                            {{ value }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <button v-if="ecritureData.length" type="button" @click="validData">
            Valider
        </button>

        <!-- <div class="tooltip-container" style="position: relative; display: inline-block;">
            <button v-if="ecritureData.length" type="button" @click="validData" :disabled="validationBloquee"
                @mouseover="showTooltip = validationBloquee" @mouseleave="showTooltip = false">
                Valider
            </button>

            <div v-if="validationBloquee && showTooltip" class="tooltip-message" style="
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background-color: #f44336;
      color: white;
      padding: 6px 10px;
      border-radius: 4px;
      white-space: nowrap;
      font-size: 13px;
      margin-bottom: 4px;
      z-index: 10;
    ">
                Corriger les erreurs des données <br> pour valider les données
            </div>
        </div> -->
    </div>
</template>
  
<script setup>
import { ref, computed } from 'vue'
import compteService from '@/services/compteService.js'
import journalService from '@/services/journalService.js'

const compteFile = ref(null)
const ecritureFile = ref(null)

const compteData = ref([])
const ecritureData = ref([])

const showTooltip = ref(false)

const validationBloquee = computed(() => {
    const compteInvalide = compteData.value.some(c => c.existeDeja === true)
    const ecritureInvalide = ecritureData.value.some(e => e.dateValide === false)
    return compteInvalide && ecritureInvalide
})

function handleCompteChange(event) {
    compteFile.value = event.target.files[0]
}

function handleEcritureChange(event) {
    ecritureFile.value = event.target.files[0]
}

async function importerFichiers() {
    if (compteFile.value) {
        compteData.value = await lireCSV(compteFile.value, true, false)
    }

    if (ecritureFile.value) {
        ecritureData.value = await lireCSV(ecritureFile.value, false, true)
    }
}

async function lireCSV(file, checkCompte, checkEcriture) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = async (event) => {
            try {
                const text = event.target.result
                const rows = text.trim().split('\n')
                const headers = rows[0].split(',').map(h => h.trim())

                const rawData = rows.slice(1).map(row => {
                    const values = row.split(',').map(v => v.trim())
                    const obj = {}

                    headers.forEach((header, index) => {
                        let value = values[index]

                        if (header.toLowerCase() === 'date') {
                            obj.dateValide = estDateValide(value);

                            if (!obj.dateValide) {
                                alert(`Date inexistante: ${value} à la ligne ${rows.indexOf(row)}`);
                            }

                            value = formatDateForPostgres(value)
                        }

                        obj[header] = value
                    })

                    return obj
                })

                if (checkCompte) {
                    const dataWithCheck = await Promise.all(
                        rawData.map(async (obj) => {
                            const existe = await compteService.compteExist(obj.compte)
                            return { ...obj, existeDeja: Boolean(existe) }
                        })
                    )
                    resolve(dataWithCheck)
                } else {
                    resolve(rawData)
                }
            } catch (e) {
                reject(e)
            }
        }

        reader.onerror = reject
        reader.readAsText(file)
    })
}


function formatDateForPostgres(dateStr) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} 00:00:00`;
}

function estDateValide(dateStr) {
    if (!dateStr) return false;

    const [day, month, year] = dateStr.split('/').map(Number);
    const inputDate = new Date(year, month - 1, day);

    const dateMin = new Date(2001, 0, 1);
    const dateMax = new Date();

    return inputDate >= dateMin && inputDate <= dateMax;
}

async function validData() {
    // Création des comptes avec await pour attendre chaque opération
    for (const compte of compteData.value) {
        await compteService.createCompte(compte); // Ajout de await
    }

    let lastReference = null;
    let currentLine = 10;

    for (const ecriture of ecritureData.value) {
        try {
            // Si la référence change, réinitialiser le compteur de ligne
            if (ecriture.reference !== lastReference) {
                lastReference = ecriture.reference;
                currentLine = 10;
            }

            // Vérification de l'existence du journal
            const exist = await journalService.journalExist(ecriture.reference);

            // Vérification du compte
            const compte = await compteService.getCompteById(ecriture.compte);
            if (!compte || !compte.records || compte.records.length === 0) {
                console.error(`Compte introuvable pour l'écriture :`, ecriture);
                continue; // Passer à l'écriture suivante en cas d'erreur
            }

            // Simplification de la vérification de dateValide
            if (ecriture.dateValide !== false) {
                let journal;

                if (!exist || exist.length === 0) {
                    // Créer un nouveau journal si aucun n'existe
                    ecriture.line = currentLine;
                    journal = await journalService.createJournal(ecriture);
                    console.log(`Journal créé :`, journal);
                } else {
                    // Utiliser le journal existant
                    journal = exist[0];
                }

                // Créer la ligne de journal
                await journalService.createJournalLine(ecriture, journal, compte.records[0], currentLine);
            }

            currentLine += 10; // Incrémenter pour la prochaine ligne
        } catch (error) {
            console.error(`Erreur lors du traitement de l'écriture :`, ecriture, error);
            continue; // Continuer avec l'écriture suivante en cas d'erreur
        }
    }
}

</script>
  
<style scoped>
.preview {
    margin-top: 20px;
}

table {
    border-collapse: collapse;
    width: 100%;
}

th,
td {
    padding: 8px;
    text-align: left;
}
</style>
  