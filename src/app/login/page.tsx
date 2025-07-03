"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { SawmillLogo } from "@/components/icons/sawmill-logo";
import { firebaseConfig } from "@/lib/firebase/config";

const loginFormSchema = z.object({
  email: z.string().email({ message: "Por favor, ingrese un email válido." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      // The AuthProvider will handle redirection on successful login
      toast({
        title: "Inicio de Sesión Exitoso",
        description: "Bienvenido de vuelta.",
      });
    } catch (error: any) {
      let errorMessage = "Ocurrió un error inesperado. Por favor, intente de nuevo.";
      let errorTitle = "Error de Inicio de Sesión";

      // Firebase errors have a `code` property that gives more details.
      if (error.code) {
        switch (error.code) {
          case 'auth/invalid-credential':
          case 'auth/user-not-found':
          case 'auth/wrong-password':
             errorMessage = "El correo electrónico o la contraseña son incorrectos. Por favor, verifíquelos e intente de nuevo.";
             break;
          case 'auth/operation-not-allowed':
            errorTitle = "Error de Configuración de Firebase";
            errorMessage = "El inicio de sesión por correo y contraseña no está habilitado. Por favor, actívelo en la consola de Firebase > Authentication > Sign-in method.";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Se ha bloqueado el acceso desde este dispositivo debido a actividad inusual. Intente de nuevo más tarde.";
            break;
          case 'auth/network-request-failed':
            errorMessage = "Error de red. Por favor, revise su conexión a internet.";
            break;
          default:
            errorMessage = `Ocurrió un error: ${error.message} (código: ${error.code})`;
        }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 9000, // Give more time to read detailed error messages
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
            <SawmillLogo className="h-16 w-16 text-primary" />
            <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
            <CardDescription>Ingrese sus credenciales para acceder al sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="usuario@ejemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                {isLoading ? "Ingresando..." : "Ingresar"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground text-center w-full">
                Conectando al proyecto: {firebaseConfig.projectId}
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
