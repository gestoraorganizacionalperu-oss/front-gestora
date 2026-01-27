import React, { createContext, useContext, useState, useEffect } from 'react';

interface CompanyContextType {
  companyLogo: string | null;
  setCompanyLogo: (logo: string | null) => void;
  getCompanyLogo: () => string | null;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companyLogo, setCompanyLogoState] = useState<string | null>(null);

  // Cargar logo desde localStorage al iniciar
  useEffect(() => {
    const storedLogo = localStorage.getItem('companyLogo');
    if (storedLogo) {
      setCompanyLogoState(storedLogo);
    }
  }, []);

  // Función para actualizar el logo
  const setCompanyLogo = (logo: string | null) => {
    setCompanyLogoState(logo);
    if (logo) {
      localStorage.setItem('companyLogo', logo);
    } else {
      localStorage.removeItem('companyLogo');
    }
  };

  // Función para obtener el logo
  const getCompanyLogo = () => {
    return companyLogo;
  };

  return (
    <CompanyContext.Provider
      value={{
        companyLogo,
        setCompanyLogo,
        getCompanyLogo,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany debe ser usado dentro de CompanyProvider');
  }
  return context;
};
