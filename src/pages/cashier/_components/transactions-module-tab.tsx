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
  amount: z.string().min(1, "Montant requis").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Le montant doit être positif"
  ),
  description: z.string().optional(),
});

const paymentSchema = z.object({
  customerName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  customerPhone: z.string().min(8, "Numéro de téléphone invalide"),
  customerIdNumber: z.string().optional(),
  amount: z.string().min(1, "Montant requis").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Le montant doit être positif"
  ),
  description: z.string().min(3, "Description requise"),
});

type DepositValues = z.infer<typeof depositSchema>;
type WithdrawalValues = z.infer<typeof withdrawalSchema>;
type TransferValues = z.infer<typeof transferSchema>;
type PaymentValues = z.infer<typeof paymentSchema>;

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
      amount: "",
      description: "",
    },
  });

  const paymentForm = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerIdNumber: "",
      amount: "",
      description: "",
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
      });

      toast.success(`Dépôt effectué avec succès. Référence: ${result.reference}`);
      depositForm.reset();
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
      });

      toast.success(`Retrait effectué avec succès. Référence: ${result.reference}`);
      withdrawalForm.reset();
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
        description: values.description,
      });

      toast.success(`Transfert effectué avec succès. Référence: ${result.reference}`);
      transferForm.reset();
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
      });

      toast.success(`Paiement effectué avec succès. Référence: ${result.reference}`);
      paymentForm.reset();
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
