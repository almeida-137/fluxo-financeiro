import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        toast({
          title: "Erro no cadastro",
          description: error.message,
          variant: "destructive",
          duration: 2000,
        });
      } else {
        toast({
          title: "Cadastro realizado!",
          description: "Verifique seu email para confirmar a conta.",
          duration: 2000,
        });
      }

      return { error };
    } catch (error: any) {
      toast({
        title: "Erro no cadastro",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
        duration: 2000,
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Tentando fazer login com:', { email });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      console.log('Resultado do login:', { data, error });

      if (error) {
        console.error('Erro detalhado do login:', error);
        
        let errorMessage = error.message;
        
        // Melhorar mensagens de erro para o usuário
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = "Email ou senha incorretos. Verifique suas credenciais ou use 'Esqueci minha senha'.";
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "Email não confirmado. Verifique sua caixa de entrada.";
        }
        
        toast({
          title: "Erro no login",
          description: errorMessage,
          variant: "destructive",
          duration: 2000,
        });
      } else {
        console.log('Login realizado com sucesso:', data.user?.email);
        toast({
          title: "Login realizado!",
          description: "Bem-vindo de volta.",
          duration: 2000,
        });
      }

      return { error };
    } catch (error: any) {
      console.error('Erro inesperado no login:', error);
      toast({
        title: "Erro no login",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
        duration: 2000,
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Erro no logout",
          description: error.message,
          variant: "destructive",
          duration: 2000,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro no logout",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/auth/update-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast({
          title: "Erro na recuperação",
          description: error.message,
          variant: "destructive",
          duration: 2000,
        });
      } else {
        toast({
          title: "Email enviado!",
          description: "Verifique seu email para redefinir a senha.",
          duration: 2000,
        });
      }

      return { error };
    } catch (error: any) {
      toast({
        title: "Erro na recuperação",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
        duration: 2000,
      });
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}