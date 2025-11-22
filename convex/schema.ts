import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.union(
      v.literal("MASTER"),
      v.literal("MANAGER"),
      v.literal("CHEF_AGENCE"),
      v.literal("CAISSIER")
    ),
    agencyId: v.optional(v.id("agencies")),
    managerId: v.optional(v.id("users")),
    phone: v.optional(v.string()),
    status: v.union(v.literal("ACTIVE"), v.literal("INACTIVE")),
    creditBalance: v.number(),
    currency: v.union(v.literal("XOF"), v.literal("GNF")),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_role", ["role"])
    .index("by_agency", ["agencyId"])
    .index("by_manager", ["managerId"])
    .index("by_status", ["status"]),

  agencies: defineTable({
    name: v.string(),
    code: v.string(),
    country: v.string(),
    city: v.string(),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    managerId: v.optional(v.id("users")),
    networkManagerId: v.optional(v.id("users")),
    creditBalance: v.number(),
    currency: v.union(v.literal("XOF"), v.literal("GNF")),
    status: v.union(v.literal("ACTIVE"), v.literal("INACTIVE")),
  })
    .index("by_code", ["code"])
    .index("by_manager", ["managerId"])
    .index("by_network_manager", ["networkManagerId"])
    .index("by_status", ["status"]),

  activityLogs: defineTable({
    userId: v.id("users"),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    details: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  creditTransactions: defineTable({
    type: v.union(
      v.literal("DEPOSIT"),
      v.literal("TRANSFER"),
      v.literal("DEDUCTION"),
      v.literal("REFUND")
    ),
    fromType: v.optional(
      v.union(v.literal("USER"), v.literal("AGENCY"), v.literal("SYSTEM"))
    ),
    fromId: v.optional(v.string()),
    toType: v.union(v.literal("USER"), v.literal("AGENCY")),
    toId: v.string(),
    amount: v.number(),
    currency: v.union(v.literal("XOF"), v.literal("GNF")),
    balanceBefore: v.number(),
    balanceAfter: v.number(),
    reason: v.optional(v.string()),
    initiatedBy: v.id("users"),
    status: v.union(
      v.literal("PENDING"),
      v.literal("COMPLETED"),
      v.literal("FAILED"),
      v.literal("CANCELLED")
    ),
  })
    .index("by_initiator", ["initiatedBy"])
    .index("by_to", ["toId"])
    .index("by_status", ["status"]),
});
