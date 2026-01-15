import { useEffect, useRef, useState } from "react";

interface RouteMapProps {
  origin: string;
  destination: string;
  jobTitle?: string;
}

interface RouteStep {
  instruction: string;
  distance: string;
  duration: string;
  maneuver?: string;
}

declare global {
  interface Window {
    google: any;
  }
}

export default function RouteMap({ origin, destination, jobTitle }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const directionsServiceRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const stepsDataRef = useRef<Array<{ distance: number; duration: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [totalDistance, setTotalDistance] = useState<string>("");
  const [totalDuration, setTotalDuration] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [remainingDistance, setRemainingDistance] = useState<string>("");
  const [remainingDuration, setRemainingDuration] = useState<string>("");
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [vehiclePosition, setVehiclePosition] = useState<number>(0); // Posição do veículo na rota (0 a 1)
  const vehicleMarkerRef = useRef<any>(null);
  const routePathRef = useRef<any[]>([]);

  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const initializeMap = () => {
    if (!mapRef.current || !window.google || !window.google.maps) {
      console.error("Mapa ou Google Maps não disponível");
      return;
    }

    try {
      // Inicializar mapa
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 8,
        center: { lat: -15.7942, lng: -47.8822 }, // Centro do Brasil como fallback
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });

      mapInstanceRef.current = map;

      // Inicializar DirectionsService e DirectionsRenderer
      const directionsService = new window.google.maps.DirectionsService();
      const directionsRenderer = new window.google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true, // Não mostrar marcadores padrão
        polylineOptions: {
          strokeColor: "#10b981",
          strokeWeight: 6,
          strokeOpacity: 0.9
        },
        preserveViewport: false
      });

      directionsServiceRef.current = directionsService;
      directionsRendererRef.current = directionsRenderer;

      // Traçar rota
      traceRoute(directionsService, directionsRenderer, map);

    } catch (err: any) {
      console.error("Erro ao inicializar mapa:", err);
      setError(`Erro ao inicializar mapa: ${err.message}`);
      setLoading(false);
    }
  };

  const traceRoute = (directionsService: any, directionsRenderer: any, map: any) => {
    if (!destination) {
      setError("Destino não informado");
      setLoading(false);
      return;
    }

    // If no origin, just show destination marker
    if (!origin) {
      // Geocode destination to show on map
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: destination }, (results: any, status: string) => {
        if (status === "OK" && results[0]) {
          const location = results[0].geometry.location;
          map.setCenter(location);
          map.setZoom(15);
          
          // Add marker for destination
          new window.google.maps.Marker({
            position: location,
            map: map,
            title: jobTitle || destination,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#ef4444",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2
            }
          });
          
          setLoading(false);
          setError("Localização atual não disponível. Mostrando apenas o destino.");
        } else {
          setError("Não foi possível encontrar o endereço de destino.");
          setLoading(false);
        }
      });
      return;
    }

    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING
      },
      (result: any, status: string) => {
        if (status === "OK") {
          directionsRenderer.setDirections(result);
          
          // Extrair informações da rota
          const route = result.routes[0];
          const leg = route.legs[0];
          
          // Extrair todos os pontos da rota para animação
          const path: any[] = [];
          leg.steps.forEach((step: any) => {
            step.path.forEach((point: any) => {
              path.push({ lat: point.lat(), lng: point.lng() });
            });
          });
          routePathRef.current = path;
          
          // Criar marcador de veículo (só quando iniciar navegação)
          // Será criado quando o usuário clicar em "Iniciar Rota"
          
          // Distância e duração total
          setTotalDistance(leg.distance.text);
          setTotalDuration(leg.duration.text);
          
          // Armazenar valores numéricos dos passos
          stepsDataRef.current = leg.steps.map((step: any) => ({
            distance: step.distance.value, // em metros
            duration: step.duration.value  // em segundos
          }));
          
          // Calcular distância e tempo restantes iniciais (todos os passos)
          let remainingDist = 0;
          let remainingDur = 0;
          stepsDataRef.current.forEach((stepData) => {
            remainingDist += stepData.distance;
            remainingDur += stepData.duration;
          });
          
          // Converter para texto legível
          const distKm = remainingDist / 1000;
          const distText = distKm >= 1 ? `${distKm.toFixed(1)} km` : `${Math.round(remainingDist)} m`;
          const hours = Math.floor(remainingDur / 3600);
          const minutes = Math.floor((remainingDur % 3600) / 60);
          const durText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
          
          setRemainingDistance(distText);
          setRemainingDuration(durText);
          
          // Extrair instruções passo a passo
          const steps: RouteStep[] = leg.steps.map((step: any) => ({
            instruction: step.instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
            distance: step.distance.text,
            duration: step.duration.text,
            maneuver: step.maneuver || ''
          }));
          setRouteSteps(steps);
          
          // Ajustar zoom inicial para mostrar toda a rota
          const bounds = new window.google.maps.LatLngBounds();
          result.routes[0].legs.forEach((leg: any) => {
            bounds.extend(leg.start_location);
            bounds.extend(leg.end_location);
          });
          map.fitBounds(bounds);
          
          // Se a rota for muito longa, definir um zoom mínimo
          const listener = window.google.maps.event.addListener(map, "bounds_changed", () => {
            if (map.getZoom() && map.getZoom() > 15) {
              map.setZoom(15);
            }
            window.google.maps.event.removeListener(listener);
          });

          setLoading(false);
        } else {
          console.error("Erro ao traçar rota:", status);
          setError(`Não foi possível traçar a rota: ${status}`);
          setLoading(false);
        }
      }
    );
  };

  // Carregar script do Google Maps
  useEffect(() => {
    // Aguardar o mapRef estar disponível
    const waitForMapRef = (callback: () => void) => {
      let attempts = 0;
      const maxAttempts = 50;
      
      const checkRef = setInterval(() => {
        attempts++;
        if (mapRef.current) {
          clearInterval(checkRef);
          callback();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkRef);
          setError("Elemento do mapa não foi encontrado.");
          setLoading(false);
        }
      }, 100);
    };

    const loadAndInitialize = () => {
      // Verificar se já está carregado
      if (window.google && window.google.maps && typeof window.google.maps.Map === "function") {
        initializeMap();
        return;
      }

      // Verificar se script já existe
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
      if (existingScript) {
        let attempts = 0;
        const maxAttempts = 100;
        
        const checkInterval = setInterval(() => {
          attempts++;
          if (window.google && window.google.maps && typeof window.google.maps.Map === "function") {
            clearInterval(checkInterval);
            initializeMap();
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            setError("Timeout ao carregar Google Maps.");
            setLoading(false);
          }
        }, 100);

        return () => clearInterval(checkInterval);
      }

      // Criar novo script
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        setTimeout(() => {
          initializeMap();
        }, 500);
      };

      script.onerror = () => {
        setError("Falha ao carregar Google Maps. Verifique sua conexão.");
        setLoading(false);
      };

      document.head.appendChild(script);
    };

    waitForMapRef(loadAndInitialize);
  }, []);

  // Atualizar rota quando origin ou destination mudarem
  useEffect(() => {
    if (directionsServiceRef.current && directionsRendererRef.current && mapInstanceRef.current && origin && destination) {
      traceRoute(
        directionsServiceRef.current,
        directionsRendererRef.current,
        mapInstanceRef.current
      );
    }
  }, [origin, destination]);

  // Atualizar distância e tempo restantes quando mudar o passo atual
  useEffect(() => {
    if (stepsDataRef.current.length > 0 && currentStep < stepsDataRef.current.length) {
      let remainingDist = 0;
      let remainingDur = 0;
      
      // Calcular distância e tempo dos passos restantes
      for (let i = currentStep; i < stepsDataRef.current.length; i++) {
        remainingDist += stepsDataRef.current[i].distance;
        remainingDur += stepsDataRef.current[i].duration;
      }
      
      // Converter para texto legível
      const distKm = remainingDist / 1000;
      const distText = distKm >= 1 ? `${distKm.toFixed(1)} km` : `${Math.round(remainingDist)} m`;
      const hours = Math.floor(remainingDur / 3600);
      const minutes = Math.floor((remainingDur % 3600) / 60);
      const durText = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
      
      setRemainingDistance(distText);
      setRemainingDuration(durText);
    }
  }, [currentStep]);

  // Animação do veículo na rota (modo GPS) - Desabilitada para evitar tremores
  // A animação automática foi removida. O usuário pode navegar manualmente usando os botões.

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Painel Superior de Navegação - Estilo App */}
      {!loading && !error && routeSteps.length > 0 && isNavigating && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/10 px-4 py-3 z-30">
          {/* Próxima Instrução - Grande e Destacada */}
          <div className="mb-3">
            <div className="text-xs uppercase tracking-wide text-emerald-300 mb-1">Próxima Manobra</div>
            <div className="text-lg sm:text-xl font-bold text-white leading-tight">
              {routeSteps[currentStep]?.instruction || "Siga em frente"}
            </div>
          </div>
          
          {/* Distância e Tempo Restantes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-lg px-3 py-2">
              <div className="text-xs text-emerald-300 mb-1">Distância Restante</div>
              <div className="text-xl font-bold text-white">{remainingDistance}</div>
            </div>
            <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg px-3 py-2">
              <div className="text-xs text-blue-300 mb-1">Tempo Restante</div>
              <div className="text-xl font-bold text-white">{remainingDuration}</div>
            </div>
          </div>
          
          {/* Informações Totais */}
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>Total: {totalDistance} · {totalDuration}</span>
            <span>Passo {currentStep + 1} de {routeSteps.length}</span>
          </div>
        </div>
      )}

      {/* Container do mapa */}
      <div className="relative flex-1 min-h-0 rounded-lg border border-white/10 overflow-hidden bg-slate-800">
        {/* Elemento do mapa */}
        <div ref={mapRef} className="w-full h-full" />
        
        {/* Controles de Navegação - Botões Laterais */}
        {!loading && !error && routeSteps.length > 0 && isNavigating && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
            <button
              onClick={() => {
                const newStep = Math.max(0, currentStep - 1);
                setCurrentStep(newStep);
                // Atualizar posição do veículo baseado no passo atual
                if (vehicleMarkerRef.current && routePathRef.current.length > 0) {
                  const stepIndex = Math.floor((newStep / routeSteps.length) * routePathRef.current.length);
                  const point = routePathRef.current[Math.min(stepIndex, routePathRef.current.length - 1)];
                  vehicleMarkerRef.current.setPosition(point);
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.setCenter(point);
                    mapInstanceRef.current.setZoom(16);
                  }
                }
              }}
              disabled={currentStep === 0}
              className="rounded-full bg-white/90 hover:bg-white shadow-lg p-2 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Instrução anterior"
            >
              <svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={() => {
                const newStep = Math.min(routeSteps.length - 1, currentStep + 1);
                setCurrentStep(newStep);
                // Atualizar posição do veículo baseado no passo atual
                if (vehicleMarkerRef.current && routePathRef.current.length > 0) {
                  const stepIndex = Math.floor((newStep / routeSteps.length) * routePathRef.current.length);
                  const point = routePathRef.current[Math.min(stepIndex, routePathRef.current.length - 1)];
                  vehicleMarkerRef.current.setPosition(point);
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.setCenter(point);
                    mapInstanceRef.current.setZoom(16);
                  }
                }
              }}
              disabled={currentStep === routeSteps.length - 1}
              className="rounded-full bg-white/90 hover:bg-white shadow-lg p-2 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Próxima instrução"
            >
              <svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Overlay de loading */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-2"></div>
              <p className="text-sm text-slate-300">Carregando rota...</p>
            </div>
          </div>
        )}
        
        {/* Overlay de erro */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
            <div className="text-center text-slate-300 px-4">
              <p className="text-sm mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Recarregar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Botão Iniciar Rota - No Footer */}
      {!loading && !error && routeSteps.length > 0 && !isNavigating && (
        <div className="mt-3 px-4 py-3 bg-slate-900/95 border-t border-white/10">
          <button
            onClick={() => {
              setIsNavigating(true);
              // Criar marcador de veículo quando iniciar
              if (routePathRef.current.length > 0 && mapInstanceRef.current && !vehicleMarkerRef.current) {
                const vehicleIcon = {
                  path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 6,
                  fillColor: "#3b82f6",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                  rotation: 0
                };
                
                vehicleMarkerRef.current = new window.google.maps.Marker({
                  position: routePathRef.current[0],
                  map: mapInstanceRef.current,
                  icon: vehicleIcon,
                  zIndex: 1000,
                  title: "Seu veículo"
                });
                
                // Centralizar no início da rota
                mapInstanceRef.current.setCenter(routePathRef.current[0]);
                mapInstanceRef.current.setZoom(16);
              }
            }}
            className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/40 transition hover:from-emerald-600 hover:to-blue-600 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Iniciar Rota
          </button>
        </div>
      )}
    </div>
  );
}

