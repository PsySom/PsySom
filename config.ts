
/**
 * IdeaFlow 3.0 Configuration Manager
 * Hardcoded infrastructure identifiers for Sovereign Neural Vault persistence.
 */

export const config = {
  googleClientId: "740140552049-7j1ve6g0up8ue01edmi9ti4bmecdfsdl.apps.googleusercontent.com",
  googleApiKey: "AIzaSyDpLDQBAUlnQ35_EB0dLDErbLQgto3PF1Q", 
  geminiApiKey: "AIzaSyDpLDQBAUlnQ35_EB0dLDErbLQgto3PF1Q",
};

/**
 * Validates the core configuration state.
 * Throws errors if critical infrastructure identifiers are missing.
 */
export const validateConfig = () => {
  if (!config.googleClientId) {
    throw new Error("IdeaFlow Error: Google Client ID is invalid or not configured.");
  }
};
