"use client";

import { useEffect, useRef, useState } from "react";

interface Job {
  _id: string;
  title: string;
  site?: string;
  clientName?: string;
  status: string;
  team?: string;
}

interface JobsMapProps {
  jobs: Job[];
}

declare global {
  interface Window {
    google: any;
  }
}

export default function JobsMap({ jobs }: JobsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const API_KEY = "AIzaSyAUoyCSevBWa4CkeDcBuYd-R0mbR2NtpIs";

  const addDebug = (msg: string) => {
    console.log(`[JobsMap] ${msg}`);
    setDebugInfo((prev) => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  // Carregar script do Google Maps
  useEffect(() => {
    addDebug("Iniciando carregamento do Google Maps");
    
    // Aguardar o mapRef estar disponível
    const waitForMapRef = (callback: () => void) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 segundos
      
      const checkRef = setInterval(() => {
        attempts++;
        if (mapRef.current) {
          addDebug(`mapRef disponível após ${attempts * 100}ms`);
          clearInterval(checkRef);
          callback();
        } else if (attempts >= maxAttempts) {
          addDebug("TIMEOUT: mapRef não está disponível após 5 segundos");
          clearInterval(checkRef);
          setError("Elemento do mapa não foi encontrado. Recarregue a página.");
          setLoading(false);
        }
      }, 100);
    };

    const loadAndInitialize = () => {
      // Verificar se já está carregado
      if (window.google && window.google.maps && typeof window.google.maps.Map === "function") {
        addDebug("Google Maps já está disponível!");
        initializeMap();
        return;
      }

      // Verificar se script já existe
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
      if (existingScript) {
        addDebug("Script já existe no DOM, aguardando carregamento...");
        let attempts = 0;
        const maxAttempts = 100; // 10 segundos
        
        const checkInterval = setInterval(() => {
          attempts++;
          if (window.google && window.google.maps && typeof window.google.maps.Map === "function") {
            addDebug(`Google Maps carregado após ${attempts * 100}ms`);
            clearInterval(checkInterval);
            initializeMap();
          } else if (attempts >= maxAttempts) {
            addDebug("TIMEOUT: Google Maps não carregou após 10 segundos");
            clearInterval(checkInterval);
            setError("Timeout ao carregar Google Maps. Verifique sua conexão e recarregue a página.");
            setLoading(false);
          }
        }, 100);

        return () => clearInterval(checkInterval);
      }

      // Criar novo script
      addDebug("Criando novo script do Google Maps");
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        addDebug("Script carregado com sucesso (onload)");
        // Aguardar um pouco para garantir que tudo está pronto
        setTimeout(() => {
          if (window.google && window.google.maps && typeof window.google.maps.Map === "function") {
            addDebug("Google Maps confirmado disponível após onload");
            initializeMap();
          } else {
            addDebug("ERRO: Google Maps não disponível após onload");
            setError("Google Maps não está disponível após carregar o script.");
            setLoading(false);
          }
        }, 500);
      };

      script.onerror = () => {
        addDebug("ERRO: Falha ao carregar script do Google Maps");
        setError("Erro ao carregar Google Maps. Verifique sua conexão com a internet.");
        setLoading(false);
      };

      document.head.appendChild(script);
      addDebug("Script adicionado ao DOM");
    };

    // Primeiro aguardar o mapRef, depois carregar o script
    waitForMapRef(loadAndInitialize);
  }, []);

  const initializeMap = () => {
    addDebug("Tentando inicializar mapa...");
    
    if (!mapRef.current) {
      addDebug("ERRO: mapRef.current é null");
      setError("Elemento do mapa não encontrado.");
      setLoading(false);
      return;
    }

    if (!window.google || !window.google.maps || typeof window.google.maps.Map !== "function") {
      addDebug("ERRO: window.google.maps.Map não está disponível");
      setError("Google Maps API não está disponível.");
      setLoading(false);
      return;
    }

    try {
      addDebug("Criando instância do mapa...");
      const defaultCenter = { lat: -15.7975, lng: -47.8919 }; // Brasília
      
      const newMap = new window.google.maps.Map(mapRef.current, {
        zoom: 4,
        center: defaultCenter,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: true,
        styles: [
          {
            featureType: "all",
            elementType: "geometry",
            stylers: [{ color: "#242f3e" }]
          },
          {
            featureType: "all",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#242f3e" }]
          },
          {
            featureType: "all",
            elementType: "labels.text.fill",
            stylers: [{ color: "#746855" }]
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#17263c" }]
          },
          {
            featureType: "landscape",
            elementType: "geometry",
            stylers: [{ color: "#2c3e50" }]
          }
        ]
      });

      mapInstanceRef.current = newMap;
      addDebug("✅ Mapa inicializado com sucesso!");
      setLoading(false);
      setError(null);

      // Processar jobs após um delay
      setTimeout(() => {
        if (jobs.length > 0) {
          addDebug(`Processando ${jobs.length} job(s) na inicialização...`);
          geocodeJobs(newMap);
        } else {
          addDebug("Nenhum job para processar na inicialização");
        }
      }, 1500);

    } catch (err: any) {
      addDebug(`ERRO ao inicializar mapa: ${err.message}`);
      console.error("Erro detalhado:", err);
      setError(`Erro ao inicializar mapa: ${err.message}`);
      setLoading(false);
    }
  };

  const geocodeJobs = async (mapInstance: any) => {
    if (!window.google || !window.google.maps || !mapInstance) {
      addDebug("Geocodificação cancelada: Google Maps não disponível");
      return;
    }

    addDebug(`Iniciando geocodificação para ${jobs.length} job(s)`);

    // Limpar marcadores anteriores
    markersRef.current.forEach((marker) => {
      if (marker) marker.setMap(null);
    });
    markersRef.current = [];

    const geocoder = new window.google.maps.Geocoder();
    const bounds = new window.google.maps.LatLngBounds();

    const jobsWithAddress = jobs.filter((job) => job.site && job.site.trim());
    addDebug(`Jobs com endereço: ${jobsWithAddress.length}`);

    if (jobsWithAddress.length === 0) {
      addDebug("Nenhum job com endereço para geocodificar");
      return;
    }

    // Agrupar jobs pelo mesmo endereço normalizado
    const jobsByAddress = new Map<string, Job[]>();

    for (const job of jobsWithAddress) {
      const cleanAddress =
        job.site
          ?.replace(/\s*\|\s*/g, ", ")
          .replace(/\s+/g, " ")
          .trim() || "";
      const key = cleanAddress.toLowerCase();
      if (!jobsByAddress.has(key)) {
        jobsByAddress.set(key, []);
      }
      jobsByAddress.get(key)!.push(job);
    }

    addDebug(`Endereços únicos para geocodificar: ${jobsByAddress.size}`);

    // Tabela de cores por status
    const statusColors: Record<string, string> = {
      pendente: "#fbbf24",
      em_execucao: "#3b82f6",
      concluida: "#10b981",
      cancelada: "#ef4444"
    };

    const statusPriority: Record<string, number> = {
      pendente: 4,
      em_execucao: 3,
      concluida: 2,
      cancelada: 1
    };

    // Processar endereços únicos
    for (const [addressKey, addressJobs] of jobsByAddress.entries()) {
      const cleanAddress = addressJobs[0].site
        ?.replace(/\s*\|\s*/g, ", ")
        .replace(/\s+/g, " ")
        .trim();

      addDebug(`Geocodificando endereço agrupado: ${cleanAddress} (${addressJobs.length} OS)`);

      try {
        await new Promise<void>((resolve) => {
          geocoder.geocode({ address: cleanAddress }, (results: any[], status: string) => {
            if (status === "OK" && results && results[0]) {
              const location = results[0].geometry.location;
              const position = { lat: location.lat(), lng: location.lng() };
              addDebug(
                `✅ Geocodificado: ${cleanAddress} -> ${position.lat}, ${position.lng} (${addressJobs.length} OS)`
              );

              // Determinar cor e zIndex pela prioridade dos status (pendente sempre no topo)
              let chosenStatus = "cancelada";
              let bestPriority = 0;
              addressJobs.forEach((j) => {
                const p = statusPriority[j.status] ?? 0;
                if (p > bestPriority) {
                  bestPriority = p;
                  chosenStatus = j.status;
                }
              });

              const color = statusColors[chosenStatus] || "#6b7280";

              const marker = new window.google.maps.Marker({
                position,
                map: mapInstance,
                title:
                  addressJobs.length === 1
                    ? addressJobs[0].title
                    : `${addressJobs.length} OS neste endereço`,
                icon: {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: color,
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2
                },
                // Mostrar contador quando houver mais de uma OS no mesmo ponto
                label:
                  addressJobs.length > 1
                    ? {
                        text: String(addressJobs.length),
                        color: "#111827",
                        fontSize: "11px",
                        fontWeight: "bold"
                      }
                    : undefined,
                // Garantir que pendentes fiquem sempre \"por cima\"
                zIndex:
                  chosenStatus === "pendente"
                    ? 400
                    : chosenStatus === "em_execucao"
                    ? 300
                    : chosenStatus === "concluida"
                    ? 200
                    : 100
              });

              // Conteúdo do InfoWindow: lista todas as OS neste endereço
              const infoWindow = new window.google.maps.InfoWindow({
                content: `
                  <div style="color: #1f2937; padding: 8px; min-width: 220px; max-width: 260px;">
                    <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: bold; color: #111827;">
                      ${addressJobs.length === 1 ? "Ordem de Serviço" : `${addressJobs.length} Ordens de Serviço`}
                    </h3>
                    <p style="margin: 4px 0 8px 0; font-size: 12px; color: #4b5563;">
                      <strong>Local:</strong> ${cleanAddress}
                    </p>
                    <div style="max-height: 160px; overflow-y: auto; padding-right: 4px;">
                      ${addressJobs
                        .map(
                          (j) => `
                        <div style="margin-bottom: 8px; padding: 6px; border-radius: 6px; background: #f9fafb; border: 1px solid #e5e7eb;">
                          <div style="font-size: 12px; font-weight: 600; color: #111827; margin-bottom: 2px;">
                            ${j.title}
                          </div>
                          <div style="font-size: 11px; color: #4b5563; margin-bottom: 1px;">
                            <strong>Cliente:</strong> ${j.clientName || "N/A"}
                          </div>
                          <div style="font-size: 11px; color: #4b5563; margin-bottom: 1px;">
                            <strong>Status:</strong> ${j.status}
                          </div>
                          ${
                            j.team
                              ? `<div style="font-size: 11px; color: #4b5563;"><strong>Equipe:</strong> ${j.team}</div>`
                              : ""
                          }
                        </div>
                      `
                        )
                        .join("")}
                    </div>
                  </div>
                `
              });

              marker.addListener("click", () => {
                infoWindow.open(mapInstance, marker);
              });

              markersRef.current.push(marker);
              bounds.extend(position);
            } else {
              addDebug(`⚠️ Erro na geocodificação (${status}): ${cleanAddress}`);
            }
            resolve();
          });
        });

        // Pequeno delay entre requisições
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (err: any) {
        addDebug(`ERRO ao geocodificar ${cleanAddress}: ${err.message}`);
      }
    }

    // Ajustar zoom
    if (markersRef.current.length > 0) {
      mapInstance.fitBounds(bounds);
      if (markersRef.current.length === 1) {
        mapInstance.setZoom(15);
      }
      addDebug(`✅ ${markersRef.current.length} marcador(es) adicionado(s)`);
    } else {
      addDebug("⚠️ Nenhum marcador foi criado");
    }
  };

  // Atualizar marcadores quando jobs mudarem
  useEffect(() => {
    addDebug(`useEffect jobs: mapa=${!!mapInstanceRef.current}, google=${!!(window.google && window.google.maps)}, jobs=${jobs.length}`);
    if (mapInstanceRef.current && window.google && window.google.maps) {
      if (jobs.length > 0) {
        addDebug(`Jobs atualizados: ${jobs.length}, processando...`);
        // Pequeno delay para garantir que o mapa está totalmente renderizado
        setTimeout(() => {
          geocodeJobs(mapInstanceRef.current);
        }, 500);
      } else {
        addDebug("Nenhum job para processar");
      }
    } else {
      addDebug("Mapa ou Google Maps não disponível para atualizar marcadores");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Mapa de Locais de Serviço</h3>
          <p className="text-xs text-slate-400">
            {jobs.filter((j) => j.site && j.site.trim()).length} local(is) com endereço
          </p>
        </div>
        {!loading && !error && (
          <div className="flex gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-slate-300">Pendente</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-slate-300">Em execução</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-slate-300">Concluída</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-slate-300">Cancelada</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="relative h-[300px] sm:h-[400px] md:h-[500px] rounded-lg border border-white/10 overflow-hidden bg-slate-800">
        {/* Elemento do mapa - sempre presente no DOM */}
        <div ref={mapRef} className="w-full h-full" />
        
        {/* Overlay de loading */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-2"></div>
              <p className="text-sm text-slate-300 mb-2">Carregando mapa...</p>
              {debugInfo.length > 0 && (
                <div className="mt-4 p-3 bg-black/50 rounded text-left max-h-32 overflow-y-auto">
                  <p className="text-xs text-slate-400 mb-1">Debug:</p>
                  {debugInfo.map((info, idx) => (
                    <p key={idx} className="text-xs text-slate-500 font-mono">
                      {info}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Overlay de erro */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
            <div className="text-center text-slate-300">
              <p className="text-sm mb-4">{error}</p>
              {debugInfo.length > 0 && (
                <div className="mb-4 p-3 bg-black/50 rounded text-left max-h-40 overflow-y-auto">
                  <p className="text-xs text-slate-400 mb-2">Últimos logs:</p>
                  {debugInfo.map((info, idx) => (
                    <p key={idx} className="text-xs text-slate-500 font-mono">
                      {info}
                    </p>
                  ))}
                </div>
              )}
              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Recarregar Página
              </button>
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
}

