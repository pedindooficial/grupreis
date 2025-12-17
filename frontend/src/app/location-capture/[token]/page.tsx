"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function LocationCapturePage() {
  const params = useParams();
  const token = params?.token as string;
  const [status, setStatus] = useState<"loading" | "requesting" | "capturing" | "success" | "error">("loading");
  const [error, setError] = useState<string>("");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Token inválido");
      setStatus("error");
      return;
    }

    if (!navigator.geolocation) {
      setError("Seu navegador não suporta geolocalização.");
      setStatus("error");
      return;
    }

    // Solicitar geolocalização do usuário
    setStatus("requesting");

    // Configurações para geolocalização
    // Primeiro tenta sem forçar GPS (mais rápido, funciona melhor no celular)
    const geoOptions = {
      enableHighAccuracy: false, // Não força GPS primeiro (mais rápido no celular)
      timeout: 20000, // 20 segundos
      maximumAge: 300000 // Aceita localização com até 5 minutos (útil se já tem cache)
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lon: longitude });
        setStatus("capturing");

        try {
          // Detectar URL da API baseada no host atual (funciona com IP também)
          const getApiUrl = () => {
            if (typeof window !== 'undefined') {
              // Se estiver rodando no navegador, usar o mesmo host/porta
              const protocol = window.location.protocol;
              const hostname = window.location.hostname;
              // Se for localhost, usar localhost:4000, senão usar hostname:4000
              if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
              }
              // Se for IP (192.168.x.x, etc), usar o mesmo IP com porta 4000
              return `${protocol}//${hostname}:4000/api`;
            }
            return process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
          };

          // Enviar coordenadas para o backend
          const res = await fetch(`${getApiUrl()}/location-capture/capture/${token}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              latitude,
              longitude
            })
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data?.error || "Erro ao enviar localização");
          }

          setStatus("success");
        } catch (err: any) {
          console.error("Erro ao capturar localização:", err);
          setError(err?.message || "Erro ao enviar localização. Tente novamente.");
          setStatus("error");
        }
      },
      (error) => {
        console.error("Erro na geolocalização:", error);
        
        // Verificar se está usando HTTP (não HTTPS)
        const isHttp = typeof window !== 'undefined' && window.location.protocol === 'http:';
        const isIpAddress = typeof window !== 'undefined' && /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);
        
        let errorMessage = "Erro ao obter localização.";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            if (isHttp && isIpAddress) {
              errorMessage = "⚠️ O navegador bloqueia geolocalização em HTTP quando acessado por IP. Soluções: 1) Use no computador (localhost:3000), 2) Configure HTTPS, ou 3) Use um túnel HTTPS como ngrok.";
            } else {
              errorMessage = "Permissão negada. No Chrome: Menu (3 pontos) > Configurações > Permissões do site > Localização > Permita.";
            }
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Informações de localização não disponíveis. Verifique se o GPS está ativado no seu dispositivo.";
            break;
          case error.TIMEOUT:
            errorMessage = "Tempo de espera para obter localização expirou. Verifique se o GPS está ativado e tente novamente.";
            break;
        }
        
        setError(errorMessage);
        setStatus("error");
      },
      geoOptions
    );
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 shadow-2xl">
        <div className="text-center">
          {status === "loading" && (
            <>
              <div className="mb-4">
                <div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Carregando...</h1>
            </>
          )}

          {status === "requesting" && (
            <>
              <div className="mb-4">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Solicitando localização</h1>
              <p className="text-slate-300">Por favor, permita o acesso à sua localização no navegador.</p>
            </>
          )}

          {status === "capturing" && (
            <>
              <div className="mb-4">
                <div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Enviando localização...</h1>
              <p className="text-slate-300">Aguarde enquanto enviamos sua localização.</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mb-4">
                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Localização capturada!</h1>
              <p className="text-slate-300 mb-4">Sua localização foi enviada com sucesso.</p>
              {coords && (
                <div className="bg-white/5 rounded-lg p-4 text-left">
                  <p className="text-sm text-slate-400 mb-1">Latitude:</p>
                  <p className="text-white font-mono">{coords.lat.toFixed(6)}</p>
                  <p className="text-sm text-slate-400 mb-1 mt-2">Longitude:</p>
                  <p className="text-white font-mono">{coords.lon.toFixed(6)}</p>
                </div>
              )}
              <p className="text-sm text-slate-400 mt-4">Você pode fechar esta página.</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mb-4">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Erro</h1>
              <p className="text-red-300 mb-4">{error}</p>
              <button
                onClick={() => {
                  // Limpar estado e tentar novamente
                  setStatus("loading");
                  setError("");
                  setCoords(null);
                  // Aguardar um pouco antes de tentar novamente
                  setTimeout(() => {
                    window.location.reload();
                  }, 500);
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition font-semibold"
              >
                Tentar novamente
              </button>
              {error.includes("Permissão") && (
                <p className="text-xs text-slate-400 mt-3">
                  💡 Dica: No celular, o navegador pode não pedir permissão automaticamente. Acesse as configurações do navegador para permitir manualmente.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

