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
  DialogTrigger 
} from "@/components/ui/dialog.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";
import { PlusIcon, UserIcon, CreditCardIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth.ts";

const createCashierSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
});

type CreateCashierValues = z.infer<typeof createCashierSchema>;

export default function CashiersTab() {
  const { user } = useAuth();
  const cashiers = useQuery(api.agencyDashboard.getAgencyCashiers, { status: "ACTIVE" });
  const currentUser = useQuery(api.users.getCurrentUser);
  const createUser = useMutation(api.rbac.createUser);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const form = useForm<CreateCashierValues>({
    resolver: zodResolver(createCashierSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  const onSubmit = async (values: CreateCashierValues) => {
    try {
      if (!currentUser?.agencyId) {
        toast.error("Vous n'êtes pas assigné à une agence");
        return;
      }

      await createUser({
        name: values.name,
        email: values.email,
        phone: values.phone,
        role: "CAISSIER",
        agencyId: currentUser.agencyId,
        managerId: currentUser._id,
        currency: currentUser.currency,
      });

      toast.success("Caissier créé avec succès");
      form.reset();
      setIsCreateDialogOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Erreur: ${error.message}`);
      } else {
        toast.error("Échec de la création du caissier");
      }
    }
  };

  if (!cashiers) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
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
          <h2 className="text-2xl font-bold">Gestion des Caissiers</h2>
          <p className="text-muted-foreground">
            {cashiers.length} caissier{cashiers.length > 1 ? "s" : ""} actif{cashiers.length > 1 ? "s" : ""}
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Nouveau Caissier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un Nouveau Caissier</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom Complet</FormLabel>
                      <FormControl>
                        <Input placeholder="Jean Dupont" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="jean@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone (optionnel)</FormLabel>
                      <FormControl>
                        <Input placeholder="+224 XXX XXX XXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit">Créer le Caissier</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {cashiers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun caissier</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Commencez par créer votre premier caissier
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Créer un Caissier
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cashiers.map((cashier) => (
            <Card key={cashier._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <UserIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{cashier.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {cashier.role}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">
                    {formatCurrency(cashier.creditBalance, cashier.currency)}
                  </span>
                </div>

                {cashier.email && (
                  <div className="text-sm text-muted-foreground truncate">
                    {cashier.email}
                  </div>
                )}

                {cashier.phone && (
                  <div className="text-sm text-muted-foreground">
                    {cashier.phone}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t">
                  <Badge variant={cashier.status === "ACTIVE" ? "default" : "secondary"}>
                    {cashier.status === "ACTIVE" ? "Actif" : "Inactif"}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Créé le {new Date(cashier._creationTime).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
