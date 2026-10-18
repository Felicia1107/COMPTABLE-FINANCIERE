import apiClient from "./api";

const getGrandLivre = async () => {
  try {
    const response = await apiClient.get(
      `/models/GL_Journal?$filter=GL_Category_ID%20eq%201000000&$expand=GL_JournalLine`
    );
    // console.log('Réponse API:', response.records);
    return response.records;
  } catch (error) {
    console.error(
      "Erreur lors de la requête API:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};

const createJournal = async (data) => {
  try {
    const dateIso = data.date.replace(" ", "T");
    const c_p_id = await findPeriodId(dateIso);

    // if (c_p_id !== null && c_p_id !== undefined) {
    const journal = {
      AD_Client_ID: 11,
      AD_Org_ID: 11,
      C_AcctSchema_ID: 101,
      C_DocType_ID: 115,
      C_Period_ID: c_p_id,
      Description: data.reference,
      PostingType: "A",
      GL_Category_ID: 1000000,
      DateAcct: dateIso,
      DateDoc: dateIso,
    };
    console.log("Journal à créer :", journal);

    const response = await apiClient.post("/models/GL_Journal", journal);
    return response;
    // }
  } catch (error) {
    console.error("Erreur lors de la création du journal :", {
      error: error.message,
      stack: error.stack,
    });
    throw new Error(`Échec de la création du journal : ${error.message}`);
  }
};
// mamorona journaline
const createJournalLine = async (data, journal, compte, line) => {
  try {
    const dateIso = data.date.replace(" ", "T");
    const c_p_id = await findPeriodId(dateIso);

    const journalline = {
      AD_Client_ID: 11,
      AD_Org_ID: 11,
      GL_Journal_ID: journal.id,
      Account_ID: compte.id,
      Line: line,
      C_Currency_ID: 100,
      DateAcct: dateIso,
      AmtAcctDr: Number(data.debit),
      AmtAcctCr: Number(data.credit),
      AmtSourceDr: Number(data.debit),
      AmtSourceCr: Number(data.credit),
    };
    console.log("Journal Line à créer :", journalline);

    const response = await apiClient.post(
      "/models/GL_JournalLine",
      journalline
    );
    // console.log('Journal Line created:', response);
    return response;
  } catch (error) {
    console.error("Erreur lors de la création du journal Line :", {
      error: error.message,
      stack: error.stack,
    });
    throw new Error(`Échec de la création du journal Line : ${error.message}`);
  }
};

const findPeriodId = async (date) => {
  const isoDate = new Date(date).toISOString().split(".")[0];
  const response = await apiClient.get(`/models/C_Period`, {
    params: {
      $filter: `IsActive eq true and StartDate le ${isoDate} and EndDate ge ${isoDate}`,
    },
  });

  // console.log(response)

  if (response.records && response.records.length > 0) {
    return response.records[0].id; // ou .C_Period_ID selon ta structure
  }

  throw new Error(`Aucune période active ouverte trouvée pour la date ${date}`);
};

const journalExist = async (value) => {
  try {
    const response = await apiClient.get(
      `/models/GL_Journal?$filter=Description eq '${value}' AND IsActive eq true`
    );
    return response.records || [];
  } catch (error) {
    console.error("Erreur lors de la vérification du journal :", error);
    return []; // retourne toujours un tableau pour éviter les erreurs
  }
};

export default {
  getGrandLivre,
  createJournal,
  journalExist,
  findPeriodId,
  createJournalLine,
};
