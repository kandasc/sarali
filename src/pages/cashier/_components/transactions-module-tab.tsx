import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { toast } from "sonner";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  SendIcon,
  CreditCardIcon,
  SearchIcon,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { ReceiptScanner } from "./receipt-scanner.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

const depositSchema = z.object({
  customerName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  customerPhone: z.string().min(8, "Numéro de téléphone invalide"),
  customerIdNumber: z.string().optional(),
  amount: z.string().min(1, "Montant requis").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Le montant doit être positif"
  ),
  description: z.string().optional(),
});

const withdrawalSchema = z.object({
  customerName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  customerPhone: z.string().min(8, "Numéro de téléphone invalide"),
  customerIdNumber: z.string().optional(),
  amount: z.string().min(1, "Montant requis").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Le montant doit être positif"
  ),
  description: z.string().optional(),
});

const transferSchema = z.object({
  customerName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  customerPhone: z.string().min(8, "Numéro de téléphone invalide"),
  customerIdNumber: z.string().optional(),
  recipientName: z.string().min(2, "Le nom du destinataire est requis"),
  recipientPhone: z.string().min(8, "Numéro de téléphone invalide"),
  imto: z.enum([
    "WESTERN_UNION",
    "MONEYGRAM",
    "RIA",
    "WAVE",
    "ORANGE_MONEY",
    "MTN_MOBILE_MONEY",
    "MOOV_MONEY",
    "OTHER"
  ], { required_error: "Sélectionnez un opérateur" }),
  amount: z.string().min(1, "Montant requis").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Le montant doit être positif"
  ),
  description: z.string().optional(),
  // IMTO specific fields
  imtoReferenceNumber: z.string().optional(),
  imtoSenderFirstName: z.string().optional(),
  imtoSenderLastName: z.string().optional(),
  imtoOriginCountry: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validation conditionnelle pour Western Union, MoneyGram, Ria
  if (data.imto === "WESTERN_UNION" || data.imto === "MONEYGRAM" || data.imto === "RIA") {
    if (!data.imtoReferenceNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le numéro de référence est requis",
        path: ["imtoReferenceNumber"],
      });
    }
    if (!data.imtoSenderFirstName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le prénom de l'expéditeur est requis",
        path: ["imtoSenderFirstName"],
      });
    }
    if (!data.imtoSenderLastName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le nom de l'expéditeur est requis",
        path: ["imtoSenderLastName"],
      });
    }
    if (!data.imtoOriginCountry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le pays d'origine est requis",
        path: ["imtoOriginCountry"],
      });
    }
  }
});

const paymentSchema = z.object({
  customerName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  customerPhone: z.string().min(8, "Numéro de téléphone invalide"),
  customerIdNumber: z.string().optional(),
  imto: z.enum([
    "WESTERN_UNION",
    "MONEYGRAM",
    "RIA",
    "WAVE",
    "ORANGE_MONEY",
    "MTN_MOBILE_MONEY",
    "MOOV_MONEY",
    "OTHER"
  ]).optional(),
  amount: z.string().min(1, "Montant requis").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Le montant doit être positif"
  ),
  description: z.string().min(3, "Description requise"),
  // IMTO specific fields
  imtoReferenceNumber: z.string().optional(),
  imtoSenderFirstName: z.string().optional(),
  imtoSenderLastName: z.string().optional(),
  imtoOriginCountry: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validation conditionnelle pour Western Union, MoneyGram, Ria
  if (data.imto === "WESTERN_UNION" || data.imto === "MONEYGRAM" || data.imto === "RIA") {
    if (!data.imtoReferenceNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le numéro de référence est requis",
        path: ["imtoReferenceNumber"],
      });
    }
    if (!data.imtoSenderFirstName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le prénom de l'expéditeur est requis",
        path: ["imtoSenderFirstName"],
      });
    }
    if (!data.imtoSenderLastName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le nom de l'expéditeur est requis",
        path: ["imtoSenderLastName"],
      });
    }
    if (!data.imtoOriginCountry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le pays d'origine est requis",
        path: ["imtoOriginCountry"],
      });
    }
  }
});

type DepositValues = z.infer<typeof depositSchema>;
type WithdrawalValues = z.infer<typeof withdrawalSchema>;
type TransferValues = z.infer<typeof transferSchema>;
type PaymentValues = z.infer<typeof paymentSchema>;

