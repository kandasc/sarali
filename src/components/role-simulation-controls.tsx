import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useState } from "react";
import { api } from "@/convex/_generated/api.js";
import { Eye, History } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function RoleSimulationControls() {
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [simulatedRole, setSimulatedRole] = useState<string>("");
  const [reason, setReason] = useState("");
  const startSimulation = useMutation(api.roleSimulation.startSimulation);
  const history = useQuery(api.roleSimulation.getSimulationHistory, {});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!simulatedRole || !reason) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    try {
      await startSimulation({
        simulatedRole: simulatedRole as
          | "MANAGER"
          | "CHEF_AGENCE"
          | "CAISSIER",
        reason,
      });
      toast.success("Simulation démarrée avec succès");
      setOpen(false);
      setSimulatedRole("");
      setReason("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur lors du démarrage"
      );
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Simulation de Rôles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Simulez l'expérience d'un autre rôle pour tester et déboguer le
            système.
          </p>
          <div className="flex gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1">
                  <Eye className="mr-2 h-4 w-4" />
                  Démarrer Simulation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Démarrer Simulation de Rôle</DialogTitle>
                  <DialogDescription>
                    Sélectionnez le rôle que vous souhaitez simuler et
                    fournissez une raison pour l'audit.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Rôle à Simuler</Label>
                    <Select value={simulatedRole} onValueChange={setSimulatedRole}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="CHEF_AGENCE">
                          Chef d'Agence
                        </SelectItem>
                        <SelectItem value="CAISSIER">Caissier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Raison de la Simulation</Label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Ex: Test de la fonctionnalité de transfert de crédit"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpen(false)}
                    >
                      Annuler
                    </Button>
                    <Button type="submit">Démarrer</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <History className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Historique des Simulations</DialogTitle>
                  <DialogDescription>
                    Historique de vos sessions de simulation
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {history === undefined ? (
                    <div className="py-8 text-center text-muted-foreground">
                      Chargement...
                    </div>
                  ) : history.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      Aucune simulation trouvée
                    </div>
                  ) : (
                    history.map((session) => (
                      <Card key={session._id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                  {session.simulatedRole}
                                </span>
                                {session.targetUser && (
                                  <span className="text-sm text-muted-foreground">
                                    • {session.targetUser.name}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {session.reason}
                              </p>
                              <div className="text-xs text-muted-foreground">
                                {format(
                                  new Date(session.startedAt),
                                  "PPpp",
                                  { locale: fr }
                                )}
                                {session.endedAt && (
                                  <span>
                                    {" "}
                                    • Durée:{" "}
                                    {Math.round(session.duration / 1000 / 60)}{" "}
                                    min
                                  </span>
                                )}
                              </div>
                            </div>
                            <span
                              className={`rounded-full px-2 py-1 text-xs ${session.endedAt ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-600"}`}
                            >
                              {session.endedAt ? "Terminée" : "Active"}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
