"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Swal from "sweetalert2";

// TypeScript declarations for Google Maps
declare global {
  interface Window {
    google: any;
  }
  
  namespace google {
    namespace maps {
      class Map {
        panTo(latlng: { lat: number; lng: number }): void;
      }
      class Marker {
        setMap(map: Map | null): void;
      }
      interface MapMouseEvent {
        latLng?: {
          lat(): number;
          lng(): number;
        } | null;
      }
      enum Animation {
        DROP = 2,
        BOUNCE = 1
      }
    }
  }
}

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export default function LocationCapturePage() {
  const params = useParams();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<"valid" | "invalid" | "used">("valid");
  const [tokenData, setTokenData] = useState<any>(null);
  
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
    addressStreet?: string;
    addressNumber?: string;
    addressNeighborhood?: string;
    addressCity?: string;
    addressState?: string;
    addressZip?: string;
  } | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  // Load Google Maps Script (only if not already loaded)
  useEffect(() => {
    const initGoogleMaps = () => {
      // Check if already loaded and fully initialized
      if (window.google && window.google.maps && window.google.maps.Map) {
        console.log("Google Maps already loaded and ready");
        setMapLoaded(true);
        return true;
      }
      return false;
    };

    // Try immediate check
    if (initGoogleMaps()) {
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com/maps/api/js"]`
    );
    
    if (existingScript) {
      console.log("Google Maps script already in DOM, waiting for load...");
      // Wait for it to load with timeout
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds
      const checkLoaded = setInterval(() => {
        attempts++;
        if (initGoogleMaps()) {
          console.log("Google Maps loaded from existing script");
          clearInterval(checkLoaded);
        } else if (attempts >= maxAttempts) {
          clearInterval(checkLoaded);
          console.error("Timeout waiting for Google Maps to load");
          Swal.fire("Erro", "Tempo esgotado ao carregar o Google Maps. Recarregue a página.", "error");
        }
      }, 100);
      
      return () => clearInterval(checkLoaded);
    }

    // Load new script
    console.log("Loading Google Maps script...");
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log("Google Maps script loaded, waiting for API to be ready...");
      // Wait a bit for the API to fully initialize
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds
      const checkReady = setInterval(() => {
        attempts++;
        if (initGoogleMaps()) {
          console.log("✅ Google Maps API fully ready");
          clearInterval(checkReady);
        } else if (attempts >= maxAttempts) {
          clearInterval(checkReady);
          console.error("Google Maps API not ready after script load");
          Swal.fire("Erro", "Google Maps não está pronto. Recarregue a página.", "error");
        }
      }, 100);
    };
    
    script.onerror = () => {
      console.error("Failed to load Google Maps script");
      Swal.fire("Erro", "Falha ao carregar o Google Maps. Verifique sua conexão.", "error");
    };
    
    document.head.appendChild(script);
  }, []);

  // Validate token on mount
  useEffect(() => {
    validateToken();
  }, [token]);

  // Initialize map when loaded
  useEffect(() => {
    if (mapLoaded && mapRef.current && !googleMapRef.current) {
      initializeMap();
    }
  }, [mapLoaded]);

  const validateToken = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/location-capture/${token}`);
      const data = await res.json();

      if (!res.ok) {
        console.error("Token validation error:", data);
        if (data.status === "expired" || data.status === "captured") {
          setTokenStatus(data.status === "captured" ? "used" : "invalid");
        } else {
          setTokenStatus("invalid");
        }
        setTokenData(null);
        return;
      }

      // Check status
      if (data.data.status !== "pending") {
        setTokenStatus(data.data.status === "captured" ? "used" : "invalid");
        setTokenData(null);
        return;
      }

      setTokenData(data.data);
      setTokenStatus("valid");
    } catch (error) {
      console.error("Error validating token:", error);
      setTokenStatus("invalid");
      setTokenData(null);
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = () => {
    if (!mapRef.current) {
      console.log("Map ref not ready");
      return;
    }

    // Double-check Google Maps is fully loaded
    if (!window.google || !window.google.maps || !window.google.maps.Map) {
      console.error("Google Maps API not fully loaded");
      return;
    }

    try {
      console.log("Initializing Google Map...");
      
      // Default to Brazil center if no location yet
      const defaultCenter = { lat: -15.7801, lng: -47.9292 }; // Brasília

      const map = new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
      });

      googleMapRef.current = map;

      // Add click listener to map
      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          updateLocation(e.latLng.lat(), e.latLng.lng());
        }
      });

      console.log("✅ Map initialized successfully");
    } catch (error) {
      console.error("Failed to initialize map:", error);
      Swal.fire("Erro", "Falha ao inicializar o mapa. Recarregue a página.", "error");
    }
  };

  const updateLocation = async (lat: number, lng: number) => {
    // Update marker
    if (!googleMapRef.current || !window.google || !window.google.maps) return;

    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    const marker = new window.google.maps.Marker({
      position: { lat, lng },
      map: googleMapRef.current,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
      title: "Arraste para ajustar a posição",
    });

    // Add drag listener
    marker.addListener("dragend", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        updateLocation(e.latLng.lat(), e.latLng.lng());
      }
    });

    markerRef.current = marker;

    // Center map on marker
    googleMapRef.current.panTo({ lat, lng });

    // Get address via backend reverse geocoding
    const addressData = await reverseGeocode(lat, lng);

    setLocation({
      lat,
      lng,
      ...addressData,
    });
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      console.log("Reverse geocoding:", lat, lng);
      const res = await fetch(`${API_URL}/distance/geocode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });

      const data = await res.json();

      if (res.ok && data.data) {
        console.log("Geocoding result:", data.data);
        return {
          address: data.data.formattedAddress,
          addressStreet: data.data.street,
          addressNumber: data.data.number,
          addressNeighborhood: data.data.neighborhood,
          addressCity: data.data.city,
          addressState: data.data.state,
          addressZip: data.data.zip,
        };
      }

      return {
        address: "Endereço não encontrado",
      };
    } catch (error) {
      console.error("Geocoding error:", error);
      return {
        address: "Erro ao obter endereço",
      };
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      Swal.fire("Erro", "Geolocalização não é suportada pelo seu navegador", "error");
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        updateLocation(lat, lng);
        setGettingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        let errorMessage = "Não foi possível obter sua localização";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Permissão de localização negada. Por favor, habilite no seu navegador.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Informação de localização indisponível.";
            break;
          case error.TIMEOUT:
            errorMessage = "Timeout ao obter localização.";
            break;
        }
        
        Swal.fire("Erro", errorMessage, "error");
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const saveLocation = async () => {
    if (!location) {
      Swal.fire("Atenção", "Por favor, selecione uma localização no mapa primeiro", "warning");
      return;
    }

    try {
      setSaving(true);
      
      const res = await fetch(`${API_URL}/location-capture/${token}/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lng,
          address: location.address || "",
          addressStreet: location.addressStreet || "",
          addressNumber: location.addressNumber || "",
          addressNeighborhood: location.addressNeighborhood || "",
          addressCity: location.addressCity || "",
          addressState: location.addressState || "",
          addressZip: location.addressZip || "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        Swal.fire("Erro", data.error || "Falha ao salvar localização", "error");
        return;
      }

      Swal.fire({
        icon: "success",
        title: "✅ Localização Salva!",
        html: `
          <div class="text-left space-y-2">
            <p class="text-gray-600">Sua localização foi registrada com sucesso!</p>
            <div class="bg-green-50 p-3 rounded border border-green-200">
              <p class="text-sm font-semibold text-green-800 mb-1">📍 Endereço:</p>
              <p class="text-sm text-gray-700">${location.address}</p>
            </div>
            <p class="text-xs text-gray-500 mt-2">Você pode fechar esta página agora.</p>
          </div>
        `,
        confirmButtonText: "Fechar",
        allowOutsideClick: false,
        confirmButtonColor: "#10b981",
      }).then(() => {
        // Mark as completed
        setTokenStatus("used");
        setTokenData(null);
      });
    } catch (error) {
      console.error("Error saving location:", error);
      Swal.fire("Erro", "Falha ao salvar localização. Verifique sua conexão e tente novamente.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 flex items-center justify-center">
        <div className="text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white text-lg font-semibold">Carregando...</p>
        </div>
      </div>
    );
  }

  if (tokenStatus === "used") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl">
          <div className="text-7xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-white mb-3">Localização Salva!</h1>
          <p className="text-green-200 text-lg mb-2">Este link já foi usado com sucesso.</p>
          <p className="text-green-300/70 text-sm">Você pode fechar esta página.</p>
        </div>
      </div>
    );
  }

  if (tokenStatus === "invalid" || !tokenData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl">
          <div className="text-7xl mb-4">⚠️</div>
          <h1 className="text-3xl font-bold text-white mb-3">Link Inválido</h1>
          <p className="text-red-200 text-lg mb-2">Este link é inválido ou expirou.</p>
          <p className="text-red-300/70 text-sm">Entre em contato para obter um novo link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 flex flex-col overflow-hidden">
      {/* Header - Fixed */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20 shadow-xl p-3 sm:p-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">📍</span>
            Captura de Localização
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 mt-1">
            {tokenData.description || "Marque sua localização no mapa"}
          </p>
        </div>
      </div>

      {/* Main Content - Flexible */}
      <div className="flex-1 flex flex-col gap-3 p-2 sm:p-4 max-w-7xl mx-auto w-full overflow-hidden">
        {/* Controls - Compact */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-2 sm:p-3 shadow-xl flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={getCurrentLocation}
              disabled={gettingLocation || !mapLoaded}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg text-sm sm:text-base"
            >
              {gettingLocation ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  <span>Obtendo...</span>
                </>
              ) : (
                <>
                  <span className="text-xl">📱</span>
                  <span>Usar Minha Localização</span>
                </>
              )}
            </button>
            
            <div className="flex-1 flex items-center justify-center gap-2 text-white bg-white/5 border border-white/20 rounded-lg py-3 px-4 text-sm sm:text-base">
              <span className="text-xl">🖱️</span>
              <span className="hidden sm:inline">Ou clique no mapa</span>
              <span className="sm:hidden">Clique no mapa</span>
            </div>
          </div>
        </div>

        {/* Location Info - Compact when shown */}
        {location && (
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-400/50 rounded-xl p-3 sm:p-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-300 flex-shrink-0">
            <div className="flex items-start gap-3">
              <div className="text-2xl sm:text-3xl">✅</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-sm sm:text-base mb-1">Localização Selecionada</h3>
                <p className="text-xs sm:text-sm text-green-100 mb-1 leading-tight line-clamp-2">{location.address}</p>
                <p className="text-xs text-green-200/70">
                  📐 {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Map - Takes all remaining space */}
        <div className="flex-1 bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-xl overflow-hidden shadow-2xl min-h-0">
          {!mapLoaded ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-4 border-b-4 border-blue-400 mx-auto mb-4"></div>
                <p className="text-white text-base sm:text-lg font-semibold">Carregando mapa...</p>
                <p className="text-blue-200 text-xs sm:text-sm mt-2">Por favor, aguarde...</p>
              </div>
            </div>
          ) : (
            <div ref={mapRef} className="w-full h-full" />
          )}
        </div>

        {/* Save Button - Fixed at bottom */}
        {location && (
          <button
            onClick={saveLocation}
            disabled={saving}
            className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 hover:from-green-600 hover:via-emerald-600 hover:to-green-700 text-white font-bold py-3 sm:py-4 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-base sm:text-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300 flex-shrink-0"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                <span>Salvando...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span className="text-xl sm:text-2xl">💾</span>
                <span>Salvar Localização</span>
              </span>
            )}
          </button>
        )}
      </div>

      {/* Instructions - Fixed at bottom */}
      <div className="bg-white/10 backdrop-blur-md border-t border-white/20 p-2 sm:p-3 shadow-xl flex-shrink-0">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 flex-wrap">
            <span className="text-lg sm:text-xl">💡</span>
            <span className="hidden sm:inline">Dica: Você pode arrastar o marcador no mapa para ajustar a posição</span>
            <span className="sm:hidden">Arraste o marcador para ajustar</span>
          </p>
        </div>
      </div>
    </div>
  );
}
