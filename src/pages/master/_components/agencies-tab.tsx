import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Building2, Plus, MapPin, Users, Wallet, Eye } from "lucide-react";
import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import AgencyDetail from "./agency-detail.tsx";
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
} from "@/components/ui/form.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Input } from "@/components/ui/input.tsx";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

const createAgencySchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  code: z.string().min(2, "Le code doit contenir au moins 2 caractères"),
  country: z.string().min(2, "Le pays est requis"),
  city: z.string().min(2, "La ville est requise"),
  address: z.string().optional(),
  phone: z.string().optional(),
  currency: z.enum(["XOF", "GNF"]),
});

type CreateAgencyFormData = z.infer<typeof createAgencySchema>;

export default function AgenciesTab() {
  const agencies = useQuery(api.agencies.listAgencies, {});
  const createAgency = useMutation(api.agencies.createAgency);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAgencyId, setSelectedAgencyId] = useState<Id<"agencies"> | null>(null);

  const form = useForm<CreateAgencyFormData>({
    resolver: zodResolver(createAgencySchema),
    defaultValues: {
      name: "",
      code: "",
      country: "",
      city: "",
      address: "",
      phone: "",
      currency: "XOF",
    },
  });

  const handleCreateAgency = async (data: CreateAgencyFormData) => {
    try {
      await createAgency({
        name: data.name,
        code: data.code,
        country: data.country,
        city: data.city,
        address: data.address,
        phone: data.phone,
        currency: data.currency,
      });
      toast.success("Agence créée avec succès");
      setIsCreateDialogOpen(false);
      form.reset();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Erreur lors de la création de l'agence");
      }
    }
  };

  if (agencies === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  // Show agency detail if one is selected
  if (selectedAgencyId) {
    return (
      <AgencyDetail
        agencyId={selectedAgencyId}
        onBack={() => setSelectedAgencyId(null)}
      />
    );
  }

  const formatCurrency = (amount: number, currency: string) => {
    return (
      new Intl.NumberFormat("fr-FR", {
        style: "decimal",
        minimumFractionDigits: 0,
      }).format(amount) +
      " " +
      currency
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Agences</h2>
          <p className="text-muted-foreground">
            {agencies.length} agence{agencies.length > 1 ? "s" : ""} au total
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Agence
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Créer une Agence</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleCreateAgency)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de l'agence</FormLabel>
                      <FormControl>
                        <Input placeholder="Agence Centre-Ville" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="AGC001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pays</FormLabel>
                        <FormControl>
                          <Input placeholder="Guinée" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ville</FormLabel>
                        <FormControl>
                          <Input placeholder="Conakry" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse (optionnel)</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Rue de la Paix" {...field} />
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
                        <Input placeholder="+224 123 456 789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Devise</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une devise" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="XOF">XOF (Franc CFA)</SelectItem>
                          <SelectItem value="GNF">
                            GNF (Franc Guinéen)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit">Créer</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Agencies Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {agencies.map((agency) => (
          <Card key={agency._id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {agency.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="px-2 py-1 rounded bg-primary/10 text-primary font-mono">
                  {agency.code}
                </span>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    agency.status === "ACTIVE"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                  }`}
                >
                  {agency.status}
                </span>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {agency.city}, {agency.country}
                  </span>
                </div>
                {agency.address && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>{agency.address}</span>
                  </div>
                )}
                {agency.phone && (
                  <div className="flex items-center gap-2">
                    <span>📱</span>
                    <span>{agency.phone}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Utilisateurs
                  </span>
                  <span className="font-semibold">{agency.userCount || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Wallet className="h-4 w-4" />
                    Crédit
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(agency.creditBalance, agency.currency)}
                  </span>
                </div>
              </div>

              <Button
                variant="secondary"
                className="w-full mt-3"
                onClick={() => setSelectedAgencyId(agency._id)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Voir détails
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
