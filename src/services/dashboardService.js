import apiClient from "./api";

const REVENUE_ACCOUNTS = {
  prefix: "7", 
  exact: [700000, 700100, 700200], 
};

const EXPENSE_ACCOUNTS = {
  prefix: "6", 
  exact: [600000, 600100, 600200],
};

/**
 * Récupère les données financières pour le dashboard
 * @param {number} year - Année à filtrer
 * @returns {Promise<Array>} - Tableau de données par mois
 */
const getFinancialDashboardData = async (year) => {
  try {
  
    const response = await apiClient.get(
      `/models/GL_Journal?$filter=GL_Category_ID eq 1000000&$expand=GL_JournalLine`
    );

    const journals = response.records || [];

    const monthsData = Array(12)
      .fill()
      .map((_, index) => ({
        month: index,
        revenue: 0,
        expenses: 0,
        netResult: 0,
      }));

    journals.forEach((journal) => {
      const journalDate = new Date(journal.DateAcct);
      if (journalDate.getFullYear() !== year) return;

      const monthIndex = journalDate.getMonth();

      (journal.GL_JournalLine || []).forEach((line) => {
        const accountId = line.Account_ID.identifier.toString();

        if (isRevenueAccount(accountId)) {
          monthsData[monthIndex].revenue +=
            (line.AmtSourceCr || 0) - (line.AmtSourceDr || 0);
        } else if (isExpenseAccount(accountId)) {
          monthsData[monthIndex].expenses +=
            (line.AmtSourceDr || 0) - (line.AmtSourceCr || 0);
        }
      });
    });

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
