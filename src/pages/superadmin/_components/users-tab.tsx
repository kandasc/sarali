import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Plus, UserCog, Shield, Store } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

const createMasterSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  currency: z.enum(["XOF", "GNF"]),
});

type CreateMasterFormData = z.infer<typeof createMasterSchema>;

const createBillerSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  billerId: z.string().min(1, "Fournisseur requis"),
  currency: z.enum(["XOF", "GNF"]),
});

type CreateBillerFormData = z.infer<typeof createBillerSchema>;

function CreateMasterDialog() {
  const [open, setOpen] = useState(false);
  const createMaster = useMutation(api.superAdmin.createMaster);
  
  const form = useForm<CreateMasterFormData>({
    resolver: zodResolver(createMasterSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      currency: "XOF",
    },
  });

  const onSubmit = async (data: CreateMasterFormData) => {
    try {
      await createMaster(data);
      toast.success("Master user created successfully");
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error("Failed to create Master user");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Master
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Master User</DialogTitle>
          <DialogDescription>
            Create a new Master user who will have full control over their organization
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
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
                    <Input type="email" placeholder="john@example.com" {...field} />
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
                  <FormLabel>Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+225 07 00 00 00 00" {...field} />
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
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="XOF">XOF (West African CFA franc)</SelectItem>
                      <SelectItem value="GNF">GNF (Guinean franc)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CreateBillerDialog() {
  const [open, setOpen] = useState(false);
  const createBillerUser = useMutation(api.superAdmin.createBillerUser);
  const billers = useQuery(api.superAdmin.listBillersForSelect);
  
  const form = useForm<CreateBillerFormData>({
    resolver: zodResolver(createBillerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      billerId: "",
      currency: "XOF",
    },
  });

  const onSubmit = async (data: CreateBillerFormData) => {
    try {
      await createBillerUser({
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        billerId: data.billerId as Id<"billers">,
        currency: data.currency,
      });
      toast.success("Utilisateur fournisseur créé avec succès");
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error("Erreur lors de la création de l'utilisateur");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Store className="h-4 w-4 mr-2" />
          Créer Fournisseur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un utilisateur Fournisseur</DialogTitle>
          <DialogDescription>
            Créer un compte d'accès pour un fournisseur partenaire
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="billerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fournisseur</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un fournisseur" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {billers?.map((biller) => (
                        <SelectItem key={biller.id} value={biller.id}>
                          {biller.name} ({biller.code})
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du contact</FormLabel>
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
                    <Input type="email" placeholder="contact@fournisseur.com" {...field} />
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
                  <FormLabel>Téléphone (Optionnel)</FormLabel>
                  <FormControl>
                    <Input placeholder="+225 07 00 00 00 00" {...field} />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="XOF">XOF (Franc CFA)</SelectItem>
                      <SelectItem value="GNF">GNF (Franc Guinéen)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Créer</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersTab() {
  const [roleFilter, setRoleFilter] = useState<"SUPER_ADMIN" | "MASTER" | "MANAGER" | "CHEF_AGENCE" | "CAISSIER" | "BILLER" | undefined>(undefined);
  const users = useQuery(api.superAdmin.listAllUsers, { role: roleFilter });
  const deleteUser = useMutation(api.superAdmin.deleteUser);

  const handleDelete = async (userId: Id<"users">) => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteUser({ userId });
        toast.success("User deleted successfully");
      } catch (error) {
        toast.error("Failed to delete user");
      }
    }
  };

  if (users === undefined) {
    return <Skeleton className="h-96 w-full" />;
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
      case "MASTER": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      case "MANAGER": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "CHEF_AGENCE": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "CAISSIER": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
      case "BILLER": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
      default: return "";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage all users across the system
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <CreateBillerDialog />
              <CreateMasterDialog />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as typeof roleFilter)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" onClick={() => setRoleFilter(undefined)}>All Roles</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                <SelectItem value="MASTER">Master</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="CHEF_AGENCE">Agency Head</SelectItem>
                <SelectItem value="CAISSIER">Cashier</SelectItem>
                <SelectItem value="BILLER">Biller</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Biller</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Credit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.role === "BILLER" && "billerName" in user ? (
                          <Badge variant="outline">
                            <Store className="h-3 w-3 mr-1" />
                            {user.billerName}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === "ACTIVE" ? "default" : "secondary"}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.creditBalance.toLocaleString()} {user.currency}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.role !== "SUPER_ADMIN" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(user._id)}
                          >
                            Delete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
