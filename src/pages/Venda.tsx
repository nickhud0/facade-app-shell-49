import React, { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMockData } from '@/contexts/MockDataContext';
import { toast } from 'sonner';

export default function Venda() {
  const { materiais, addTransacao, isOnline } = useMockData();
  const [formData, setFormData] = useState({
    materialId: '',
    peso: '',
    valorUnitario: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.materialId || !formData.peso || !formData.valorUnitario) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    
    try {
      const peso = parseFloat(formData.peso);
      const valorUnitario = parseFloat(formData.valorUnitario);
      const valorTotal = peso * valorUnitario;

      addTransacao({
        tipo: 'venda',
        material_id: parseInt(formData.materialId),
        peso,
        valor: valorTotal,
      });

      // Reset form
      setFormData({
        materialId: '',
        peso: '',
        valorUnitario: '',
      });
    } catch (error) {
      toast.error('Erro ao registrar venda');
    } finally {
      setLoading(false);
    }
  };

  const selectedMaterial = materiais.find(m => m.id.toString() === formData.materialId);
  const valorTotal = formData.peso && formData.valorUnitario 
    ? (parseFloat(formData.peso) * parseFloat(formData.valorUnitario)).toFixed(2)
    : '0.00';

  return (
    <PageWrapper isOnline={isOnline}>
      <Navigation title="Registrar Venda" />
      
      <div className="p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Venda de Material
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="material">Material</Label>
                <Select
                  value={formData.materialId}
                  onValueChange={(value) => {
                    const material = materiais.find(m => m.id.toString() === value);
                    setFormData(prev => ({
                      ...prev,
                      materialId: value,
                      valorUnitario: material?.preco_venda.toString() || '',
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um material" />
                  </SelectTrigger>
                  <SelectContent>
                    {materiais.map((material) => (
                      <SelectItem key={material.id} value={material.id.toString()}>
                        {material.nome} - R$ {material.preco_venda.toFixed(2)}/kg
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="peso">Peso (kg)</Label>
                  <Input
                    id="peso"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.peso}
                    onChange={(e) => setFormData(prev => ({ ...prev, peso: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valorUnitario">Valor/kg (R$)</Label>
                  <Input
                    id="valorUnitario"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.valorUnitario}
                    onChange={(e) => setFormData(prev => ({ ...prev, valorUnitario: e.target.value }))}
                  />
                </div>
              </div>

              {selectedMaterial && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Material:</span>
                    <span>{selectedMaterial.nome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Categoria:</span>
                    <span>{selectedMaterial.categoria}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Peso:</span>
                    <span>{formData.peso || '0'} kg</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-blue-600">R$ {valorTotal}</span>
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !formData.materialId || !formData.peso || !formData.valorUnitario}
              >
                {loading ? 'Registrando...' : 'Registrar Venda'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}