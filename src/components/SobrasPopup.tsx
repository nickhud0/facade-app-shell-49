import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, RefreshCw } from "lucide-react";
import { useSobras } from "@/hooks/useSobras";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";

interface SobrasPopupProps {
  periodo: 'diario' | 'mensal' | 'anual' | 'personalizado';
  dataInicio?: Date;
  dataFim?: Date;
}

export const SobrasPopup = ({ periodo, dataInicio, dataFim }: SobrasPopupProps) => {
  const [open, setOpen] = useState(false);
  const { sobras, loading, isOnline, buscarSobras } = useSobras();

  useEffect(() => {
    if (open) {
      buscarSobras(periodo, dataInicio, dataFim);
    }
  }, [open, periodo, dataInicio, dataFim]);

  const handleRefresh = () => {
    buscarSobras(periodo, dataInicio, dataFim);
  };

  const getPeriodoTexto = () => {
    switch (periodo) {
      case 'diario':
        return 'Diário';
      case 'mensal':
        return 'Mensal';
      case 'anual':
        return 'Anual';
      case 'personalizado':
        if (dataInicio && dataFim) {
          return `${format(dataInicio, "dd/MM/yyyy")} até ${format(dataFim, "dd/MM/yyyy")}`;
        }
        return 'Personalizado';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Package className="h-4 w-4 mr-2" />
          Sobras
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Sobras - {getPeriodoTexto()}
            </DialogTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </DialogHeader>

        {!isOnline && (
          <Card className="p-3 bg-warning/10 border-warning/20 mb-4">
            <div className="flex items-center gap-2 text-sm text-warning-foreground">
              <Package className="h-4 w-4" />
              <span>📡 Offline — exibindo dados salvos</span>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Carregando sobras...</p>
          </div>
        ) : (
          <>
            {sobras.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-center">Quantidade Excedente (kg)</TableHead>
                    <TableHead>Comanda</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sobras.map((sobra, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{sobra.material}</TableCell>
                      <TableCell>{format(new Date(sobra.data), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="text-center font-semibold text-warning">
                        {sobra.quantidade_excedente.toFixed(1)} kg
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {sobra.comanda || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Card className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {isOnline 
                    ? "Nenhuma sobra encontrada para o período selecionado." 
                    : "Sem dados de sobras disponíveis offline."
                  }
                </p>
              </Card>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};