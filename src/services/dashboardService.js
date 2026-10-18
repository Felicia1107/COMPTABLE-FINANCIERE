import apiClient from "./api";

// Comptes de revenus (classe 7) - À adapter selon votre plan comptable
const REVENUE_ACCOUNTS = {
  prefix: "7", // Tous les comptes commençant par 7
  exact: [700000, 700100, 700200], // Comptes spécifiques si nécessaire
};

// Comptes de charges (classe 6) - À adapter selon votre plan comptable
const EXPENSE_ACCOUNTS = {
  prefix: "6", // Tous les comptes commençant par 6
  exact: [600000, 600100, 600200], // Comptes spécifiques si nécessaire
};

/**
 * Récupère les données financières pour le dashboard
 * @param {number} year - Année à filtrer
 * @returns {Promise<Array>} - Tableau de données par mois
 */
const getFinancialDashboardData = async (year) => {
  try {
    // 1. Récupération des données brutes
    const response = await apiClient.get(
      `/models/GL_Journal?$filter=GL_Category_ID eq 1000000&$expand=GL_JournalLine`
    );

    const journals = response.records || [];

    // 2. Initialisation des données mensuelles
    const monthsData = Array(12)
      .fill()
      .map((_, index) => ({
        month: index,
        revenue: 0,
        expenses: 0,
        netResult: 0,
      }));

    // 3. Traitement des données
    journals.forEach((journal) => {
      const journalDate = new Date(journal.DateAcct);
      if (journalDate.getFullYear() !== year) return;

      const monthIndex = journalDate.getMonth();

      (journal.GL_JournalLine || []).forEach((line) => {
        const accountId = line.Account_ID.identifier.toString();

        // Classification des comptes
        if (isRevenueAccount(accountId)) {
          monthsData[monthIndex].revenue +=
            (line.AmtSourceCr || 0) - (line.AmtSourceDr || 0);
        } else if (isExpenseAccount(accountId)) {
          monthsData[monthIndex].expenses +=
            (line.AmtSourceDr || 0) - (line.AmtSourceCr || 0);
        }
      });
    });

    // 4. Calcul des résultats nets
    monthsData.forEach((month) => {
      month.netResult = month.revenue - month.expenses;
    });

    return monthsData;
  } catch (error) {
    console.error("Erreur dans getFinancialDashboardData:", {
      error: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    throw new Error("Erreur lors de la récupération des données du dashboard");
  }
};

// Helpers pour la classification des comptes
function isRevenueAccount(accountId) {
  const isRev =
    accountId.startsWith(REVENUE_ACCOUNTS.prefix) ||
    REVENUE_ACCOUNTS.exact.includes(parseInt(accountId));
  return isRev;
}

function isExpenseAccount(accountId) {
  const isExp =
    accountId.startsWith(EXPENSE_ACCOUNTS.prefix) ||
    EXPENSE_ACCOUNTS.exact.includes(parseInt(accountId));
  return isExp;
}

export default {
  getFinancialDashboardData,
};
