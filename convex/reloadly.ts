"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// Reloadly API configuration
const RELOADLY_AUTH_URL = "https://auth.reloadly.com/oauth/token";
const RELOADLY_TOPUPS_URL = "https://topups.reloadly.com";
const RELOADLY_TOPUPS_SANDBOX_URL = "https://topups-sandbox.reloadly.com";

// Country ISO codes mapping
const COUNTRY_ISO: Record<string, string> = {
  GN: "GN", // Guinea
  CI: "CI", // Côte d'Ivoire
  SN: "SN", // Senegal
};

// Get access token from Reloadly
async function getAccessToken(isProduction: boolean): Promise<string> {
  const clientId = process.env.RELOADLY_CLIENT_ID;
  const clientSecret = process.env.RELOADLY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Reloadly credentials not configured");
  }

  const audience = isProduction
    ? "https://topups.reloadly.com"
    : "https://topups-sandbox.reloadly.com";

  const response = await fetch(RELOADLY_AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      audience,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Reloadly access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Get base URL based on environment
function getBaseUrl(isProduction: boolean): string {
  return isProduction ? RELOADLY_TOPUPS_URL : RELOADLY_TOPUPS_SANDBOX_URL;
}

// Get operators for a country
export const getOperators = action({
  args: {
    countryCode: v.string(),
    isProduction: v.optional(v.boolean()),
  },
  handler: async (_ctx, args): Promise<{
    success: boolean;
    operators?: Array<{
      id: number;
      name: string;
      logoUrls: string[];
      denominationType: string;
      minAmount: number | null;
      maxAmount: number | null;
      localMinAmount: number | null;
      localMaxAmount: number | null;
      fixedAmounts: number[];
      localFixedAmounts: number[];
      currencyCode: string;
      localCurrencyCode: string;
      supportsLocalAmounts: boolean;
      data: boolean;
    }>;
    error?: string;
  }> => {
    const isProduction = args.isProduction ?? false;

    try {
      const accessToken = await getAccessToken(isProduction);
      const baseUrl = getBaseUrl(isProduction);
      const isoCode = COUNTRY_ISO[args.countryCode] || args.countryCode;

      const response = await fetch(
        `${baseUrl}/operators/countries/${isoCode}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/com.reloadly.topups-v1+json",
          },
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Reloadly operators error:", error);
        return { success: false, error: `Failed to get operators: ${response.status}` };
      }

      const operators = await response.json();

      // Filter and map operators
      const mappedOperators = operators.map((op: {
        operatorId: number;
        name: string;
        logoUrls: string[];
        denominationType: string;
        minAmount: number | null;
        maxAmount: number | null;
        localMinAmount: number | null;
        localMaxAmount: number | null;
        fixedAmounts: number[];
        localFixedAmounts: number[];
        destinationCurrencyCode: string;
        senderCurrencyCode: string;
        supportsLocalAmounts: boolean;
        data: boolean;
      }) => ({
        id: op.operatorId,
        name: op.name,
        logoUrls: op.logoUrls || [],
        denominationType: op.denominationType,
        minAmount: op.minAmount,
        maxAmount: op.maxAmount,
        localMinAmount: op.localMinAmount,
        localMaxAmount: op.localMaxAmount,
        fixedAmounts: op.fixedAmounts || [],
        localFixedAmounts: op.localFixedAmounts || [],
        currencyCode: op.senderCurrencyCode,
        localCurrencyCode: op.destinationCurrencyCode,
        supportsLocalAmounts: op.supportsLocalAmounts,
        data: op.data,
      }));

      return { success: true, operators: mappedOperators };
    } catch (error) {
      console.error("Reloadly getOperators error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Make airtime top-up
export const makeTopup = action({
  args: {
    operatorId: v.number(),
    amount: v.number(),
    phoneNumber: v.string(),
    countryCode: v.string(),
    useLocalAmount: v.boolean(),
    isProduction: v.optional(v.boolean()),
    customIdentifier: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{
    success: boolean;
    transactionId?: number;
    status?: string;
    operatorName?: string;
    deliveredAmount?: number;
    deliveredCurrency?: string;
    error?: string;
  }> => {
    const isProduction = args.isProduction ?? false;

    try {
      const accessToken = await getAccessToken(isProduction);
      const baseUrl = getBaseUrl(isProduction);

      // Country phone prefixes for E.164 format
      const countryPrefixes: Record<string, string> = {
        GN: "224",
        CI: "225",
        SN: "221",
      };
      
      const prefix = countryPrefixes[args.countryCode];
      if (!prefix) {
        return { success: false, error: `Unsupported country code: ${args.countryCode}` };
      }

      // Clean phone number - remove all non-digit characters
      let cleanPhone = args.phoneNumber.replace(/\D/g, "");
      
      // Remove leading zeros (trunk prefix)
      cleanPhone = cleanPhone.replace(/^0+/, "");
      
      // If phone already has the country prefix, remove it to avoid duplication
      if (cleanPhone.startsWith(prefix)) {
        cleanPhone = cleanPhone.substring(prefix.length);
      }
      
      // Validate phone number length based on country
      const expectedLengths: Record<string, number> = {
        GN: 9,  // Guinea: 6XX XXX XXX
        CI: 10, // Côte d'Ivoire: XX XX XX XX XX (after removing leading 0)
        SN: 9,  // Senegal: 7X XXX XX XX
      };
      
      // Côte d'Ivoire numbers without the leading 0 are typically 9 digits
      // But some can be 10, so we'll accept 8-10 digits
      const minLength = 8;
      const maxLength = 10;
      
      if (cleanPhone.length < minLength || cleanPhone.length > maxLength) {
        return { 
          success: false, 
          error: `Invalid phone number length: ${cleanPhone.length} digits. Expected ${minLength}-${maxLength} digits.` 
        };
      }
      
      // Build the full international phone number (E.164 without +)
      const fullPhoneNumber = prefix + cleanPhone;

      const requestBody = {
        operatorId: args.operatorId,
        amount: args.amount,
        useLocalAmount: args.useLocalAmount,
        customIdentifier: args.customIdentifier || `sarali-topup-${Date.now()}`,
        recipientPhone: {
          countryCode: args.countryCode,
          number: fullPhoneNumber,
        },
      };

      console.log("Reloadly topup request:", JSON.stringify(requestBody));

      const response = await fetch(`${baseUrl}/topups`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/com.reloadly.topups-v1+json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log("Reloadly topup response:", responseText);

      if (!response.ok) {
        let errorMessage = `Topup failed: ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = responseText || errorMessage;
        }
        return { success: false, error: errorMessage };
      }

      const result = JSON.parse(responseText);

      return {
        success: true,
        transactionId: result.transactionId,
        status: result.status,
        operatorName: result.operatorName,
        deliveredAmount: result.deliveredAmount,
        deliveredCurrency: result.deliveredAmountCurrencyCode,
      };
    } catch (error) {
      console.error("Reloadly makeTopup error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Get account balance
export const getBalance = action({
  args: {
    isProduction: v.optional(v.boolean()),
  },
  handler: async (_ctx, args): Promise<{
    success: boolean;
    balance?: number;
    currencyCode?: string;
    error?: string;
  }> => {
    const isProduction = args.isProduction ?? false;

    try {
      const accessToken = await getAccessToken(isProduction);
      const baseUrl = getBaseUrl(isProduction);

      const response = await fetch(`${baseUrl}/accounts/balance`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/com.reloadly.topups-v1+json",
        },
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Failed to get balance: ${error}` };
      }

      const data = await response.json();

      return {
        success: true,
        balance: data.balance,
        currencyCode: data.currencyCode,
      };
    } catch (error) {
      console.error("Reloadly getBalance error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
