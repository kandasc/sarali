import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Building2,
  MapPin,
  Users,
  Wallet,
  ArrowLeft,
  Edit,
  UserPlus,
  TrendingUp,
  Activity,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
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
import { useState } from "react";

const updateAgencySchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  country: z.string().min(2, "Le pays est requis"),
  city: z.string().min(2, "La ville est requise"),
  address: z.string().optional(),
  phone: z.string().optional(),
  managerId: z.string().optional(),
});

type UpdateAgencyFormData = z.infer<typeof updateAgencySchema>;

const createUserSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  role: z.enum(["MANAGER", "CHEF_AGENCE", "CAISSIER"]),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface AgencyDetailProps {
  agencyId: Id<"agencies">;
  onBack: () => void;
}

export default function AgencyDetail({ agencyId, onBack }: AgencyDetailProps) {
  const agency = useQuery(api.agencies.getAgencyById, { agencyId });
  const stats = useQuery(api.agencies.getAgencyStats, { agencyId });
  const allUsers = useQuery(api.rbac.listUsers, {});
  const updateAgency = useMutation(api.agencies.updateAgency);
  const createUser = useMutation(api.rbac.createUser);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);

  const editForm = useForm<UpdateAgencyFormData>({
    resolver: zodResolver(updateAgencySchema),
  });

  const userForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "CAISSIER",
    },
  });

  const handleUpdateAgency = async (data: UpdateAgencyFormData) => {
    try {
      await updateAgency({
        agencyId,
        name: data.name,
        country: data.country,
        city: data.city,
        address: data.address,
        phone: data.phone,
        managerId:
          data.managerId && data.managerId !== "none"
            ? (data.managerId as Id<"users">)
            : undefined,
      });
      toast.success("Agence mise à jour avec succès");
      setIsEditDialogOpen(false);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Erreur lors de la mise à jour");
      }
    }
  };

  const handleCreateUser = async (data: CreateUserFormData) => {
    try {
      await createUser({
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        agencyId: agencyId,
        currency: agency?.currency || "XOF",
      });
      toast.success("Utilisateur créé avec succès");
      setIsAddUserDialogOpen(false);
      userForm.reset();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Erreur lors de la création");
      }
    }
  };

  if (agency === undefined || stats === undefined || allUsers === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // Set default values for edit form when agency data loads
  if (agency && !editForm.formState.isDirty) {
    editForm.reset({
      name: agency.name,
      country: agency.country,
      city: agency.city,
      address: agency.address || "",
      phone: agency.phone || "",
      managerId: agency.managerId || "none",
    });
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

  const potentialManagers = allUsers.filter(
    (u) => u.role === "MANAGER" || u.role === "CHEF_AGENCE"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              {agency.name}
            </h2>
            <p className="text-muted-foreground">
              Code: {agency.code} • {agency.city}, {agency.country}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Modifier l'agence</DialogTitle>
              </DialogHeader>
              <Form {...editForm}>
                <form
                  onSubmit={editForm.handleSubmit(handleUpdateAgency)}
                  className="space-y-4"
                >
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de l'agence</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pays</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ville</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adresse (optionnel)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone (optionnel)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="managerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manager</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un manager" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Aucun</SelectItem>
                            {potentialManagers.map((user) => (
                              <SelectItem key={user._id} value={user._id}>
                                {user.name} ({user.role})
                              </SelectItem>
                            ))}
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
                      onClick={() => setIsEditDialogOpen(false)}
                    >
                      Annuler
                    </Button>
                    <Button type="submit">Enregistrer</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isAddUserDialogOpen}
            onOpenChange={setIsAddUserDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Ajouter un Utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Ajouter un utilisateur à l'agence</DialogTitle>
              </DialogHeader>
              <Form {...userForm}>
                <form
                  onSubmit={userForm.handleSubmit(handleCreateUser)}
                  className="space-y-4"
                >
                  <FormField
                    control={userForm.control}
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
                    control={userForm.control}
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
                    control={userForm.control}
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
                    control={userForm.control}
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

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddUserDialogOpen(false)}
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
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Utilisateurs actifs
                </p>
                <p className="text-2xl font-bold">{stats.activeUsers}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chefs d'agence</p>
                <p className="text-2xl font-bold">{stats.chefs}</p>
              </div>
              <Activity className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Caissiers</p>
                <p className="text-2xl font-bold">{stats.caissiers}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Crédit de l'agence
                </p>
                <p className="text-xl font-bold">
                  {formatCurrency(stats.agencyCreditBalance, stats.currency)}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agency Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de l'agence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Localisation</p>
              <p className="font-medium flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4" />
                {agency.city}, {agency.country}
              </p>
              {agency.address && (
                <p className="text-sm text-muted-foreground mt-1">
                  {agency.address}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Contact</p>
              {agency.phone && (
                <p className="font-medium mt-1">📱 {agency.phone}</p>
              )}
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Manager</p>
              <p className="font-medium mt-1">
                {agency.manager?.name || "Non assigné"}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Devise</p>
              <p className="font-medium mt-1">{agency.currency}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users in Agency */}
      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs de l'agence ({agency.users?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {agency.users && agency.users.length > 0 ? (
            <div className="space-y-3">
              {agency.users.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{user.name}</p>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(user.role)}`}
                      >
                        {user.role}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatCurrency(user.creditBalance, user.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">Crédit</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucun utilisateur dans cette agence</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setIsAddUserDialogOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Ajouter un utilisateur
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
