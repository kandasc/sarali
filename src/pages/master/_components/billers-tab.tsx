import { useState, useRef, type FormEvent } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Building2, Edit, Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";

const billerSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  code: z.string().min(2, "Le code doit contenir au moins 2 caractères"),
  category: z.enum(["ELECTRICITY", "WATER", "INTERNET", "PHONE", "TV", "OTHER"]),
  description: z.string().optional(),
  isActive: z.boolean(),
  supportedCurrencies: z.array(z.enum(["XOF", "GNF"])).min(1, "Sélectionnez au moins une devise"),
  countries: z.array(z.string()).min(1, "Sélectionnez au moins un pays"),
  feePercentage: z.number().min(0).max(100).optional(),
  feeFixed: z.number().min(0).optional(),
});

type BillerFormData = z.infer<typeof billerSchema>;

function CreateBillerDialog() {
  const [open, setOpen] = useState(false);
  const [logoStorageId, setLogoStorageId] = useState<Id<"_storage"> | undefined>();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateLogoUploadUrl = useMutation(api.billers.generateLogoUploadUrl);
  const createBiller = useMutation(api.billers.createBiller);

  const form = useForm<BillerFormData>({
    resolver: zodResolver(billerSchema),
    defaultValues: {
      name: "",
      code: "",
      category: "ELECTRICITY",
      description: "",
      isActive: true,
      supportedCurrencies: ["XOF"],
      countries: [],
      feePercentage: 0,
      feeFixed: 0,
    },
  });

  const handleLogoUpload = async (event: FormEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    setIsUploading(true);

    try {
      // Upload file to storage
      const uploadUrl = await generateLogoUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      setLogoStorageId(storageId);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      toast.success("Logo téléchargé avec succès");
    } catch (error) {
      toast.error("Erreur lors du téléchargement du logo");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: BillerFormData) => {
    try {
      await createBiller({
        ...data,
        logoStorageId,
      });

      toast.success("Fournisseur créé avec succès");
      setOpen(false);
      form.reset();
      setLogoStorageId(undefined);
      setLogoPreview(null);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Erreur lors de la création du fournisseur");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Building2 className="h-4 w-4 mr-2" />
          Ajouter un fournisseur
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un fournisseur</DialogTitle>
          <DialogDescription>
            Créez un nouveau fournisseur de factures avec son logo
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative h-24 w-24 rounded-lg border overflow-hidden">
                    <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain" />
                  </div>
                ) : (
                  <div className="h-24 w-24 rounded-lg border flex items-center justify-center bg-muted">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    disabled={isUploading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Format recommandé: PNG ou SVG avec fond transparent
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du fournisseur</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: CIE" {...field} />
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
                    <FormLabel>Code unique</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: CIE_CI" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ELECTRICITY">Électricité</SelectItem>
                      <SelectItem value="WATER">Eau</SelectItem>
                      <SelectItem value="INTERNET">Internet</SelectItem>
                      <SelectItem value="PHONE">Téléphone</SelectItem>
                      <SelectItem value="TV">Télévision</SelectItem>
                      <SelectItem value="OTHER">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Description du fournisseur" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supportedCurrencies"
              render={() => (
                <FormItem>
                  <FormLabel>Devises supportées</FormLabel>
                  <div className="flex gap-4">
                    <FormField
                      control={form.control}
                      name="supportedCurrencies"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes("XOF")}
                              onCheckedChange={(checked) => {
                                const value = field.value || [];
                                if (checked) {
                                  field.onChange([...value, "XOF"]);
                                } else {
                                  field.onChange(value.filter((v) => v !== "XOF"));
                                }
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">XOF (Franc CFA)</FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="supportedCurrencies"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes("GNF")}
                              onCheckedChange={(checked) => {
                                const value = field.value || [];
                                if (checked) {
                                  field.onChange([...value, "GNF"]);
                                } else {
                                  field.onChange(value.filter((v) => v !== "GNF"));
                                }
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">GNF (Franc Guinéen)</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="countries"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pays</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Côte d'Ivoire, Guinée"
                      value={field.value?.join(", ")}
                      onChange={(e) => {
                        const countries = e.target.value
                          .split(",")
                          .map((c) => c.trim())
                          .filter((c) => c);
                        field.onChange(countries);
                      }}
                    />
                  </FormControl>
                  <FormDescription>Séparez les pays par des virgules</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="feePercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frais (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="feeFixed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frais fixes</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Actif</FormLabel>
                    <FormDescription>
                      Le fournisseur sera visible sur l'interface publique
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isUploading}>
                Créer le fournisseur
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function BillersTab() {
  const billers = useQuery(api.billers.listAllBillers);
  const deleteBiller = useMutation(api.billers.deleteBiller);

  const handleDelete = async (billerId: Id<"billers">) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce fournisseur ?")) {
      return;
    }

    try {
      await deleteBiller({ billerId });
      toast.success("Fournisseur supprimé");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Erreur lors de la suppression");
      }
    }
  };

  if (billers === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des fournisseurs</h2>
          <p className="text-muted-foreground">
            Gérez les fournisseurs de factures et leurs logos
          </p>
        </div>
        <CreateBillerDialog />
      </div>

      {billers.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>Aucun fournisseur</EmptyTitle>
            <EmptyDescription>
              Commencez par ajouter votre premier fournisseur
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <CreateBillerDialog />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {billers.map((biller) => (
            <Card key={biller._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {biller.logoUrl ? (
                      <img
                        src={biller.logoUrl}
                        alt={biller.name}
                        className="h-12 w-12 object-contain rounded"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{biller.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{biller.code}</p>
                    </div>
                  </div>
                  {biller.isActive ? (
                    <Badge variant="default">Actif</Badge>
                  ) : (
                    <Badge variant="secondary">Inactif</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Catégorie</p>
                    <p className="text-sm text-muted-foreground">
                      {biller.category === "ELECTRICITY" && "Électricité"}
                      {biller.category === "WATER" && "Eau"}
                      {biller.category === "INTERNET" && "Internet"}
                      {biller.category === "PHONE" && "Téléphone"}
                      {biller.category === "TV" && "Télévision"}
                      {biller.category === "OTHER" && "Autre"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium">Devises</p>
                    <p className="text-sm text-muted-foreground">
                      {biller.supportedCurrencies.join(", ")}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium">Pays</p>
                    <p className="text-sm text-muted-foreground">
                      {biller.countries.join(", ")}
                    </p>
                  </div>

                  {(biller.feePercentage || biller.feeFixed) && (
                    <div>
                      <p className="text-sm font-medium">Frais</p>
                      <p className="text-sm text-muted-foreground">
                        {biller.feePercentage ? `${biller.feePercentage}%` : ""}
                        {biller.feePercentage && biller.feeFixed && " + "}
                        {biller.feeFixed ? `${biller.feeFixed} XOF` : ""}
                      </p>
                    </div>
                  )}

                  {biller.description && (
                    <div>
                      <p className="text-sm font-medium">Description</p>
                      <p className="text-sm text-muted-foreground">{biller.description}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(biller._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
