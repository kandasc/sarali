"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// Canal+ API Configuration
// Production credentials should be set via environment variables:
// - CANAL_PLUS_PROD_BASE_URL: Production API base URL
// - CANAL_PLUS_PROD_EMAIL: Production API email
// - CANAL_PLUS_PROD_PASSWORD: Production API password
const CANAL_PLUS_CONFIG = {
  TEST: {
    baseUrl: "http://162.19.114.155:8088",
    credentials: {
      email: "guidipress01@gmail.com",
      password: "manager2711",
    },
  },
  PRODUCTION: {
    baseUrl: process.env.CANAL_PLUS_PROD_BASE_URL || "",
    credentials: {
      email: process.env.CANAL_PLUS_PROD_EMAIL || "",
      password: process.env.CANAL_PLUS_PROD_PASSWORD || "",
    },
  },
};

// Token cache - separate for test and production
let cachedTokenTest: { accessToken: string; refreshToken: string; expiresAt: number } | null = null;
let cachedTokenProd: { accessToken: string; refreshToken: string; expiresAt: number } | null = null;

// Helper function to refresh token
async function refreshAuthToken(isProduction: boolean, refreshToken: string): Promise<string> {
  const config = isProduction ? CANAL_PLUS_CONFIG.PRODUCTION : CANAL_PLUS_CONFIG.TEST;
  
  try {
    const response = await fetch(`${config.baseUrl}/auth/refresh-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!response.ok) {
      // If refresh fails, return empty string to trigger full login
      return "";
    }
    
    const data = await response.json();
    
    // Cache the new token
    const newToken = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken || refreshToken, // Keep old refresh token if not provided
      expiresAt: Date.now() + (data.expiresIn * 1000),
    };
    
    if (isProduction) {
      cachedTokenProd = newToken;
    } else {
      cachedTokenTest = newToken;
    }
    
    return data.accessToken;
  } catch {
    // On error, return empty string to trigger full login
    return "";
  }
}

// Helper function to get auth token
async function getAuthToken(isProduction: boolean): Promise<string> {
  const config = isProduction ? CANAL_PLUS_CONFIG.PRODUCTION : CANAL_PLUS_CONFIG.TEST;
  const cachedToken = isProduction ? cachedTokenProd : cachedTokenTest;
  
  // Validate production config
  if (isProduction && (!config.baseUrl || !config.credentials.email || !config.credentials.password)) {
    throw new Error("Production credentials not configured. Please set CANAL_PLUS_PROD_BASE_URL, CANAL_PLUS_PROD_EMAIL, and CANAL_PLUS_PROD_PASSWORD environment variables.");
  }
  
  // Check if we have a valid cached token (with 60 second buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.accessToken;
  }
  
  // If we have a cached token with refresh token but it's expired, try to refresh
  if (cachedToken && cachedToken.refreshToken) {
    const refreshedToken = await refreshAuthToken(isProduction, cachedToken.refreshToken);
    if (refreshedToken) {
      return refreshedToken;
    }
    // If refresh failed, continue to full login below
  }
  
  // Get new token via full login
  const response = await fetch(`${config.baseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config.credentials),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Canal+ auth failed: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  // Cache the token (separate for test/prod)
  const newToken = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: Date.now() + (data.expiresIn * 1000),
  };
  
  if (isProduction) {
    cachedTokenProd = newToken;
  } else {
    cachedTokenTest = newToken;
  }
  
  return data.accessToken;
}

// Helper to get config based on environment
function getConfig(isProduction: boolean) {
  return isProduction ? CANAL_PLUS_CONFIG.PRODUCTION : CANAL_PLUS_CONFIG.TEST;
}

// Helper for API calls with retry on server errors
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 2
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // Retry on 500 errors
      if (response.status >= 500 && attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Network error");
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  throw lastError || new Error("Échec de la connexion au serveur");
}

// Check decoder / subscriber verification
export const checkDecoder = action({
  args: {
    decoderNumber: v.string(),
    isProduction: v.optional(v.boolean()),
  },
  handler: async (_, args): Promise<{
    success: boolean;
    error?: string;
    subscriber?: {
      decoderNumber: string;
      contractNumber: string;
      name: string;
      status: string;
      currentOffer: string;
      expiryDate: string;
      city: string;
      address: string;
      exists: boolean;
      unique: boolean;
    };
    executionTime?: string;
  }> => {
    try {
      const isProd = args.isProduction || false;
      console.log(`[Canal+ checkDecoder] Mode: ${isProd ? "PRODUCTION" : "TEST"}, Decoder: ${args.decoderNumber}`);
      
      const token = await getAuthToken(isProd);
      console.log(`[Canal+ checkDecoder] Auth token obtained successfully`);
      
      const config = getConfig(isProd);
      // Use query parameter like Postman does
      const url = `${config.baseUrl}/securecanal/api/check-decoder?numAbonne=${args.decoderNumber}`;
      console.log(`[Canal+ checkDecoder] Calling: ${url}`);
      
      const response = await fetchWithRetry(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        }
      );
      
      console.log(`[Canal+ checkDecoder] Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`[Canal+ checkDecoder] Error response: ${errorText}`);
        
        // Provide user-friendly error messages
        if (response.status >= 500) {
          return {
            success: false,
            error: `Le serveur Canal+ est temporairement indisponible (${response.status}). Veuillez réessayer.`,
          };
        }
        
        return {
          success: false,
          error: `Erreur lors de la vérification: ${response.status} - ${errorText}`,
        };
      }
      
      const data = await response.json();
      
      if (!data.existe) {
        return {
          success: false,
          error: data.message || "Abonné non trouvé",
        };
      }
      
      return {
        success: true,
        subscriber: {
          decoderNumber: data.decoder_number,
          contractNumber: data.numero_contrat,
          name: data.nom,
          status: data.statut,
          currentOffer: data.offre,
          expiryDate: data.date_fin,
          city: data.ville,
          address: data.adresse,
          exists: data.existe,
          unique: data.unique,
        },
        executionTime: data.dureeExecution,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  },
});

// Get all packages
export const getAllPackages = action({
  args: {
    isProduction: v.optional(v.boolean()),
  },
  handler: async (_, args): Promise<{
    success: boolean;
    error?: string;
    packages?: Array<{
      id: string;
      displayName: string;
    }>;
  }> => {
    try {
      const isProd = args.isProduction || false;
      const token = await getAuthToken(isProd);
      const config = getConfig(isProd);
      
      const response = await fetch(
        `${config.baseUrl}/securecanal/api/allPackages`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Erreur lors du chargement des packages: ${response.status} - ${errorText}`,
        };
      }
      
      const data = await response.json();
      
      return {
        success: true,
        packages: data.data?.packages || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  },
});

// Get package details
export const getPackageDetails = action({
  args: {
    packageId: v.string(),
    isProduction: v.optional(v.boolean()),
  },
  handler: async (_, args): Promise<{
    success: boolean;
    error?: string;
    packageDetails?: {
      packageId: string;
      options: Array<{
        name: string;
        price: string;
      }>;
      periods: Array<{
        duration: string;
        price: string;
      }>;
    };
  }> => {
    try {
      const isProd = args.isProduction || false;
      const token = await getAuthToken(isProd);
      const config = getConfig(isProd);
      
      const response = await fetch(
        `${config.baseUrl}/securecanal/api/packages/${args.packageId}/structured`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Erreur lors du chargement des détails: ${response.status} - ${errorText}`,
        };
      }
      
      const data = await response.json();
      
      return {
        success: true,
        packageDetails: data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  },
});

// Process reabonnement (subscription renewal)
export const processReabonnement = action({
  args: {
    decoderNumber: v.string(),
    offre: v.string(), // access, access_plus, evasion, tout_canal
    duree: v.string(), // "1" or "3" months
    option: v.optional(v.string()), // "CHARME", "ENGLISH", or empty
    phoneNumber: v.string(), // Without country code
    isProduction: v.optional(v.boolean()),
  },
  handler: async (_, args): Promise<{
    success: boolean;
    error?: string;
    result?: {
      message: string;
      executionTime: string;
    };
  }> => {
    try {
      const isProd = args.isProduction || false;
      const token = await getAuthToken(isProd);
      const config = getConfig(isProd);
      
      // Clean phone number (remove country code if present)
      let cleanPhone = args.phoneNumber.replace(/\s/g, "");
      if (cleanPhone.startsWith("+224")) {
        cleanPhone = cleanPhone.substring(4);
      } else if (cleanPhone.startsWith("00224")) {
        cleanPhone = cleanPhone.substring(5);
      } else if (cleanPhone.startsWith("224") && cleanPhone.length > 9) {
        cleanPhone = cleanPhone.substring(3);
      }
      
      const requestBody = {
        numAbonne: args.decoderNumber,
        offre: args.offre,
        duree: args.duree,
        option: args.option || "",
        phoneNumber: cleanPhone,
      };
      
      const response = await fetch(
        `${config.baseUrl}/api/reabo/reabonnement`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        
        // Handle specific error codes
        if (response.status === 400) {
          return {
            success: false,
            error: errorData?.message || "Paramètres invalides",
          };
        }
        if (response.status === 402) {
          return {
            success: false,
            error: "Solde insuffisant sur le compte distributeur",
          };
        }
        if (response.status === 422) {
          return {
            success: false,
            error: "Numéro de téléphone de l'abonné non trouvé dans Canal+",
          };
        }
        
        return {
          success: false,
          error: errorData?.message || `Erreur: ${response.status}`,
        };
      }
      
      const data = await response.json();
      
      return {
        success: true,
        result: {
          message: data.message || data.data?.resultat || "Réabonnement effectué avec succès",
          executionTime: data.data?.dureeExecution || "N/A",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  },
});
