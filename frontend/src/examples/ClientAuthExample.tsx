/**
 * EXEMPLO DE IMPLEMENTAÇÃO DO FRONTEND PARA AUTENTICAÇÃO DE CLIENTES
 * 
 * Este é um exemplo de como implementar login, registro e reset de senha
 * no website público (www.reisfundacoes.com)
 */

import { useState, useEffect } from 'react';

// Tipos
interface Client {
  id: string;
  name: string;
  email: string;
}

interface AuthResponse {
  data: {
    client: Client;
    token: string;
  };
}

// Constantes
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const CLIENT_TOKEN_KEY = 'clientToken';
const CLIENT_DATA_KEY = 'clientData';

// Função para fazer requisições à API
async function apiRequest(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem(CLIENT_TOKEN_KEY);
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(error.error || 'Erro na requisição');
  }
  
  return response.json();
}

// Hook para gerenciar autenticação do cliente
export function useClientAuth() {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verificar autenticação ao carregar
  useEffect(() => {
    const token = localStorage.getItem(CLIENT_TOKEN_KEY);
    const clientData = localStorage.getItem(CLIENT_DATA_KEY);
    
    if (token && clientData) {
      try {
        const parsedClient = JSON.parse(clientData);
        setClient(parsedClient);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Erro ao parsear dados do cliente:', error);
        localStorage.removeItem(CLIENT_TOKEN_KEY);
        localStorage.removeItem(CLIENT_DATA_KEY);
      }
    }
    
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const response = await apiRequest('/client-auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }) as AuthResponse;

    const { client: clientData, token } = response.data;
    
    localStorage.setItem(CLIENT_TOKEN_KEY, token);
    localStorage.setItem(CLIENT_DATA_KEY, JSON.stringify(clientData));
    
    setClient(clientData);
    setIsAuthenticated(true);
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    phone?: string
  ): Promise<void> => {
    const response = await apiRequest('/client-auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone }),
    }) as AuthResponse;

    const { client: clientData, token } = response.data;
    
    localStorage.setItem(CLIENT_TOKEN_KEY, token);
    localStorage.setItem(CLIENT_DATA_KEY, JSON.stringify(clientData));
    
    setClient(clientData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem(CLIENT_TOKEN_KEY);
    localStorage.removeItem(CLIENT_DATA_KEY);
    setClient(null);
    setIsAuthenticated(false);
  };

  return {
    client,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
  };
}

// Componente de Login
export function ClientLoginForm() {
  const { login } = useClientAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // Redirecionar após login bem-sucedido
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
      <a href="/forgot-password">Esqueci minha senha</a>
    </form>
  );
}

// Componente de Reset de Senha
export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await apiRequest('/client-auth/password-reset/confirm', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      }) as AuthResponse;

      // Salvar token e dados do cliente
      const { client: clientData, token: authToken } = response.data;
      localStorage.setItem(CLIENT_TOKEN_KEY, authToken);
      localStorage.setItem(CLIENT_DATA_KEY, JSON.stringify(clientData));

      setSuccess(true);
      
      // Redirecionar após 2 segundos
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="success">
        <h2>Senha redefinida com sucesso!</h2>
        <p>Redirecionando...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <input
        type="password"
        placeholder="Nova senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
      />
      <input
        type="password"
        placeholder="Confirmar senha"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        minLength={6}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Redefinindo...' : 'Redefinir Senha'}
      </button>
    </form>
  );
}

// Página de Reset de Senha (exemplo)
export function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Pegar token da URL
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    
    if (!urlToken) {
      setError('Token não encontrado');
      return;
    }
    
    setToken(urlToken);
  }, []);

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!token) {
    return <div>Carregando...</div>;
  }

  return <ResetPasswordForm token={token} />;
}

// Exemplo de uso em uma página Next.js
/*
// app/reset-password/page.tsx
'use client';

import { ResetPasswordPage } from '@/examples/ClientAuthExample';

export default function ResetPassword() {
  return <ResetPasswordPage />;
}
*/

