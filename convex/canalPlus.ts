"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// Canal+ API Configuration
const CANAL_PLUS_CONFIG = {
  TEST: {
    baseUrl: "http://162.19.114.155:8088",
    credentials: {
      email: "external-api@creditruralgn.com",
      password: "external2711@!",
    },
  },
  // Production config will be added when credentials are provided
};

// Token cache (simple in-memory cache for demo - in production use a proper cache)
let cachedToken: { accessToken: string; refreshToken: string; expiresAt: number } | null = null;

// Helper function to get auth token
async function getAuthToken(isProduction: boolean): Promise<string> {
  const config = CANAL_PLUS_CONFIG.TEST; // Use TEST for now
  
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.accessToken;
  }
  
  // Get new token
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
  
  // Cache the token
  cachedToken = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: Date.now() + (data.expiresIn * 1000),
  };
  
  return data.accessToken;
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
      const token = await getAuthToken(args.isProduction || false);
      const config = CANAL_PLUS_CONFIG.TEST;
      
      const response = await fetch(
        `${config.baseUrl}/securecanal/api/check-decoder?numAbonne=${args.decoderNumber}`,
        {
          method: "POST",
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
      const token = await getAuthToken(args.isProduction || false);
      const config = CANAL_PLUS_CONFIG.TEST;
      
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
      const token = await getAuthToken(args.isProduction || false);
      const config = CANAL_PLUS_CONFIG.TEST;
      
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
      const token = await getAuthToken(args.isProduction || false);
      const config = CANAL_PLUS_CONFIG.TEST;
      
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
        `${config.baseUrl}/securecanal/api/reabonnement`,
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
