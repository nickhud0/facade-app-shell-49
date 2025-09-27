import React from "react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Reciclagem Pereque
        </h1>
        <p className="text-muted-foreground">
          Gestão completa do seu depósito
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="h-24 bg-card rounded-lg p-4 flex flex-col items-center justify-center">
          <span className="text-sm font-medium text-center text-card-foreground">
            COMPRA
          </span>
        </div>
        <div className="h-24 bg-card rounded-lg p-4 flex flex-col items-center justify-center">
          <span className="text-sm font-medium text-center text-card-foreground">
            VENDA
          </span>
        </div>
      </div>
    </div>
  );
};

export default Index;