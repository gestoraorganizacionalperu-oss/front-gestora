// Exportar todos los mocks desde un solo lugar
export * from './authMock';

// Función helper para simular delay de red
export const simulateNetworkDelay = (ms: number = 1000): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Función helper para simular errores aleatorios (útil para testing)
export const simulateRandomError = (probability: number = 0.1): boolean => {
  return Math.random() < probability;
};

// Función helper para generar IDs únicos
export const generateMockId = (): string => {
  return `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
