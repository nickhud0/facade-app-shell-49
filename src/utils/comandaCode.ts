export function formatarCodigoComanda(c: any): string {
  if (c?.prefixo_dispositivo && (c?.numero_local ?? null) !== null) {
    return `${c.prefixo_dispositivo}-${c.numero_local}`;
  }
  // Fallbacks (legados):
  if (c?.numero) return c.numero; // já pode vir preenchido em alguns lugares
  if (c?.id) return `COM-${String(c.id).padStart(3, '0')}`;
  return 'COMANDA';
}

export function parseCodigo(codigo: string): { prefixo: string; numero: number } | null {
  const m = codigo.match(/^([A-Za-z0-9]+)-(\d+)$/);
  if (!m) return null;
  return { prefixo: m[1], numero: Number(m[2]) };
}