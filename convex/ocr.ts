"use node";

import { v } from "convex/values";
import OpenAI from "openai";
import { action } from "./_generated/server";

export const extractReceiptData = action({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { storageId }) => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const imageBlob = await ctx.storage.get(storageId);
    if (!imageBlob) {
      throw new Error("Image not found");
    }

    const buffer = await imageBlob.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString("base64");

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract the following information from this receipt or transaction document:

IMPORTANT: Return as valid JSON with these EXACT keys:
- transactionType: one of "DEPOSIT", "WITHDRAWAL", "TRANSFER", or "PAYMENT"
- customerName: full name of the customer (required)
- customerPhone: phone number (required, extract digits only)
- customerIdNumber: ID number if visible (optional)
- amount: numeric amount WITHOUT currency symbol (required)
- currency: "XOF" or "GNF" based on what you see (required)
- recipientName: name of recipient if this is a transfer or payment (optional)
- recipientPhone: phone of recipient if this is a transfer or payment (optional)
- description: brief description or notes (optional)

If any required field cannot be found, make a reasonable guess based on the receipt context.
Return ONLY valid JSON, no markdown or explanation.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${imageBlob.type};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");

    // Validate and sanitize the extracted data
    return {
      transactionType: result.transactionType || "DEPOSIT",
      customerName: result.customerName || "",
      customerPhone: result.customerPhone
        ? result.customerPhone.replace(/\D/g, "")
        : "",
      customerIdNumber: result.customerIdNumber || undefined,
      amount: result.amount ? parseFloat(result.amount) : 0,
      currency: result.currency === "GNF" ? "GNF" : "XOF",
      recipientName: result.recipientName || undefined,
      recipientPhone: result.recipientPhone
        ? result.recipientPhone.replace(/\D/g, "")
        : undefined,
      description: result.description || undefined,
    };
  },
});

export const generateUploadUrl = action({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
