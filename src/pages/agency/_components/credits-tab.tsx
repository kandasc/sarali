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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { toast } from "sonner";
import { 
  SendIcon, 
  AlertTriangleIcon, 
  CreditCardIcon,
  TrendingUpIcon
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

const transferSchema = z.object({
  toUserId: z.string().min(1, "Sélectionnez un caissier"),
  amount: z.string().min(1, "Montant requis").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Le montant doit être positif"
  ),
  reason: z.string().optional(),
});

type TransferValues = z.infer<typeof transferSchema>;

export default function CreditsTab() {
  const overview = useQuery(api.credits.getCreditOverview);
  const cashiers = useQuery(api.agencyDashboard.getAgencyCashiers, { status: "ACTIVE" });
  const lowCreditAlerts = useQuery(api.agencyDashboard.getLowCreditCashiers, { threshold: 5000 });
  const transferCredit = useMutation(api.credits.transferCreditToUser);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);

  const form = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      toUserId: "",
      amount: "",
      reason: "",
    },
  });

  const onSubmit = async (values: TransferValues) => {
    try {
      await transferCredit({
        toUserId: values.toUserId as Id<"users">,
        amount: Number(values.amount),
        reason: values.reason || "Transfert de crédit vers caissier",
      });

      toast.success("Crédit transféré avec succès");
      form.reset();
      setIsTransferDialogOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Erreur: ${error.message}`);
      } else {
        toast.error("Échec du transfert");
      }
    }
  };

  if (!overview || !cashiers) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion du Crédit</h2>
          <p className="text-muted-foreground">Distribuez du crédit à vos caissiers</p>
        </div>

        <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <SendIcon className="mr-2 h-4 w-4" />
              Transférer du Crédit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transférer du Crédit à un Caissier</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Solde disponible</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(overview.myBalance, overview.currency)}
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="toUserId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Caissier</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez un caissier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cashiers.map((cashier) => (
                            <SelectItem key={cashier._id} value={cashier._id}>
                              {cashier.name} - {formatCurrency(cashier.creditBalance, cashier.currency)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
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
                      <FormDescription>
                        En {overview.currency}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Raison (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Approvisionnement hebdomadaire..."
                          {...field}
                        />
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
                  <Button type="submit">Transférer</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Credit Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mon Solde</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(overview.myBalance, overview.currency)}
            </div>
            <p className="text-xs text-muted-foreground">Disponible pour transfert</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crédit Distribué</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(overview.totalUserCredit, overview.currency)}
            </div>
            <p className="text-xs text-muted-foreground">Chez les caissiers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crédit Total</CardTitle>
            <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(overview.totalSystemCredit, overview.currency)}
            </div>
            <p className="text-xs text-muted-foreground">Dans votre agence</p>
          </CardContent>
        </Card>
      </div>

      {/* Low Credit Alerts */}
      {lowCreditAlerts && lowCreditAlerts.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangleIcon className="h-5 w-5 text-orange-600" />
              <CardTitle>Alertes Crédit Faible</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowCreditAlerts.map((cashier) => (
                <div
                  key={cashier._id}
                  className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{cashier.name}</p>
                    <p className="text-sm text-muted-foreground">{cashier.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600">
                      {formatCurrency(cashier.creditBalance, cashier.currency)}
                    </p>
                    <Badge variant="outline" className="text-orange-600">
                      Crédit faible
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cashiers Credit Status */}
      <Card>
        <CardHeader>
          <CardTitle>État du Crédit des Caissiers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cashiers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun caissier disponible
              </p>
            ) : (
              cashiers.map((cashier) => (
                <div key={cashier._id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{cashier.name}</p>
                    <p className="text-sm text-muted-foreground">{cashier.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {formatCurrency(cashier.creditBalance, cashier.currency)}
                    </p>
                    <Badge
                      variant={cashier.creditBalance < 5000 ? "destructive" : "secondary"}
                    >
                      {cashier.creditBalance < 5000 ? "Faible" : "Normal"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
