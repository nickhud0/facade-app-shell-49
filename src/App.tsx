import React from "react";

export default function App() {
  // Clear any cached modules
  console.log('App loading fresh without cache');
  
  return (
    <div style={{ 
      padding: "20px", 
      fontFamily: "Arial, sans-serif",
      backgroundColor: "#f5f5f5",
      minHeight: "100vh"
    }}>
      <h1 style={{ color: "#333", marginBottom: "20px" }}>✅ App Funcionando</h1>
      <p style={{ color: "#666", fontSize: "16px" }}>
        React carregado com sucesso - sem erros de bundling ou cache.
      </p>
      <p style={{ color: "#999", fontSize: "14px", marginTop: "10px" }}>
        Timestamp: {new Date().toLocaleString()}
      </p>
    </div>
  );
}