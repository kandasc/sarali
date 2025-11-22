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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Upload, FileText, AlertCircle, CheckCircle, XCircle, Clock, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface BulkPaymentItem {
  recipientName: string;
  recipientPhone: string;
  recipientAccount?: string;
  amount: number;
  description?: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> En attente</Badge>;
    case "PROCESSING":
      return <Badge variant="default"><Clock className="h-3 w-3 mr-1" /> En traitement</Badge>;
    case "COMPLETED":
      return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Terminé</Badge>;
    case "FAILED":
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Échoué</Badge>;
    case "CANCELLED":
      return <Badge variant="outline"><Trash2 className="h-3 w-3 mr-1" /> Annulé</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function CreateBulkPaymentDialog() {
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState<"XOF" | "GNF">("XOF");
  const [items, setItems] = useState<BulkPaymentItem[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileStorageId, setFileStorageId] = useState<Id<"_storage"> | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const generateUploadUrl = useMutation(api.bulkPayments.generateUploadUrl);
  const createBulkPayment = useMutation(api.bulkPayments.createBulkPayment);

  const handleFileUpload = async (event: FormEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFileName(file.name);

    try {
      // Upload file to storage
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      setFileStorageId(storageId);

      // Parse CSV/text file
      const text = await file.text();
      const lines = text.trim().split("\n");
      
      if (lines.length < 2) {
        toast.error("Le fichier doit contenir au moins une ligne d'en-tête et une ligne de données");
        setIsUploading(false);
        return;
      }

      // Parse CSV (assuming format: name,phone,account,amount,description)
      const parsedItems: BulkPaymentItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(",").map(p => p.trim());
        if (parts.length < 4) continue;

        parsedItems.push({
          recipientName: parts[0],
          recipientPhone: parts[1],
          recipientAccount: parts[2] || undefined,
          amount: parseFloat(parts[3]) || 0,
          description: parts[4] || undefined,
        });
      }

      setItems(parsedItems);
      toast.success(`${parsedItems.length} paiements chargés depuis le fichier`);
    } catch (error) {
      toast.error("Erreur lors du téléchargement du fichier");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error("Veuillez charger un fichier avec des paiements");
      return;
    }

    try {
      const result = await createBulkPayment({
        fileName,
        fileStorageId,
        items,
        currency,
      });

      toast.success(`Lot de paiement créé: ${result.batchReference}`);
      setOpen(false);
      setItems([]);
      setFileName("");
      setFileStorageId(undefined);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Erreur lors de la création du lot de paiement");
      }
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Nouveau lot de paiement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Créer un lot de paiement de masse</DialogTitle>
            <DialogDescription>
              Téléchargez un fichier CSV avec les paiements à traiter
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Devise</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as "XOF" | "GNF")}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="XOF">XOF (Franc CFA)</SelectItem>
                  <SelectItem value="GNF">GNF (Franc Guinéen)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Fichier CSV</Label>
              <Input
                id="file"
                type="file"
                accept=".csv,.txt"
                ref={fileInputRef}
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <p className="text-xs text-muted-foreground">
                Format: nom,téléphone,compte,montant,description (une ligne par paiement)
              </p>
            </div>

            {items.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Aperçu des paiements</Label>
                  <Badge variant="secondary">
                    {items.length} paiement{items.length > 1 ? "s" : ""} • Total: {totalAmount.toLocaleString()} {currency}
                  </Badge>
                </div>
                <div className="border rounded-lg max-h-60 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Téléphone</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.slice(0, 10).map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.recipientName}</TableCell>
                          <TableCell>{item.recipientPhone}</TableCell>
                          <TableCell>{item.amount.toLocaleString()} {currency}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {item.description || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {items.length > 10 && (
                    <div className="p-2 text-center text-sm text-muted-foreground border-t">
                      ... et {items.length - 10} autre{items.length - 10 > 1 ? "s" : ""} paiement{items.length - 10 > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={items.length === 0 || isUploading}>
              Créer le lot ({items.length} paiements)
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BulkPaymentDetailsDialog({ bulkPaymentId }: { bulkPaymentId: Id<"bulkPayments"> }) {
  const [open, setOpen] = useState(false);
  const details = useQuery(api.bulkPayments.getBulkPaymentDetails, { bulkPaymentId });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          Voir les détails
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails du lot de paiement</DialogTitle>
          <DialogDescription>
            {details?.batchReference}
          </DialogDescription>
        </DialogHeader>

        {!details ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{details.totalItems}</div>
                  <p className="text-xs text-muted-foreground">paiements</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Réussis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{details.successfulItems}</div>
                  <p className="text-xs text-muted-foreground">paiements</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Échoués</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{details.failedItems}</div>
                  <p className="text-xs text-muted-foreground">paiements</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Montant</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{details.totalAmount.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">{details.currency}</p>
                </CardContent>
              </Card>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Liste des paiements</h3>
              <div className="border rounded-lg max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Bénéficiaire</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Référence</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.items.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>{item.rowNumber}</TableCell>
                        <TableCell className="font-medium">{item.recipientName}</TableCell>
                        <TableCell>{item.recipientPhone}</TableCell>
                        <TableCell>{item.amount.toLocaleString()} {item.currency}</TableCell>
                        <TableCell className="font-mono text-sm">{item.reference}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function BulkPaymentsTab() {
  const bulkPayments = useQuery(api.bulkPayments.listBulkPayments);
  const processBulkPayment = useMutation(api.bulkPayments.processBulkPayment);
  const cancelBulkPayment = useMutation(api.bulkPayments.cancelBulkPayment);

  const handleProcess = async (bulkPaymentId: Id<"bulkPayments">) => {
    try {
      const result = await processBulkPayment({ bulkPaymentId });
      toast.success(
        `Traitement terminé: ${result.successfulItems} réussis, ${result.failedItems} échoués`
      );
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Erreur lors du traitement du lot");
      }
    }
  };

  const handleCancel = async (bulkPaymentId: Id<"bulkPayments">) => {
    try {
      await cancelBulkPayment({ bulkPaymentId });
      toast.success("Lot de paiement annulé");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Erreur lors de l'annulation");
      }
    }
  };

  if (bulkPayments === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Paiements de masse</h2>
          <p className="text-muted-foreground">
            Gérez les paiements groupés et les traitements par lot
          </p>
        </div>
        <CreateBulkPaymentDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique des lots de paiement</CardTitle>
          <CardDescription>
            Liste de tous les lots de paiements traités
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bulkPayments.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText />
                </EmptyMedia>
                <EmptyTitle>Aucun lot de paiement</EmptyTitle>
                <EmptyDescription>
                  Commencez par créer votre premier lot de paiement de masse
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <CreateBulkPaymentDialog />
              </EmptyContent>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Fichier</TableHead>
                  <TableHead>Paiements</TableHead>
                  <TableHead>Montant total</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Créé par</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bulkPayments.map((bp) => (
                  <TableRow key={bp._id}>
                    <TableCell className="font-mono text-sm">{bp.batchReference}</TableCell>
                    <TableCell>{bp.fileName}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{bp.totalItems} total</span>
                        {bp.processedItems > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {bp.successfulItems} ✓ • {bp.failedItems} ✗
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {bp.totalAmount.toLocaleString()} {bp.currency}
                    </TableCell>
                    <TableCell>{getStatusBadge(bp.status)}</TableCell>
                    <TableCell>{bp.creatorName}</TableCell>
                    <TableCell>
                      {format(new Date(bp._creationTime), "dd MMM yyyy HH:mm", {
                        locale: fr,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BulkPaymentDetailsDialog bulkPaymentId={bp._id} />
                        {bp.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleProcess(bp._id)}
                            >
                              Traiter
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancel(bp._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
