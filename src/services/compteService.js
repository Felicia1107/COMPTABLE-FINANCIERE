import apiClient from "./api";

// fonction mamorona compte vaovao
const createCompte = async (data) => {
  try {
    if (data.existeDeja !== true) {
      const compte = {
        AD_Client_ID: 11,
        AD_Org_ID: 11,
        Value: data.compte,
        Name: data.libelle,
        AccountType: "A",
        C_Element_ID: 105,
      };

      const response = await apiClient.post("/models/C_ElementValue", compte);
      return response;
    }
    return data;
  } catch (error) {
    console.error("Erreur lors de la création du compte :", {
      error: error.message,
      stack: error.stack,
    });
    throw new Error(`Échec de la création du compte : ${error.message}`);
  }
};
// verification compte existante
const compteExist = async (value) => {
  try {
    const response = await apiClient.get(
      `/models/C_ElementValue?$filter=Value eq '${value}' AND IsActive eq true`
    );
    return Boolean(response?.records?.length);
  } catch (error) {
    console.error("Erreur lors de la vérification du compte :", error);
    return false;
  }
};

const getCompteById = async (value) => {
  try {
    return await apiClient.get(
      `/models/C_ElementValue?$filter=Value eq '${value}' AND IsActive eq true`
    );
  } catch (error) {
    console.error("Erreur lors de la récupération du compte :", error);
    return false;
  }
};

export default {
  createCompte,
  compteExist,
  getCompteById,
};
