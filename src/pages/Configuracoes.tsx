import { ArrowLeft, Settings, Database, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { appService } from "@/services/appService";
import { useToast } from "@/hooks/use-toast";

const Configuracoes = () => {
  const navigate = useNavigate();
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCredentials();
    updateConnectionStatus();
    
    const interval = setInterval(updateConnectionStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadCredentials = async () => {
    try {
      const credentials = await appService.getSupabaseCredentials();
      setSupabaseUrl(credentials.url || "");
      setSupabaseKey(credentials.anonKey || "");
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  };

  const updateConnectionStatus = () => {
    const status = appService.getConnectionStatus();
    setSupabaseConnected(status.supabaseConnected);
  };

  const handleSaveCredentials = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha URL e Chave Anônima",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const success = await appService.saveSupabaseCredentials(supabaseUrl, supabaseKey);
      
      if (success) {
        toast({
          title: "Configurações salvas",
          description: "Conexão com Supabase estabelecida com sucesso!",
        });
        updateConnectionStatus();
      } else {
        toast({
          title: "Erro na conexão",
          description: "Verifique as credenciais e tente novamente",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="mr-3" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
      </div>

      {/* Informações do App */}
      <Card className="mb-6 p-4 bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Sistema Comercial</h2>
            <p className="text-sm text-muted-foreground">Versão 1.0 - Front-End</p>
          </div>
          <Settings className="h-8 w-8 text-primary" />
        </div>
      </Card>

      {/* Credenciais Supabase */}
      <Card className="mb-6 p-4">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
          <Database className="mr-2 h-5 w-5" />
          Configurações do Banco de Dados
        </h2>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="supabase-url">URL do Supabase</Label>
            <Input 
              id="supabase-url"
              placeholder="https://seu-projeto.supabase.co"
              className="mt-1"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              URL do seu projeto Supabase
            </p>
          </div>

          <div>
            <Label htmlFor="supabase-anon-key">Chave Anônima (Anon Key)</Label>
            <Input 
              id="supabase-anon-key"
              type="password"
              placeholder="sua.chave.anonima.aqui"
              className="mt-1"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Chave pública do Supabase para acesso anônimo
            </p>
          </div>
        </div>

        <Button 
          className="w-full mt-4 bg-gradient-to-r from-success to-success/80 border-0"
          onClick={handleSaveCredentials}
          disabled={loading}
        >
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </Card>

      {/* Status da Conexão */}
      <Card className="mt-6 p-4">
        <h3 className="font-semibold text-foreground mb-3">Status da Conexão</h3>
        
        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="text-sm">Supabase:</span>
          </div>
          <span className={`text-sm font-medium ${
            supabaseConnected ? 'text-success' : 'text-warning'
          }`}>
            {supabaseConnected ? 'Conectado' : 'Não Conectado'}
          </span>
        </div>
        
        {!supabaseConnected && (
          <p className="text-xs text-muted-foreground mt-2">
            O app funciona offline no dispositivo. Configure as credenciais acima para sincronizar com a nuvem.
          </p>
        )}
      </Card>
    </div>
  );
};

export default Configuracoes;