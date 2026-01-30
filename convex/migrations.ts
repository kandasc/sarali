import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Migration: Upgrade kandasc@gmail.com to SUPER_ADMIN
export const upgradeSuperAdmin = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    if (!user) {
      return { success: false, message: "User not found" };
    }

    if (user.role === "SUPER_ADMIN") {
      return { success: true, message: "User is already SUPER_ADMIN" };
    }

    await ctx.db.patch(user._id, {
      role: "SUPER_ADMIN",
    });

    return { success: true, message: `User upgraded to SUPER_ADMIN` };
  },
});

// Migration: Fix bill payment amounts that were divided by 100
export const fixBillPaymentAmounts = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all bill payments that need to be fixed
    const payments = await ctx.db
      .query("billPayments")
      .collect();
    
    let updatedCount = 0;
    
    for (const payment of payments) {
      // Multiply amounts by 100 to fix the division issue
      await ctx.db.patch(payment._id, {
        amount: payment.amount * 100,
        fees: payment.fees * 100,
        totalAmount: payment.totalAmount * 100,
      });
      updatedCount++;
    }
    
    return { 
      success: true, 
      message: `Updated ${updatedCount} bill payments`,
      updatedCount 
    };
  },
});
