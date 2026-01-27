import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useMessage } from '@/contexts/MessageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, Loader2 } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showMessage } = useMessage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      showMessage('warning', 'Por favor, complete todos los campos');
      return;
    }

    setIsLoading(true);

    try {
      const firstMenuRoute = await login({ email, password });
      showMessage('success', 'Inicio de sesión exitoso');
      
      // Redirigir al primer menú disponible o al dashboard por defecto
      if (firstMenuRoute) {
        navigate(firstMenuRoute);
      } else {
        navigate('/');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Credenciales inválidas';
      showMessage('error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: 'url(/assets/background-login.png)'
      }}
    >
      {/* Overlay oscuro para mejorar la legibilidad */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      
      {/* Card de login */}
      <Card className="w-full max-w-md shadow-2xl relative z-10 bg-white">
        <CardHeader className="space-y-4 text-center pt-8">
          {/* Logo del sistema */}
          <div className="flex justify-center mb-2">
            <img 
              src="/assets/logo-sistema.png"
              alt="Logo ToolGestora"
              className="h-24 w-auto object-contain"
            />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">ToolGestora</CardTitle>
          <CardDescription>Sistema de Gestión Organizacional</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
