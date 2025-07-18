
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/firebase/services/authService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogIn } from 'lucide-react';
import { SawmillLogo } from '@/components/icons/sawmill-logo';
import { FirebaseError } from 'firebase/app';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      toast({
        title: 'Inicio de Sesión Exitoso',
        description: 'Bienvenido de vuelta.',
      });
      router.push('/');
    } catch (error) {
      console.error(error);
      let errorMessage = 'Ha ocurrido un error inesperado. Por favor, intente de nuevo.';
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/invalid-credential':
            errorMessage = 'Las credenciales proporcionadas son incorrectas. Verifique el email y la contraseña.';
            break;
          case 'auth/user-not-found':
            errorMessage = 'No se encontró ningún usuario con este correo electrónico.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'La contraseña es incorrecta.';
            break;
          case 'auth/invalid-api-key':
            errorMessage = 'Error de Configuración: La clave API de Firebase no es válida. Por favor, verifíquela.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Error de Red: No se pudo conectar con los servicios de Firebase. Verifique su conexión a internet.';
            break;
          default:
            errorMessage = `Error de Firebase: ${error.message} (código: ${error.code})`;
        }
      }
      toast({
        title: 'Error de Autenticación',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <SawmillLogo className="mx-auto h-16 w-16 text-primary" />
          <CardTitle className="text-2xl font-bold tracking-tight">Iniciar Sesión</CardTitle>
          <CardDescription>Ingrese sus credenciales para acceder al sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
