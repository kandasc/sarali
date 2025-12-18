import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.union(
      v.literal("SUPER_ADMIN"),
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
    .index("by_status", ["status"])
    .searchIndex("search_email", {
      searchField: "email",
    }),

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
    // White-label branding
    brandName: v.optional(v.string()),
    brandLogoStorageId: v.optional(v.id("_storage")),
    brandPrimaryColor: v.optional(v.string()),
    brandWebsite: v.optional(v.string()),
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

  transactions: defineTable({
    type: v.union(
      v.literal("DEPOSIT"),
      v.literal("WITHDRAWAL"),
      v.literal("TRANSFER"),
      v.literal("PAYMENT")
    ),
    customerName: v.string(),
    customerPhone: v.string(),
    customerIdNumber: v.optional(v.string()),
    amount: v.number(),
    currency: v.union(v.literal("XOF"), v.literal("GNF")),
    fees: v.optional(v.number()),
    totalAmount: v.number(),
    reference: v.string(),
    description: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    recipientPhone: v.optional(v.string()),
    receiptStorageId: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("PENDING"),
      v.literal("COMPLETED"),
      v.literal("FAILED"),
      v.literal("CANCELLED")
    ),
    processedBy: v.id("users"),
    agencyId: v.optional(v.id("agencies")),
  })
    .index("by_customer_phone", ["customerPhone"])
    .index("by_reference", ["reference"])
    .index("by_processed_by", ["processedBy"])
    .index("by_agency", ["agencyId"])
    .index("by_status", ["status"]),

  roleSimulations: defineTable({
    masterUserId: v.id("users"),
    simulatedRole: v.union(
      v.literal("MANAGER"),
      v.literal("CHEF_AGENCE"),
      v.literal("CAISSIER")
    ),
    targetUserId: v.optional(v.id("users")),
    reason: v.string(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_master", ["masterUserId"])
    .index("by_target", ["targetUserId"]),

  billers: defineTable({
    name: v.string(),
    code: v.string(),
    category: v.union(
      v.literal("ELECTRICITY"),
      v.literal("WATER"),
      v.literal("INTERNET"),
      v.literal("PHONE"),
      v.literal("TV"),
      v.literal("OTHER")
    ),
    logoStorageId: v.optional(v.id("_storage")),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    supportedCurrencies: v.array(v.union(v.literal("XOF"), v.literal("GNF"))),
    countries: v.array(v.string()),
    feePercentage: v.optional(v.number()),
    feeFixed: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  billPayments: defineTable({
    billType: v.union(
      v.literal("ELECTRICITY"),
      v.literal("WATER"),
      v.literal("INTERNET"),
      v.literal("PHONE"),
      v.literal("TV"),
      v.literal("OTHER")
    ),
    provider: v.string(),
    billerId: v.optional(v.id("billers")),
    billReference: v.string(),
    accountNumber: v.optional(v.string()),
    customerName: v.string(),
    customerPhone: v.string(),
    customerEmail: v.optional(v.string()),
    amount: v.number(),
    currency: v.union(v.literal("XOF"), v.literal("GNF")),
    fees: v.number(),
    totalAmount: v.number(),
    paymentReference: v.string(),
    saraliTransactionId: v.optional(v.string()),
    status: v.union(
      v.literal("PENDING"),
      v.literal("PROCESSING"),
      v.literal("COMPLETED"),
      v.literal("FAILED"),
      v.literal("CANCELLED")
    ),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.string()),
  })
    .index("by_reference", ["paymentReference"])
    .index("by_phone", ["customerPhone"])
    .index("by_status", ["status"])
    .index("by_sarali_id", ["saraliTransactionId"]),

  bulkPayments: defineTable({
    batchReference: v.string(),
    fileName: v.string(),
    fileStorageId: v.optional(v.id("_storage")),
    totalItems: v.number(),
    totalAmount: v.number(),
    currency: v.union(v.literal("XOF"), v.literal("GNF")),
    processedItems: v.number(),
    successfulItems: v.number(),
    failedItems: v.number(),
    status: v.union(
      v.literal("PENDING"),
      v.literal("PROCESSING"),
      v.literal("COMPLETED"),
      v.literal("FAILED"),
      v.literal("CANCELLED")
    ),
    createdBy: v.id("users"),
    processedAt: v.optional(v.number()),
  })
    .index("by_reference", ["batchReference"])
    .index("by_created_by", ["createdBy"])
    .index("by_status", ["status"]),

  bulkPaymentItems: defineTable({
    bulkPaymentId: v.id("bulkPayments"),
    rowNumber: v.number(),
    recipientName: v.string(),
    recipientPhone: v.string(),
    recipientAccount: v.optional(v.string()),
    amount: v.number(),
    currency: v.union(v.literal("XOF"), v.literal("GNF")),
    reference: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("PENDING"),
      v.literal("PROCESSING"),
      v.literal("COMPLETED"),
      v.literal("FAILED")
    ),
    errorMessage: v.optional(v.string()),
    transactionId: v.optional(v.string()),
    processedAt: v.optional(v.number()),
  })
    .index("by_bulk_payment", ["bulkPaymentId"])
    .index("by_reference", ["reference"])
    .index("by_status", ["status"]),
});