// IMTO labels
const imtoLabels: Record<string, string> = {
  WESTERN_UNION: "Western Union",
  MONEYGRAM: "MoneyGram",
  RIA: "Ria",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  MTN_MOBILE_MONEY: "MTN Mobile Money",
  MOOV_MONEY: "Moov Money",
  OTHER: "Autre",
};

export default function TransactionsModuleTab() {
  const transactions = useQuery(api.transactions.listTransactions, { limit: 20 });
  const stats = useQuery(api.transactions.getTransactionStats);
  const overview = useQuery(api.cashierDashboard.getCashierOverview);

  const createDeposit = useMutation(api.transactions.createDeposit);
  const createWithdrawal = useMutation(api.transactions.createWithdrawal);
  const createTransfer = useMutation(api.transactions.createTransfer);
  const createPayment = useMutation(api.transactions.createPayment);

  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const [depositReceiptId, setDepositReceiptId] = useState<Id<"_storage"> | undefined>(undefined);
  const [withdrawalReceiptId, setWithdrawalReceiptId] = useState<Id<"_storage"> | undefined>(undefined);
  const [transferReceiptId, setTransferReceiptId] = useState<Id<"_storage"> | undefined>(undefined);
  const [paymentReceiptId, setPaymentReceiptId] = useState<Id<"_storage"> | undefined>(undefined);

  const depositForm = useForm<DepositValues>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerIdNumber: "",
      amount: "",
      description: "",
    },
  });

  const withdrawalForm = useForm<WithdrawalValues>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerIdNumber: "",
      amount: "",
      description: "",
    },
  });

  const transferForm = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerIdNumber: "",
      recipientName: "",
      recipientPhone: "",
      imto: "WESTERN_UNION",
      amount: "",
      description: "",
      imtoReferenceNumber: "",
      imtoSenderFirstName: "",
      imtoSenderLastName: "",
      imtoOriginCountry: "",
    },
  });

  const paymentForm = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerIdNumber: "",
      imto: undefined,
      amount: "",
      description: "",
      imtoReferenceNumber: "",
      imtoSenderFirstName: "",
      imtoSenderLastName: "",
      imtoOriginCountry: "",
    },
  });

  const onDepositSubmit = async (values: DepositValues) => {
    try {
      const result = await createDeposit({
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        customerIdNumber: values.customerIdNumber,
        amount: Number(values.amount),
        description: values.description,
        receiptStorageId: depositReceiptId,
      });

      toast.success(`Dépôt effectué avec succès. Référence: ${result.reference}`);
      depositForm.reset();
      setDepositReceiptId(undefined);
      setIsDepositDialogOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Erreur: ${error.message}`);
      } else {
        toast.error("Échec de l'opération");
      }
    }
  };

  const onWithdrawalSubmit = async (values: WithdrawalValues) => {
    try {
      const result = await createWithdrawal({
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        customerIdNumber: values.customerIdNumber,
        amount: Number(values.amount),
        description: values.description,
        receiptStorageId: withdrawalReceiptId,
      });

      toast.success(`Retrait effectué avec succès. Référence: ${result.reference}`);
      withdrawalForm.reset();
      setWithdrawalReceiptId(undefined);
      setIsWithdrawalDialogOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Erreur: ${error.message}`);
      } else {
        toast.error("Échec de l'opération");
      }
    }
  };

  const onTransferSubmit = async (values: TransferValues) => {
    try {
      const result = await createTransfer({
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        customerIdNumber: values.customerIdNumber,
        recipientName: values.recipientName,
        recipientPhone: values.recipientPhone,
        amount: Number(values.amount),
        imto: values.imto,
        description: values.description,
        imtoReferenceNumber: values.imtoReferenceNumber,
        imtoSenderFirstName: values.imtoSenderFirstName,
        imtoSenderLastName: values.imtoSenderLastName,
        imtoOriginCountry: values.imtoOriginCountry,
        receiptStorageId: transferReceiptId,
      });

      toast.success(`Transfert effectué avec succès. Référence: ${result.reference}`);
      transferForm.reset();
      setTransferReceiptId(undefined);
      setIsTransferDialogOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Erreur: ${error.message}`);
      } else {
        toast.error("Échec de l'opération");
      }
    }
  };

  const onPaymentSubmit = async (values: PaymentValues) => {
    try {
      const result = await createPayment({
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        customerIdNumber: values.customerIdNumber,
        amount: Number(values.amount),
        description: values.description,
        imto: values.imto,
        imtoReferenceNumber: values.imtoReferenceNumber,
        imtoSenderFirstName: values.imtoSenderFirstName,
        imtoSenderLastName: values.imtoSenderLastName,
        imtoOriginCountry: values.imtoOriginCountry,
        receiptStorageId: paymentReceiptId,
      });

      toast.success(`Paiement effectué avec succès. Référence: ${result.reference}`);
      paymentForm.reset();
      setPaymentReceiptId(undefined);
      setIsPaymentDialogOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Erreur: ${error.message}`);
      } else {
        toast.error("Échec de l'opération");
      }
    }
  };

  if (!transactions || !stats || !overview) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ` ${currency}`;
  };

  const calculateFees = (amount: number, type: string): number => {
    switch (type) {
      case "DEPOSIT":
        return Math.round(amount * 0.01);
      case "WITHDRAWAL":
        return Math.round(amount * 0.015);
      case "TRANSFER":
        return Math.round(amount * 0.02);
      case "PAYMENT":
        return Math.round(amount * 0.01);
      default:
        return 0;
    }
  };

  const handleDepositDataExtracted = (data: { customerName: string; customerPhone: string; customerIdNumber?: string; amount: number; description?: string }, storageId: Id<"_storage">) => {
    depositForm.setValue("customerName", data.customerName);
    depositForm.setValue("customerPhone", data.customerPhone);
    depositForm.setValue("customerIdNumber", data.customerIdNumber || "");
    depositForm.setValue("amount", data.amount.toString());
    depositForm.setValue("description", data.description || "");
    setDepositReceiptId(storageId);
  };

  const handleWithdrawalDataExtracted = (data: { customerName: string; customerPhone: string; customerIdNumber?: string; amount: number; description?: string }, storageId: Id<"_storage">) => {
    withdrawalForm.setValue("customerName", data.customerName);
    withdrawalForm.setValue("customerPhone", data.customerPhone);
    withdrawalForm.setValue("customerIdNumber", data.customerIdNumber || "");
    withdrawalForm.setValue("amount", data.amount.toString());
    withdrawalForm.setValue("description", data.description || "");
    setWithdrawalReceiptId(storageId);
  };

  const handleTransferDataExtracted = (data: { customerName: string; customerPhone: string; customerIdNumber?: string; recipientName?: string; recipientPhone?: string; amount: number; description?: string }, storageId: Id<"_storage">) => {
    transferForm.setValue("customerName", data.customerName);
    transferForm.setValue("customerPhone", data.customerPhone);
    transferForm.setValue("customerIdNumber", data.customerIdNumber || "");
    transferForm.setValue("recipientName", data.recipientName || "");
    transferForm.setValue("recipientPhone", data.recipientPhone || "");
    transferForm.setValue("amount", data.amount.toString());
    transferForm.setValue("description", data.description || "");
    setTransferReceiptId(storageId);
  };

  const handlePaymentDataExtracted = (data: { customerName: string; customerPhone: string; customerIdNumber?: string; amount: number; description?: string }, storageId: Id<"_storage">) => {
    paymentForm.setValue("customerName", data.customerName);
    paymentForm.setValue("customerPhone", data.customerPhone);
    paymentForm.setValue("customerIdNumber", data.customerIdNumber || "");
    paymentForm.setValue("amount", data.amount.toString());
    paymentForm.setValue("description", data.description || "");
    setPaymentReceiptId(storageId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Module Transactions</h2>
        <p className="text-muted-foreground">Effectuez des transactions pour vos clients</p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="mx-auto mb-2 p-3 bg-green-100 dark:bg-green-900/20 rounded-lg w-fit">
                    <ArrowDownIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold">Dépôt</h3>
                  <p className="text-xs text-muted-foreground">Frais: 1%</p>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau Dépôt</DialogTitle>
            </DialogHeader>
            <ReceiptScanner onDataExtracted={handleDepositDataExtracted} />
            <Form {...depositForm}>
              <form onSubmit={depositForm.handleSubmit(onDepositSubmit)} className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Solde disponible</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(overview.creditBalance, overview.currency)}
                  </p>
                </div>

                <FormField
                  control={depositForm.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du Client</FormLabel>
                      <FormControl>
                        <Input placeholder="Jean Dupont" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={depositForm.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input placeholder="+224 XXX XXX XXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={depositForm.control}
                  name="customerIdNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro d'Identité (optionnel)</FormLabel>
                      <FormControl>
                        <Input placeholder="CNI123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={depositForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="10000"
                          {...field}
                        />
                      </FormControl>
                      {field.value && (
                        <FormDescription>
                          Frais: {formatCurrency(calculateFees(Number(field.value), "DEPOSIT"), overview.currency)} | 
                          Total: {formatCurrency(Number(field.value) + calculateFees(Number(field.value), "DEPOSIT"), overview.currency)}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={depositForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDepositDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit">Effectuer le Dépôt</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isWithdrawalDialogOpen} onOpenChange={setIsWithdrawalDialogOpen}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="mx-auto mb-2 p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg w-fit">
                    <ArrowUpIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="font-semibold">Retrait</h3>
                  <p className="text-xs text-muted-foreground">Frais: 1.5%</p>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau Retrait</DialogTitle>
            </DialogHeader>
            <ReceiptScanner onDataExtracted={handleWithdrawalDataExtracted} />
            <Form {...withdrawalForm}>
              <form onSubmit={withdrawalForm.handleSubmit(onWithdrawalSubmit)} className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Solde disponible</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(overview.creditBalance, overview.currency)}
                  </p>
                </div>

                <FormField
                  control={withdrawalForm.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du Client</FormLabel>
                      <FormControl>
                        <Input placeholder="Jean Dupont" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={withdrawalForm.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input placeholder="+224 XXX XXX XXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={withdrawalForm.control}
                  name="customerIdNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro d'Identité (optionnel)</FormLabel>
                      <FormControl>
                        <Input placeholder="CNI123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={withdrawalForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="10000"
                          {...field}
                        />
                      </FormControl>
                      {field.value && (
                        <FormDescription>
                          Frais: {formatCurrency(calculateFees(Number(field.value), "WITHDRAWAL"), overview.currency)} | 
                          Total: {formatCurrency(Number(field.value) + calculateFees(Number(field.value), "WITHDRAWAL"), overview.currency)}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={withdrawalForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsWithdrawalDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit">Effectuer le Retrait</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="mx-auto mb-2 p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg w-fit">
                    <SendIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold">Transfert</h3>
                  <p className="text-xs text-muted-foreground">Frais: 2%</p>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau Transfert</DialogTitle>
            </DialogHeader>
            <ReceiptScanner onDataExtracted={handleTransferDataExtracted} />
            <Form {...transferForm}>
              <form onSubmit={transferForm.handleSubmit(onTransferSubmit)} className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Solde disponible</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(overview.creditBalance, overview.currency)}
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Expéditeur</h4>
                  <FormField
                    control={transferForm.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom</FormLabel>
                        <FormControl>
                          <Input placeholder="Jean Dupont" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={transferForm.control}
                    name="customerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <Input placeholder="+224 XXX XXX XXX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={transferForm.control}
                    name="customerIdNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numéro d'Identité (optionnel)</FormLabel>
                        <FormControl>
                          <Input placeholder="CNI123456" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Destinataire</h4>
                  <FormField
                    control={transferForm.control}
                    name="recipientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom</FormLabel>
                        <FormControl>
                          <Input placeholder="Marie Martin" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={transferForm.control}
                    name="recipientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <Input placeholder="+224 XXX XXX XXX" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={transferForm.control}
                  name="imto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opérateur de Transfert (IMTO)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner l'opérateur" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="WESTERN_UNION">{imtoLabels.WESTERN_UNION}</SelectItem>
                          <SelectItem value="MONEYGRAM">{imtoLabels.MONEYGRAM}</SelectItem>
                          <SelectItem value="RIA">{imtoLabels.RIA}</SelectItem>
                          <SelectItem value="WAVE">{imtoLabels.WAVE}</SelectItem>
                          <SelectItem value="ORANGE_MONEY">{imtoLabels.ORANGE_MONEY}</SelectItem>
                          <SelectItem value="MTN_MOBILE_MONEY">{imtoLabels.MTN_MOBILE_MONEY}</SelectItem>
                          <SelectItem value="MOOV_MONEY">{imtoLabels.MOOV_MONEY}</SelectItem>
                          <SelectItem value="OTHER">{imtoLabels.OTHER}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Champs spécifiques pour Western Union, MoneyGram, Ria */}
                {(transferForm.watch("imto") === "WESTERN_UNION" || 
                  transferForm.watch("imto") === "MONEYGRAM" || 
                  transferForm.watch("imto") === "RIA") && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                    <h4 className="font-medium text-sm">
                      Informations {
                        transferForm.watch("imto") === "WESTERN_UNION" ? "Western Union" :
                        transferForm.watch("imto") === "MONEYGRAM" ? "MoneyGram" : "Ria"
                      }
                    </h4>

                    <FormField
                      control={transferForm.control}
                      name="imtoReferenceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {transferForm.watch("imto") === "WESTERN_UNION" && "MTCN (10 chiffres)"}
                            {transferForm.watch("imto") === "MONEYGRAM" && "Référence (8 chiffres)"}
                            {transferForm.watch("imto") === "RIA" && "PIN (16 chiffres)"}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={
                                transferForm.watch("imto") === "WESTERN_UNION" ? "1234567890" :
                                transferForm.watch("imto") === "MONEYGRAM" ? "12345678" : "1234567890123456"
                              }
                              maxLength={
                                transferForm.watch("imto") === "WESTERN_UNION" ? 10 :
                                transferForm.watch("imto") === "MONEYGRAM" ? 8 : 16
                              }
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={transferForm.control}
                        name="imtoSenderFirstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prénom Expéditeur</FormLabel>
                            <FormControl>
                              <Input placeholder="Jean" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={transferForm.control}
                        name="imtoSenderLastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom Expéditeur</FormLabel>
                            <FormControl>
                              <Input placeholder="Dupont" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={transferForm.control}
                      name="imtoOriginCountry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pays d'Origine</FormLabel>
                          <FormControl>
                            <Input placeholder="France, États-Unis, Sénégal..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={transferForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="10000"
                          {...field}
                        />
                      </FormControl>
                      {field.value && (
                        <FormDescription>
                          Frais: {formatCurrency(calculateFees(Number(field.value), "TRANSFER"), overview.currency)} | 
                          Total: {formatCurrency(Number(field.value) + calculateFees(Number(field.value), "TRANSFER"), overview.currency)}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={transferForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsTransferDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit">Effectuer le Transfert</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="mx-auto mb-2 p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg w-fit">
                    <CreditCardIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold">Paiement</h3>
                  <p className="text-xs text-muted-foreground">Frais: 1%</p>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nouveau Paiement</DialogTitle>
            </DialogHeader>
            <ReceiptScanner onDataExtracted={handlePaymentDataExtracted} />
            <Form {...paymentForm}>
              <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Solde disponible</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(overview.creditBalance, overview.currency)}
                  </p>
                </div>

                <FormField
                  control={paymentForm.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du Client</FormLabel>
                      <FormControl>
                        <Input placeholder="Jean Dupont" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paymentForm.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input placeholder="+224 XXX XXX XXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paymentForm.control}
                  name="customerIdNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro d'Identité (optionnel)</FormLabel>
                      <FormControl>
                        <Input placeholder="CNI123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paymentForm.control}
                  name="imto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opérateur de Transfert (optionnel)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner l'opérateur (optionnel)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="WESTERN_UNION">{imtoLabels.WESTERN_UNION}</SelectItem>
                          <SelectItem value="MONEYGRAM">{imtoLabels.MONEYGRAM}</SelectItem>
                          <SelectItem value="RIA">{imtoLabels.RIA}</SelectItem>
                          <SelectItem value="WAVE">{imtoLabels.WAVE}</SelectItem>
                          <SelectItem value="ORANGE_MONEY">{imtoLabels.ORANGE_MONEY}</SelectItem>
                          <SelectItem value="MTN_MOBILE_MONEY">{imtoLabels.MTN_MOBILE_MONEY}</SelectItem>
                          <SelectItem value="MOOV_MONEY">{imtoLabels.MOOV_MONEY}</SelectItem>
                          <SelectItem value="OTHER">{imtoLabels.OTHER}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Sélectionnez l'opérateur si le paiement implique un transfert d'argent
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Champs spécifiques pour Western Union, MoneyGram, Ria */}
                {(paymentForm.watch("imto") === "WESTERN_UNION" || 
                  paymentForm.watch("imto") === "MONEYGRAM" || 
                  paymentForm.watch("imto") === "RIA") && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                    <h4 className="font-medium text-sm">
                      Informations {
                        paymentForm.watch("imto") === "WESTERN_UNION" ? "Western Union" :
                        paymentForm.watch("imto") === "MONEYGRAM" ? "MoneyGram" : "Ria"
                      }
                    </h4>

                    <FormField
                      control={paymentForm.control}
                      name="imtoReferenceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {paymentForm.watch("imto") === "WESTERN_UNION" && "MTCN (10 chiffres)"}
                            {paymentForm.watch("imto") === "MONEYGRAM" && "Référence (8 chiffres)"}
                            {paymentForm.watch("imto") === "RIA" && "PIN (16 chiffres)"}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={
                                paymentForm.watch("imto") === "WESTERN_UNION" ? "1234567890" :
                                paymentForm.watch("imto") === "MONEYGRAM" ? "12345678" : "1234567890123456"
                              }
                              maxLength={
                                paymentForm.watch("imto") === "WESTERN_UNION" ? 10 :
                                paymentForm.watch("imto") === "MONEYGRAM" ? 8 : 16
                              }
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={paymentForm.control}
                        name="imtoSenderFirstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prénom Expéditeur</FormLabel>
                            <FormControl>
                              <Input placeholder="Jean" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={paymentForm.control}
                        name="imtoSenderLastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom Expéditeur</FormLabel>
                            <FormControl>
                              <Input placeholder="Dupont" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={paymentForm.control}
                      name="imtoOriginCountry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pays d'Origine</FormLabel>
                          <FormControl>
                            <Input placeholder="France, États-Unis, Sénégal..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={paymentForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="10000"
                          {...field}
                        />
                      </FormControl>
                      {field.value && (
                        <FormDescription>
                          Frais: {formatCurrency(calculateFees(Number(field.value), "PAYMENT"), overview.currency)} | 
                          Total: {formatCurrency(Number(field.value) + calculateFees(Number(field.value), "PAYMENT"), overview.currency)}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={paymentForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Facture électricité, paiement loyer..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPaymentDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit">Effectuer le Paiement</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions Aujourd'hui</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayTransactions}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.todayAmount, stats.currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.totalAmount, stats.currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frais Collectés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalFees, stats.currency)}
            </div>
            <p className="text-xs text-muted-foreground">Total des frais</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Par Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>Dépôts:</span>
                <Badge variant="secondary">{stats.deposits}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Retraits:</span>
                <Badge variant="secondary">{stats.withdrawals}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Transferts:</span>
                <Badge variant="secondary">{stats.transfers}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Paiements:</span>
                <Badge variant="secondary">{stats.payments}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions Récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune transaction effectuée
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx._id}
                  className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      tx.type === "DEPOSIT" ? "bg-green-100 dark:bg-green-900/20 text-green-600" :
                      tx.type === "WITHDRAWAL" ? "bg-orange-100 dark:bg-orange-900/20 text-orange-600" :
                      tx.type === "TRANSFER" ? "bg-blue-100 dark:bg-blue-900/20 text-blue-600" :
                      "bg-purple-100 dark:bg-purple-900/20 text-purple-600"
                    }`}>
                      {tx.type === "DEPOSIT" && <ArrowDownIcon className="h-4 w-4" />}
                      {tx.type === "WITHDRAWAL" && <ArrowUpIcon className="h-4 w-4" />}
                      {tx.type === "TRANSFER" && <SendIcon className="h-4 w-4" />}
                      {tx.type === "PAYMENT" && <CreditCardIcon className="h-4 w-4" />}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{tx.customerName}</p>
                        <Badge variant="outline" className="text-xs">
                          {tx.type === "DEPOSIT" && "Dépôt"}
                          {tx.type === "WITHDRAWAL" && "Retrait"}
                          {tx.type === "TRANSFER" && "Transfert"}
                          {tx.type === "PAYMENT" && "Paiement"}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground">{tx.customerPhone}</p>

                      {tx.recipientName && (
                        <p className="text-xs text-muted-foreground">
                          → {tx.recipientName} ({tx.recipientPhone})
                        </p>
                      )}

                      {tx.imto && (
                        <p className="text-xs text-muted-foreground">
                          via {imtoLabels[tx.imto] || tx.imto}
                        </p>
                      )}

                      {tx.description && (
                        <p className="text-xs text-muted-foreground">{tx.description}</p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        {new Date(tx._creationTime).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </div>

                  <div className="text-right ml-4">
                    <p className="text-sm font-bold">
                      {formatCurrency(tx.amount, tx.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Frais: {formatCurrency(tx.fees || 0, tx.currency)}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground mt-1">
                      {tx.reference}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
