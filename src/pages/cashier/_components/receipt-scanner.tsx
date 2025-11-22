import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { toast } from "sonner";
import { ScanLineIcon, ImageIcon } from "lucide-react";
import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

interface ReceiptData {
  transactionType: string;
  customerName: string;
  customerPhone: string;
  customerIdNumber?: string;
  amount: number;
  currency: string;
  recipientName?: string;
  recipientPhone?: string;
  description?: string;
}

interface ReceiptScannerProps {
  onDataExtracted: (data: ReceiptData, storageId: Id<"_storage">) => void;
}

export function ReceiptScanner({ onDataExtracted }: ReceiptScannerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const generateUploadUrl = useAction(api.ocr.generateUploadUrl);
  const extractReceiptData = useAction(api.ocr.extractReceiptData);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith("image/")) {
        toast.error("Veuillez sélectionner une image");
        return;
      }

      setFile(selectedFile);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleScan = async () => {
    if (!file) {
      toast.error("Veuillez sélectionner un reçu");
      return;
    }

    setIsProcessing(true);
    try {
      // Upload file
      const uploadUrl = await generateUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await uploadResult.json();

      // Extract receipt data
      const extractedData = await extractReceiptData({ storageId });

      // Pass data to parent component
      onDataExtracted(extractedData, storageId);

      toast.success("Reçu scanné avec succès!");
      setFile(null);
      setPreview("");
    } catch (error) {
      toast.error("Échec de l'analyse du reçu");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="p-4 space-y-4 bg-muted/50">
      <div className="flex items-center gap-2">
        <ScanLineIcon className="h-5 w-5 text-primary" />
        <h4 className="font-semibold">Scanner un Reçu (OCR)</h4>
      </div>
      <p className="text-sm text-muted-foreground">
        Prenez une photo du reçu pour remplir automatiquement le formulaire
      </p>

      <div className="space-y-3">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="receipt-upload"
        />
        <label htmlFor="receipt-upload">
          <Button variant="outline" asChild className="w-full" type="button">
            <span>
              <ImageIcon className="mr-2 h-4 w-4" />
              Sélectionner une Image
            </span>
          </Button>
        </label>

        {preview && (
          <div className="relative h-32 w-full overflow-hidden rounded-lg bg-background border">
            <img
              src={preview}
              alt="Receipt preview"
              className="h-full w-full object-contain"
            />
          </div>
        )}

        {file && (
          <Button
            onClick={handleScan}
            disabled={isProcessing}
            className="w-full"
            type="button"
          >
            {isProcessing ? (
              <>
                <Spinner className="mr-2" />
                Analyse en cours...
              </>
            ) : (
              <>
                <ScanLineIcon className="mr-2 h-4 w-4" />
                Scanner le Reçu
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}
