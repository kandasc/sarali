"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import OpenAI from "openai";

// Country names mapping
const COUNTRY_NAMES: Record<string, string> = {
  GN: "Guinée",
  CI: "Côte d'Ivoire",
  SN: "Sénégal",
  ML: "Mali",
  BF: "Burkina Faso",
};

export const searchBillersWithAI = action({
  args: { 
    query: v.string(),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    category: string | null;
    suggestions: Array<{ billerId: string; name: string; category: string; confidence: number }>;
    response: string;
  }> => {
    const openai = new OpenAI({
      baseURL: "http://ai-gateway.hercules.app/v1",
      apiKey: process.env.HERCULES_API_KEY,
    });

    // Get all active billers filtered by country if provided
    const allBillers = await ctx.runQuery(api.billers.listAllActiveBillers);
    const billers = args.country 
      ? allBillers.filter(b => {
          // We need to check if the biller is available in the selected country
          // Since listAllActiveBillers doesn't return countries, we'll use all billers
          // The frontend already filters by country, so this is just for context
          return true;
        })
      : allBillers;
    
    const countryName = args.country ? COUNTRY_NAMES[args.country] || args.country : "";

    // Build context for AI
    const billersContext = billers
      .map(
        (b) =>
          `- ${b.name} (${b.category}): ${b.description || "Service provider"}`,
      )
      .join("\n");

    const categories = [
      "ELECTRICITY",
      "WATER",
      "INTERNET",
      "PHONE",
      "TV",
      "OTHER",
    ];

    const countryContext = countryName ? `\nUser is in: ${countryName}. Focus on services available in this country.` : "";
    
    const prompt = `You are a helpful assistant for a bill payment platform in French/English. 
Available categories: ${categories.join(", ")}
${countryContext}

Available billers:
${billersContext}

User query: "${args.query}"

Analyze the user's query and:
1. Identify which category (ELECTRICITY, WATER, INTERNET, PHONE, TV, OTHER) or specific biller they're looking for
2. Suggest the most relevant billers for the user's country/region
3. Provide a helpful response in the same language as the query, mentioning the country context if relevant

Respond ONLY with valid JSON in this exact format:
{
  "category": "CATEGORY_NAME or null",
  "suggestions": [
    {"name": "Biller Name", "category": "CATEGORY", "confidence": 0.9}
  ],
  "response": "Your helpful response to the user"
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "openai/gpt-5-mini",
        messages: [{ role: "user", content: prompt }],
      });

      const content = completion.choices[0]?.message?.content || "{}";
      const result = JSON.parse(content);

      // Map suggested biller names back to IDs
      const suggestionsWithIds = result.suggestions.map(
        (suggestion: { name: string; category: string; confidence: number }) => {
          const biller = billers.find((b) => b.name === suggestion.name);
          return {
            billerId: biller?._id || "",
            name: suggestion.name,
            category: suggestion.category,
            confidence: suggestion.confidence,
          };
        },
      );

      return {
        category: result.category,
        suggestions: suggestionsWithIds.filter(
          (s: { billerId: string }) => s.billerId,
        ),
        response: result.response,
      };
    } catch (error) {
      console.error("AI search error:", error);
      // Fallback to simple text search
      const lowerQuery = args.query.toLowerCase();
      const matchingBillers = billers.filter(
        (b) =>
          b.name.toLowerCase().includes(lowerQuery) ||
          b.category.toLowerCase().includes(lowerQuery),
      );

      return {
        category: null,
        suggestions: matchingBillers.slice(0, 5).map((b) => ({
          billerId: b._id,
          name: b.name,
          category: b.category,
          confidence: 0.8,
        })),
        response: matchingBillers.length > 0
          ? `J'ai trouvé ${matchingBillers.length} résultat(s) pour "${args.query}"`
          : `Aucun résultat trouvé pour "${args.query}". Essayez une autre recherche.`,
      };
    }
  },
});
