import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { MessageProvider } from '@/contexts/MessageContext';
import { CompanyProvider } from '@/contexts/CompanyContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import MainLayout from '@/components/layout/MainLayout';
import Login from '@/pages/Login';
import routes from './routes';

const App: React.FC = () => {
  return (
    <MessageProvider>
      <AuthProvider>
        <CompanyProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Routes>
                        {routes.map((route, index) => (
                          <Route key={index} path={route.path} element={route.element} />
                        ))}
                        {/* Redirigir a la primera ruta disponible (Empresa) */}
                        <Route path="/" element={<Navigate to="/empresa" replace />} />
                        <Route path="*" element={<Navigate to="/empresa" replace />} />
                      </Routes>
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
        </CompanyProvider>
      </AuthProvider>
    </MessageProvider>
  );
};

export default App;
