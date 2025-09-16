import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bluetooth, CheckCircle, XCircle, AlertCircle, Printer, Scan } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { thermalPrinterService } from '@/services/thermalPrinterService';
import { logger } from '@/utils/logger';

// Import ThermalPrinter plugin
declare const ThermalPrinter: any;

interface BluetoothDevice {
  name: string;
  address?: string;
}

interface PrinterManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrinterConnected?: (device: BluetoothDevice) => void;
}

export default function PrinterManager({ open, onOpenChange, onPrinterConnected }: PrinterManagerProps) {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (open) {
      checkConnection();
      loadSavedDevice();
    }
  }, [open]);

  const checkConnection = async () => {
    try {
      const connected = await thermalPrinterService.isConnected();
      setIsConnected(connected);
    } catch (error) {
      setIsConnected(false);
    }
  };

  const loadSavedDevice = () => {
    const savedDevice = localStorage.getItem('thermal_printer_device');
    if (savedDevice) {
      try {
        const device = JSON.parse(savedDevice);
        setConnectedDevice(device);
      } catch (error) {
        localStorage.removeItem('thermal_printer_device');
      }
    }
  };

  const scanForDevices = async () => {
    setScanning(true);
    setDevices([]);
    
    try {
      const foundDevices = await ThermalPrinter.listPrinters();
      setDevices(foundDevices || []);
      
      if (!foundDevices || foundDevices.length === 0) {
        toast({
          title: "Nenhuma impressora encontrada",
          description: "Certifique-se de que a impressora está ligada e em modo de pareamento.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Impressoras encontradas",
          description: `${foundDevices.length} impressora(s) disponível(is).`,
        });
      }
    } catch (error) {
      logger.debug('Erro ao buscar impressoras:', error);
      toast({
        title: "Erro ao buscar impressoras",
        description: "Verifique se o Bluetooth está ativado e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    setConnecting(true);
    
    try {
      await ThermalPrinter.connect({ name: device.name });
      
      setConnectedDevice(device);
      setIsConnected(true);
      
      // Save device to localStorage
      localStorage.setItem('thermal_printer_device', JSON.stringify(device));
      
      toast({
        title: "Conectado com sucesso",
        description: `Conectado à impressora ${device.name}.`,
      });
      
      onPrinterConnected?.(device);
    } catch (error) {
      logger.debug('Erro ao conectar:', error);
      toast({
        title: "Erro ao conectar",
        description: "Não foi possível conectar à impressora. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      await ThermalPrinter.disconnect();
      setIsConnected(false);
      setConnectedDevice(null);
      
      toast({
        title: "Desconectado",
        description: "Impressora desconectada com sucesso.",
      });
    } catch (error) {
      logger.debug('Erro ao desconectar:', error);
      toast({
        title: "Erro ao desconectar",
        description: "Erro ao desconectar da impressora.",
        variant: "destructive",
      });
    }
  };

  const reconnect = async () => {
    if (connectedDevice) {
      await connectToDevice(connectedDevice);
    }
  };

  const printTest = async () => {
    try {
      await thermalPrinterService.printTest();
      
      toast({
        title: "Teste impresso",
        description: "Teste de impressão enviado com sucesso.",
      });
    } catch (error) {
      logger.debug('Erro no teste:', error);
      toast({
        title: "Erro no teste",
        description: "Não foi possível imprimir o teste.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bluetooth className="h-5 w-5" />
            Gerenciar Impressora Térmica
          </DialogTitle>
          <DialogDescription>
            Conecte sua impressora térmica via Bluetooth para imprimir comandas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status da Conexão */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Status da Conexão</h4>
              {isConnected ? (
                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Conectada
                </Badge>
              ) : (
                <Badge variant="outline" className="border-red-200 text-red-600 dark:border-red-800 dark:text-red-400">
                  <XCircle className="w-3 h-3 mr-1" />
                  Desconectada
                </Badge>
              )}
            </div>

            {connectedDevice && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{connectedDevice.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {connectedDevice.address || 'Endereço não disponível'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {isConnected && (
                        <Button variant="outline" size="sm" onClick={printTest}>
                          <Printer className="w-3 h-3 mr-1" />
                          Teste
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={isConnected ? disconnect : reconnect}
                      >
                        {isConnected ? 'Desconectar' : 'Reconectar'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Impressoras Disponíveis */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Impressoras Disponíveis</h4>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={scanForDevices}
                disabled={scanning}
              >
                <Scan className="w-3 h-3 mr-1" />
                {scanning ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {devices.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <Bluetooth className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground text-center">
                      Nenhuma impressora encontrada
                    </p>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      Certifique-se de que a impressora está ligada e em modo de pareamento
                    </p>
                  </CardContent>
                </Card>
              ) : (
                devices.map((device, index) => (
                  <Card 
                    key={`${device.name}-${index}`}
                    className="hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => connectToDevice(device)}
                  >
                    <CardContent className="flex items-center justify-between py-3">
                      <div>
                        <span className="font-medium">{device.name}</span>
                        <span className="text-sm text-muted-foreground">{device.address || 'Endereço não disponível'}</span>
                      </div>
                      {connecting ? (
                        <Badge variant="outline">
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                          Conectando...
                        </Badge>
                      ) : connectedDevice?.name === device.name && isConnected ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Conectada
                        </Badge>
                      ) : (
                        <Button variant="ghost" size="sm">
                          Conectar
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Dicas */}
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="py-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Dicas para conexão:</p>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                    <li>• Mantenha a impressora ligada e próxima</li>
                    <li>• Ative o Bluetooth do dispositivo</li>
                    <li>• Coloque a impressora em modo de pareamento</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}