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

interface JobSite {
  address: string;
  position: { lat: number; lng: number };
  jobs: Job[];
  marker: any;
}

declare global {
  interface Window {
    google: any;
  }
}

interface JobSite {
  address: string;
  position: { lat: number; lng: number };
  jobs: Job[];
  marker: any;
}

export default function JobsMap({ jobs }: JobsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const jobSitesRef = useRef<Map<string, JobSite>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [jobSites, setJobSites] = useState<JobSite[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const addDebug = (msg: string) => {
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
      setMapReady(true);

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
    jobSitesRef.current.clear();
    jobSitesRef.current.clear();

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
              
              // Store job site for shortcuts (use cleanAddress from outer scope)
              jobSitesRef.current.set(cleanAddress.toLowerCase(), {
                address: cleanAddress,
                position,
                jobs: addressJobs,
                marker
              });
            } else {
              addDebug(`⚠️ Erro na geocodificação (${status}): ${cleanAddress || addressKey}`);
            }
            resolve();
          });
        });

        // Pequeno delay entre requisições
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (err: any) {
        const errorAddress = addressJobs[0]?.site || addressKey;
        addDebug(`ERRO ao geocodificar ${errorAddress}: ${err.message}`);
      }
    }

    // Ajustar zoom e atualizar lista de job sites
    if (markersRef.current.length > 0) {
      mapInstance.fitBounds(bounds);
      if (markersRef.current.length === 1) {
        mapInstance.setZoom(15);
      }
      
      // Atualizar lista de job sites para shortcuts
      setJobSites(Array.from(jobSitesRef.current.values()));
      
      // Aplicar filtros iniciais
      applyFilters();
      
      addDebug(`✅ ${markersRef.current.length} marcador(es) adicionado(s)`);
    } else {
      addDebug("⚠️ Nenhum marcador foi criado");
      setJobSites([]);
    }
  };

  // Obter lista de equipes únicas
  const getTeams = (): string[] => {
    const teams = new Set<string>();
    jobs.forEach((job) => {
      if (job.team && job.team.trim()) {
        teams.add(job.team.trim());
      }
    });
    return Array.from(teams).sort();
  };

  // Obter jobs filtrados por equipe e status
  const getFilteredJobs = (): Job[] => {
    let filtered = jobs;
    
    if (selectedTeam) {
      filtered = filtered.filter((job) => job.team === selectedTeam);
    }
    
    if (selectedStatus) {
      filtered = filtered.filter((job) => job.status === selectedStatus);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title?.toLowerCase().includes(query) ||
          job.site?.toLowerCase().includes(query) ||
          job.clientName?.toLowerCase().includes(query) ||
          job.team?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  // Filtrar job sites baseado nos filtros
  const getFilteredJobSites = (): JobSite[] => {
    if (!selectedTeam && !selectedStatus && !searchQuery.trim()) {
      return jobSites;
    }
    
    const filteredJobs = getFilteredJobs();
    const filteredJobIds = new Set(filteredJobs.map((j) => j._id));
    
    return jobSites.filter((site) =>
      site.jobs.some((job) => filteredJobIds.has(job._id))
    );
  };

  // Navegar para uma equipe (mostrar todos os jobs da equipe)
  const navigateToTeam = (team: string) => {
    if (!mapInstanceRef.current) return;
    
    const mapInstance = mapInstanceRef.current;
    const teamJobs = jobSites.filter((site) =>
      site.jobs.some((job) => job.team === team)
    );
    
    if (teamJobs.length === 0) return;
    
    // Criar bounds para incluir todos os jobs da equipe
    const bounds = new window.google.maps.LatLngBounds();
    teamJobs.forEach((site) => {
      bounds.extend(site.position);
    });
    
    mapInstance.fitBounds(bounds);
    if (teamJobs.length === 1) {
      mapInstance.setZoom(15);
    }
    
    // Filtrar para mostrar apenas esta equipe
    setSelectedTeam(team);
  };

  // Aplicar filtros aos marcadores
  const applyFilters = () => {
    if (!mapInstanceRef.current || markersRef.current.length === 0) return;
    
    const filteredJobs = getFilteredJobs();
    const filteredJobIds = new Set(filteredJobs.map((j) => j._id));
    
    // Mostrar/ocultar marcadores baseado nos filtros
    markersRef.current.forEach((marker) => {
      const jobSite = Array.from(jobSitesRef.current.values()).find(
        (site) => site.marker === marker
      );
      
      if (jobSite) {
        const hasVisibleJobs = jobSite.jobs.some((job) => filteredJobIds.has(job._id));
        marker.setVisible(hasVisibleJobs);
      }
    });
  };

  // Atualizar filtros quando mudarem
  useEffect(() => {
    if (mapReady && markersRef.current.length > 0) {
      applyFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeam, selectedStatus, searchQuery, mapReady]);
  
  // Função para navegar para um job site
  const navigateToJobSite = (jobSite: JobSite) => {
    if (!mapInstanceRef.current) return;
    
    const mapInstance = mapInstanceRef.current;
    
    // Centralizar e dar zoom no local
    mapInstance.setCenter(jobSite.position);
    mapInstance.setZoom(16);
    
    // Abrir info window do marcador
    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="color: #1f2937; padding: 8px; min-width: 220px; max-width: 260px;">
          <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: bold; color: #111827;">
            ${jobSite.jobs.length === 1 ? "Ordem de Serviço" : `${jobSite.jobs.length} Ordens de Serviço`}
          </h3>
          <p style="margin: 4px 0 8px 0; font-size: 12px; color: #4b5563;">
            <strong>Local:</strong> ${jobSite.address}
          </p>
          <div style="max-height: 160px; overflow-y: auto; padding-right: 4px;">
            ${jobSite.jobs
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
    
    infoWindow.open(mapInstance, jobSite.marker);
  };
  
  // Determinar cor do status mais prioritário para cada job site
  const getStatusColor = (site: JobSite): string => {
    const statusPriority: Record<string, number> = {
      pendente: 4,
      em_execucao: 3,
      concluida: 2,
      cancelada: 1
    };
    
    const statusColors: Record<string, string> = {
      pendente: "#fbbf24",
      em_execucao: "#3b82f6",
      concluida: "#10b981",
      cancelada: "#ef4444"
    };
    
    let bestPriority = 0;
    let bestStatus = "cancelada";
    
    site.jobs.forEach((job) => {
      const priority = statusPriority[job.status] || 0;
      if (priority > bestPriority) {
        bestPriority = priority;
        bestStatus = job.status;
      }
    });
    
    return statusColors[bestStatus] || "#6b7280";
  };

  // Atualizar marcadores quando jobs mudarem OU quando o mapa ficar pronto
  useEffect(() => {
    addDebug(
      `useEffect jobs/mapReady: mapa=${!!mapInstanceRef.current}, google=${!!(
        window.google && window.google.maps
      )}, jobs=${jobs.length}, mapReady=${mapReady}`
    );
    if (mapReady && mapInstanceRef.current && window.google && window.google.maps) {
      if (jobs.length > 0) {
        addDebug(`Jobs atualizados: ${jobs.length}, processando...`);
        // Pequeno delay para garantir que o mapa está totalmente renderizado
        setTimeout(() => {
          geocodeJobs(mapInstanceRef.current);
        }, 500);
      } else {
        addDebug("Nenhum job para processar");
        // Limpar marcadores se não houver jobs
        markersRef.current.forEach((marker) => {
          if (marker) marker.setMap(null);
        });
        markersRef.current = [];
      }
    } else {
      addDebug("Mapa ou Google Maps não disponível para atualizar marcadores");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, mapReady]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-white">Mapa de Locais de Serviço</h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {jobs.filter((j) => j.site && j.site.trim()).length} local(is) com endereço
          </p>
        </div>
        {!loading && !error && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500 flex-shrink-0"></div>
              <span className="text-slate-300 whitespace-nowrap text-[11px] sm:text-xs">Pendente</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500 flex-shrink-0"></div>
              <span className="text-slate-300 whitespace-nowrap text-[11px] sm:text-xs">Em execução</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 flex-shrink-0"></div>
              <span className="text-slate-300 whitespace-nowrap text-[11px] sm:text-xs">Concluída</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500 flex-shrink-0"></div>
              <span className="text-slate-300 whitespace-nowrap text-[11px] sm:text-xs">Cancelada</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Filters Section */}
      {!loading && !error && jobs.length > 0 && (
        <div className="bg-slate-800/50 border border-white/10 rounded-lg p-2 sm:p-3 space-y-2">
          {/* Search Bar */}
          <div className="relative">
            <svg className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por OS, endereço, cliente ou equipe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {/* Team Filter */}
            {getTeams().length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Equipe:</span>
                <button
                  onClick={() => setSelectedTeam(null)}
                  className={`px-2 py-1 rounded text-[10px] sm:text-xs font-medium transition-all touch-manipulation ${
                    selectedTeam === null
                      ? "bg-emerald-500 text-white"
                      : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
                  }`}
                >
                  Todas
                </button>
                {getTeams().map((team) => {
                  const teamJobCount = jobs.filter((j) => j.team === team).length;
                  return (
                    <button
                      key={team}
                      onClick={() => setSelectedTeam(team)}
                      className={`px-2 py-1 rounded text-[10px] sm:text-xs font-medium transition-all touch-manipulation flex items-center gap-1 ${
                        selectedTeam === team
                          ? "bg-emerald-500 text-white"
                          : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
                      }`}
                    >
                      {team}
                      <span className="text-[9px] opacity-75">({teamJobCount})</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Status:</span>
              <button
                onClick={() => setSelectedStatus(null)}
                className={`px-2 py-1 rounded text-[10px] sm:text-xs font-medium transition-all touch-manipulation ${
                  selectedStatus === null
                    ? "bg-emerald-500 text-white"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
                }`}
              >
                Todos
              </button>
              {[
                { value: "pendente", label: "Pendente", color: "#fbbf24" },
                { value: "em_execucao", label: "Em execução", color: "#3b82f6" },
                { value: "concluida", label: "Concluída", color: "#10b981" },
                { value: "cancelada", label: "Cancelada", color: "#ef4444" }
              ].map((status) => {
                const statusJobCount = jobs.filter((j) => j.status === status.value).length;
                return (
                  <button
                    key={status.value}
                    onClick={() => setSelectedStatus(status.value)}
                    className={`px-2 py-1 rounded text-[10px] sm:text-xs font-medium transition-all touch-manipulation flex items-center gap-1 ${
                      selectedStatus === status.value
                        ? "bg-emerald-500 text-white"
                        : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
                    }`}
                    style={
                      selectedStatus === status.value
                        ? {}
                        : { borderLeftColor: status.color, borderLeftWidth: "2px" }
                    }
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: status.color }}
                    ></div>
                    {status.label}
                    <span className="text-[9px] opacity-75">({statusJobCount})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Filters Display */}
          {(selectedTeam || selectedStatus || searchQuery.trim()) && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-white/10">
              <span className="text-[10px] text-slate-400">Filtros:</span>
              {selectedTeam && (
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] flex items-center gap-1 hover:bg-emerald-500/30 touch-manipulation"
                >
                  {selectedTeam}
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              {selectedStatus && (
                <button
                  onClick={() => setSelectedStatus(null)}
                  className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] flex items-center gap-1 hover:bg-emerald-500/30 touch-manipulation"
                >
                  {selectedStatus}
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              {searchQuery.trim() && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] flex items-center gap-1 hover:bg-emerald-500/30 touch-manipulation"
                >
                  {searchQuery.length > 15 ? `${searchQuery.substring(0, 15)}...` : searchQuery}
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedTeam(null);
                  setSelectedStatus(null);
                  setSearchQuery("");
                }}
                className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 text-[10px] hover:bg-slate-600 touch-manipulation"
              >
                Limpar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Team Shortcuts Section */}
      {!loading && !error && getTeams().length > 0 && (
        <div className="bg-slate-800/50 border border-white/10 rounded-lg p-2 sm:p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h4 className="text-xs sm:text-sm font-semibold text-white">Filtrar por Equipe</h4>
            <span className="text-[10px] text-slate-400 ml-auto">({getTeams().length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {getTeams().map((team) => {
              const teamJobs = jobs.filter((j) => j.team === team);
              const teamJobSites = jobSites.filter((site) =>
                site.jobs.some((job) => job.team === team)
              );
              return (
                <button
                  key={team}
                  onClick={() => navigateToTeam(team)}
                  className={`group relative flex items-center gap-1.5 px-2 py-1.5 rounded border transition-all duration-200 text-left touch-manipulation active:scale-95 ${
                    selectedTeam === team
                      ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                      : "border-white/10 bg-white/5 hover:bg-white/10 text-white"
                  }`}
                >
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] sm:text-xs font-medium truncate">{team}</div>
                    <div className="text-[9px] text-slate-400">
                      {teamJobs.length} OS • {teamJobSites.length} locais
                    </div>
                  </div>
                  <svg className="w-3 h-3 text-slate-400 group-hover:text-blue-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Job Sites Shortcuts Section */}
      {!loading && !error && getFilteredJobSites().length > 0 && (
        <div className="bg-slate-800/50 border border-white/10 rounded-lg p-2 sm:p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h4 className="text-xs sm:text-sm font-semibold text-white">Atalhos para Locais</h4>
            <span className="text-[10px] text-slate-400 ml-auto">
              ({getFilteredJobSites().length}/{jobSites.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {getFilteredJobSites().map((site, index) => {
              const statusColor = getStatusColor(site);
              return (
                <button
                  key={index}
                  onClick={() => navigateToJobSite(site)}
                  className="group relative flex items-center gap-1.5 px-2 py-1.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-200 text-left touch-manipulation active:scale-95"
                  style={{
                    borderLeftColor: statusColor,
                    borderLeftWidth: "2px"
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: statusColor }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] sm:text-xs font-medium text-white truncate max-w-[180px] sm:max-w-none">
                      {site.address}
                    </div>
                    <div className="text-[9px] text-slate-400">
                      {site.jobs.length} OS
                      {site.jobs.some((j) => j.team) && (
                        <span className="ml-1">
                          • {Array.from(new Set(site.jobs.map((j) => j.team).filter(Boolean))).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <svg className="w-3 h-3 text-slate-400 group-hover:text-emerald-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      <div className="relative h-[300px] sm:h-[350px] md:h-[450px] lg:h-[500px] rounded-lg border border-white/10 overflow-hidden bg-slate-800">
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

