import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { UserPlus, Edit, Ban, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
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
import type { Id } from "@/convex/_generated/dataModel.d.ts";

const createUserSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  role: z.enum(["MANAGER", "CHEF_AGENCE", "CAISSIER"]),
  agencyId: z.string().optional(),
  currency: z.enum(["XOF", "GNF"]),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

export default function UsersTab() {
  const users = useQuery(api.rbac.listUsers, {});
  const agencies = useQuery(api.agencies.listAgencies, {});
  const createUser = useMutation(api.rbac.createUser);
  const updateUser = useMutation(api.rbac.updateUser);
  const deactivateUser = useMutation(api.rbac.deactivateUser);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "CAISSIER",
      currency: "XOF",
    },
  });

  const handleCreateUser = async (data: CreateUserFormData) => {
    try {
      await createUser({
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        agencyId: data.agencyId as Id<"agencies"> | undefined,
        currency: data.currency,
      });
      toast.success("Utilisateur créé avec succès");
      setIsCreateDialogOpen(false);
      form.reset();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Erreur lors de la création de l'utilisateur");
      }
    }
  };

  const handleDeactivate = async (userId: Id<"users">) => {
    try {
      await deactivateUser({ userId });
      toast.success("Utilisateur désactivé");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Erreur lors de la désactivation");
      }
    }
  };

  if (users === undefined || agencies === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "MASTER":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "MANAGER":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "CHEF_AGENCE":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "CAISSIER":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      minimumFractionDigits: 0,
    }).format(amount) + " " + currency;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Utilisateurs</h2>
          <p className="text-muted-foreground">
            {users.length} utilisateur{users.length > 1 ? "s" : ""} au total
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Nouvel Utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Créer un Utilisateur</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleCreateUser)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet</FormLabel>
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
                        <Input
                          type="email"
                          placeholder="jean@example.com"
                          {...field}
                        />
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
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rôle</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un rôle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                          <SelectItem value="CHEF_AGENCE">
                            Chef d'Agence
                          </SelectItem>
                          <SelectItem value="CAISSIER">Caissier</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agencyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agence (optionnel)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une agence" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Aucune</SelectItem>
                          {agencies.map((agency) => (
                            <SelectItem key={agency._id} value={agency._id}>
                              {agency.name} ({agency.code})
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

      {/* Users List */}
      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user._id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{user.name}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(user.role)}`}
                    >
                      {user.role}
                    </span>
                    {user.status === "ACTIVE" ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>📧 {user.email || "Non renseigné"}</p>
                    {user.phone && <p>📱 {user.phone}</p>}
                    <p>
                      💰 Crédit: {formatCurrency(user.creditBalance, user.currency)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {user.status === "ACTIVE" && user.role !== "MASTER" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeactivate(user._id)}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Désactiver
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
