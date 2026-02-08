
/**
 * IdeaFlow 3.0 Configuration Manager
 * Hardcoded infrastructure identifiers for Sovereign Neural Vault persistence.
 */

export const config = {
  // These are client IDs for the Google Drive integration
  googleClientId: "740140552049-7j1ve6g0up8ue01edmi9ti4bmecdfsdl.apps.googleusercontent.com",
  googleApiKey: "AIzaSyDpLDQBAUlnQ35_EB0dLDErbLQgto3PF1Q", 
};

/**
 * Validates the core configuration state.
 */
export const validateConfig = () => {
  if (!config.googleClientId) {
    throw new Error("IdeaFlow Error: Google Client ID is invalid or not configured.");
  }
};

/**
 * Checks if the environment has a valid API key selected.
 */
export const checkNeuralAccess = async (): Promise<boolean> => {
  if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
    return await window.aistudio.hasSelectedApiKey();
  }
  return !!process.env.API_KEY;
};
