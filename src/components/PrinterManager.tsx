import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bluetooth, Printer, Wifi, WifiOff, CheckCircle, AlertCircle } from 'lucide-react';
import { thermalPrinterService } from '@/services/thermalPrinterService';
import { toast } from 'sonner';

interface BluetoothDevice {
  name: string;
  address: string;
  class?: number;
}

interface PrinterManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrinterConnected?: () => void;
}

const PrinterManager = ({ open, onOpenChange, onPrinterConnected }: PrinterManagerProps) => {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
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
      
      if (connected) {
        const savedDevice = localStorage.getItem('thermal_printer_device');
        if (savedDevice) {
          setConnectedDevice(JSON.parse(savedDevice));
        }
      }
    } catch (error) {
      setIsConnected(false);
    }
  };

  const loadSavedDevice = () => {
    const saved = localStorage.getItem('thermal_printer_device');
    if (saved) {
      try {
        setConnectedDevice(JSON.parse(saved));
      } catch (error) {
        localStorage.removeItem('thermal_printer_device');
      }
    }
  };

  const scanForDevices = async () => {
    setScanning(true);
    try {
      toast.loading('Procurando impressoras...', { id: 'scan' });
      
      const foundDevices = await thermalPrinterService.listPrinters();
      setDevices(foundDevices);
      
      if (foundDevices.length === 0) {
        toast.info('Nenhuma impressora encontrada', { id: 'scan' });
      } else {
        toast.success(`${foundDevices.length} impressora(s) encontrada(s)`, { id: 'scan' });
      }
    } catch (error) {
      console.error('Erro ao buscar impressoras:', error);
      toast.error('Erro ao buscar impressoras', { id: 'scan' });
    } finally {
      setScanning(false);
    }
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    setConnecting(device.address);
    try {
      toast.loading(`Conectando à ${device.name}...`, { id: 'connect' });
      
      const success = await thermalPrinterService.connectPrinter(device.address);
      
      if (success) {
        setConnectedDevice(device);
        setIsConnected(true);
        localStorage.setItem('thermal_printer_device', JSON.stringify(device));
        toast.success(`Conectado à ${device.name}`, { id: 'connect' });
        onPrinterConnected?.();
      } else {
        toast.error('Falha na conexão', { id: 'connect' });
      }
    } catch (error) {
      console.error('Erro ao conectar:', error);
      toast.error('Erro ao conectar com a impressora', { id: 'connect' });
    } finally {
      setConnecting(null);
    }
  };

  const disconnect = async () => {
    try {
      await thermalPrinterService.disconnect();
      setConnectedDevice(null);
      setIsConnected(false);
      localStorage.removeItem('thermal_printer_device');
      toast.success('Impressora desconectada');
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      toast.error('Erro ao desconectar');
    }
  };

  const reconnect = async () => {
    if (connectedDevice) {
      await connectToDevice(connectedDevice);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bluetooth className="h-5 w-5" />
            Gerenciar Impressora
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status atual */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                <span className="font-medium">Status da Conexão</span>
              </div>
              {isConnected ? (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Conectada
                </Badge>
              ) : (
                <Badge variant="outline" className="border-red-200 text-red-600">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Desconectada
                </Badge>
              )}
            </div>

            {connectedDevice && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-sm text-muted-foreground">
                  Impressora: <span className="font-medium">{connectedDevice.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Endereço: <span className="font-mono text-xs">{connectedDevice.address}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  {isConnected ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={disconnect}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <WifiOff className="h-3 w-3 mr-1" />
                      Desconectar
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={reconnect}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Wifi className="h-3 w-3 mr-1" />
                      Reconectar
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>

          <Separator />

          {/* Buscar impressoras */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Impressoras Disponíveis</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={scanForDevices} 
                disabled={scanning}
              >
                <Bluetooth className="h-3 w-3 mr-1" />
                {scanning ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {devices.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Bluetooth className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma impressora encontrada</p>
                  <p className="text-xs">Certifique-se que a impressora está ligada e em modo de pareamento</p>
                </div>
              ) : (
                devices.map((device, index) => (
                  <Card 
                    key={`${device.address}-${index}`} 
                    className="p-3 hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => connectToDevice(device)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{device.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {device.address}
                        </div>
                      </div>
                      {connecting === device.address ? (
                        <Badge variant="outline" className="text-blue-600">
                          <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-1" />
                          Conectando...
                        </Badge>
                      ) : connectedDevice?.address === device.address && isConnected ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Conectada
                        </Badge>
                      ) : (
                        <Button variant="ghost" size="sm">
                          Conectar
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Instruções */}
          <Card className="p-3 bg-blue-50 border-blue-200">
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">💡 Dicas:</p>
              <ul className="text-xs space-y-1">
                <li>• Mantenha a impressora ligada e próxima ao dispositivo</li>
                <li>• Ative o Bluetooth nas configurações do Android</li>
                <li>• A impressora ficará salva para próximas impressões</li>
              </ul>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrinterManager;