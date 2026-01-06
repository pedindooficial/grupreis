import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { apiFetch } from "@/lib/api-client";

declare global {
  interface Window {
    google: any;
  }
}

// Helper functions
const formatDate = (dateString?: string): string => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  } catch {
    return dateString;
  }
};

const formatCurrency = (value?: number): string => {
  if (!value) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pendente: "Pendente",
    em_execucao: "Em Execução",
    concluida: "Concluída",
    cancelada: "Cancelada"
  };
  return labels[status] || status;
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pendente: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
    em_execucao: "bg-blue-500/20 text-blue-300 border-blue-500/50",
    concluida: "bg-green-500/20 text-green-300 border-green-500/50",
    cancelada: "bg-red-500/20 text-red-300 border-red-500/50"
  };
  return colors[status] || "bg-slate-500/20 text-slate-300 border-slate-500/50";
};

// Google Maps marker icon by status
const getMarkerIcon = (status: string): string => {
  const colors: Record<string, string> = {
    pendente: "#fbbf24", // yellow
    em_execucao: "#3b82f6", // blue
    concluida: "#10b981", // green
    cancelada: "#ef4444" // red
  };

  const color = colors[status] || "#6b7280";
  
  // Create a custom SVG icon
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 2C10.48 2 6 6.48 6 12c0 8 10 18 10 18s10-10 10-18c0-5.52-4.48-10-10-10z" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="12" r="4" fill="white"/>
    </svg>
  `)}`;
};

interface RoadmapJob {
  _id: string;
  title: string;
  seq?: number;
  clientName: string;
  site: string;
  latitude: number;
  longitude: number;
  team: string;
  teamId: string | null;
  teamStatus: string | null;
  teamLocation: { latitude: number; longitude: number; address?: string; timestamp: Date } | null;
  status: "pendente" | "em_execucao" | "concluida" | "cancelada";
  plannedDate?: string;
  startedAt?: string;
  finishedAt?: string;
  estimatedDuration?: number;
  value?: number;
  finalValue?: number;
  servicesCount: number;
  services: Array<{ service: string; quantity: string; value: number }>;
}

interface Team {
  _id: string;
  name: string;
  status: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
    timestamp: Date | string;
  };
}

export default function RoadmapPage() {
  const [jobs, setJobs] = useState<RoadmapJob[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedJob, setSelectedJob] = useState<RoadmapJob | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const teamMarkersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const markerClusterRef = useRef<any>(null);
  const markersMapRef = useRef<Map<string, { marker: any; infoWindow: any }>>(new Map());
  const [updatingLocations, setUpdatingLocations] = useState(false);

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load teams with locations
      const teamsRes = await apiFetch("/teams?locations=true", { cache: "no-store" });
      const teamsData = await teamsRes.json().catch(() => null);
      if (teamsRes.ok && teamsData?.data) {
        setTeams(Array.isArray(teamsData.data) ? teamsData.data : []);
      }

      // Build query params
      const params = new URLSearchParams();
      if (selectedTeam !== "all") params.append("teamId", selectedTeam);
      if (selectedStatus !== "all") params.append("status", selectedStatus);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);

      // Load jobs
      const jobsRes = await apiFetch(`/jobs/roadmap?${params.toString()}`, { cache: "no-store" });
      const jobsData = await jobsRes.json().catch(() => null);
      
      if (jobsRes.ok && jobsData?.data) {
        const jobsList = Array.isArray(jobsData.data) ? jobsData.data : [];
        setJobs(jobsList);
      }
    } catch (err) {
      console.error("Error loading roadmap data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedTeam, selectedStatus, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (selectedTeam !== "all" && job.teamId !== selectedTeam) return false;
      if (selectedStatus !== "all" && job.status !== selectedStatus) return false;
      return true;
    });
  }, [jobs, selectedTeam, selectedStatus]);

  const validJobs = useMemo(() => {
    return filteredJobs.filter(job => job.latitude && job.longitude);
  }, [filteredJobs]);

  const stats = useMemo(() => ({
    total: jobs.length,
    pendente: jobs.filter(j => j.status === "pendente").length,
    em_execucao: jobs.filter(j => j.status === "em_execucao").length,
    concluida: jobs.filter(j => j.status === "concluida").length,
    cancelada: jobs.filter(j => j.status === "cancelada").length
  }), [jobs]);

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google || !window.google.maps) {
      console.error("Mapa ou Google Maps não disponível");
      setMapError("Google Maps não disponível");
      setMapLoading(false);
      return;
    }

    try {
      // Calculate center from jobs
      let center = { lat: -23.5505, lng: -46.6333 }; // São Paulo default
      let zoom = 10;

      if (validJobs.length > 0) {
        const avgLat = validJobs.reduce((sum, j) => sum + j.latitude, 0) / validJobs.length;
        const avgLng = validJobs.reduce((sum, j) => sum + j.longitude, 0) / validJobs.length;
        center = { lat: avgLat, lng: avgLng };
        zoom = validJobs.length === 1 ? 15 : 12;
      }

      // Initialize map
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: zoom,
        center: center,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: window.google.maps.ControlPosition.TOP_RIGHT,
          mapTypeIds: [
            window.google.maps.MapTypeId.ROADMAP,
            window.google.maps.MapTypeId.SATELLITE,
            window.google.maps.MapTypeId.HYBRID
          ]
        },
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: "all",
            elementType: "geometry",
            stylers: [{ color: "#1e293b" }]
          },
          {
            featureType: "all",
            elementType: "labels.text.fill",
            stylers: [{ color: "#f1f5f9", lightness: 100 }]
          },
          {
            featureType: "all",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#0f172a", visibility: "on" }]
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#0f172a" }]
          },
          {
            featureType: "water",
            elementType: "labels.text.fill",
            stylers: [{ color: "#cbd5e1" }]
          },
          {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#334155" }]
          },
          {
            featureType: "road",
            elementType: "labels.text.fill",
            stylers: [{ color: "#f1f5f9" }]
          },
          {
            featureType: "road",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#0f172a" }]
          },
          {
            featureType: "administrative",
            elementType: "labels.text.fill",
            stylers: [{ color: "#f1f5f9" }]
          },
          {
            featureType: "administrative",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#0f172a" }]
          },
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "transit",
            elementType: "labels.text.fill",
            stylers: [{ color: "#f1f5f9" }]
          },
          {
            featureType: "transit",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#0f172a" }]
          }
        ]
      });

      mapInstanceRef.current = map;

      // Ensure responsive height is maintained after map initialization
      if (mapRef.current) {
        // Force resize to ensure proper rendering
        setTimeout(() => {
          if (window.google && window.google.maps && mapInstanceRef.current) {
            window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
          }
        }, 100);
      }

      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      teamMarkersRef.current.forEach(marker => marker.setMap(null));
      teamMarkersRef.current = [];
      markersMapRef.current.clear();
      if (markerClusterRef.current) {
        markerClusterRef.current.clearMarkers();
      }

      // Group jobs by location (same lat/lng)
      const jobsByLocation = new Map<string, RoadmapJob[]>();
      validJobs.forEach((job) => {
        const locationKey = `${job.latitude.toFixed(6)}_${job.longitude.toFixed(6)}`;
        if (!jobsByLocation.has(locationKey)) {
          jobsByLocation.set(locationKey, []);
        }
        jobsByLocation.get(locationKey)!.push(job);
      });

      // Create markers - one per location
      const markers: any[] = [];
      jobsByLocation.forEach((jobsAtLocation, locationKey) => {
        const [lat, lng] = locationKey.split('_').map(Number);
        const isMultiple = jobsAtLocation.length > 1;
        
        // Determine marker color based on jobs at this location
        // Priority: red (cancelada) > yellow (pendente) > blue (em_execucao) > green (concluida)
        let markerColor = "#6b7280";
        const statusPriority: Record<string, number> = {
          cancelada: 4,
          pendente: 3,
          em_execucao: 2,
          concluida: 1
        };
        
        const highestPriorityJob = jobsAtLocation.reduce((prev, current) => {
          const prevPriority = statusPriority[prev.status] || 0;
          const currentPriority = statusPriority[current.status] || 0;
          return currentPriority > prevPriority ? current : prev;
        });

        const colors: Record<string, string> = {
          pendente: "#fbbf24",
          em_execucao: "#3b82f6",
          concluida: "#10b981",
          cancelada: "#ef4444"
        };
        markerColor = colors[highestPriorityJob.status] || "#6b7280";

        // Create marker icon - show count if multiple jobs
        let markerIconUrl: string;
        if (isMultiple) {
          markerIconUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 2C12.96 2 7 7.96 7 15c0 10 13 23 13 23s13-13 13-23c0-7.04-5.96-13-13-13z" fill="${markerColor}" stroke="white" stroke-width="2"/>
              <circle cx="20" cy="15" r="6" fill="white"/>
              <text x="20" y="19" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="${markerColor}" text-anchor="middle">${jobsAtLocation.length}</text>
            </svg>
          `)}`;
        } else {
          markerIconUrl = getMarkerIcon(highestPriorityJob.status);
        }

        const marker = new window.google.maps.Marker({
          position: { lat, lng },
          map: map,
          icon: {
            url: markerIconUrl,
            scaledSize: isMultiple ? new window.google.maps.Size(40, 40) : new window.google.maps.Size(32, 32),
            anchor: isMultiple ? new window.google.maps.Point(20, 40) : new window.google.maps.Point(16, 32)
          },
          title: isMultiple ? `${jobsAtLocation.length} OS neste local` : jobsAtLocation[0].title
        });

        // Create info window content - show all jobs if multiple
        let infoWindowContent: string;
        if (isMultiple) {
          const statusCounts: Record<string, number> = {};
          jobsAtLocation.forEach(job => {
            statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
          });
          
          const statusSummary = Object.entries(statusCounts)
            .map(([status, count]) => `${count} ${getStatusLabel(status)}`)
            .join(', ');

          infoWindowContent = `
            <div style="min-width: 250px; max-width: 400px; font-family: system-ui, -apple-system, sans-serif; color: #1e293b;">
              <div style="font-weight: bold; margin-bottom: 8px; color: #1e293b; font-size: 14px;">
                ${jobsAtLocation.length} OS neste local
              </div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 12px;">
                ${statusSummary}
              </div>
              <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px;">
                <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;"><strong>Local:</strong> ${jobsAtLocation[0].site}</div>
                <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;"><strong>Cliente:</strong> ${jobsAtLocation[0].clientName}</div>
                <div style="max-height: 300px; overflow-y: auto; space-y: 4px;">
                  ${jobsAtLocation.map((job, idx) => `
                    <div style="border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px; margin-bottom: 6px; background: #f8fafc;">
                      <div style="font-weight: 600; font-size: 12px; color: #1e293b; margin-bottom: 4px;">${job.title}</div>
                      ${job.seq ? `<div style="font-size: 10px; color: #64748b; margin-bottom: 4px;">OS #${job.seq}</div>` : ''}
                      <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                        <span style="padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500; ${getStatusColor(job.status).includes('yellow') ? 'background: rgba(251, 191, 36, 0.2); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.5);' : getStatusColor(job.status).includes('blue') ? 'background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.5);' : getStatusColor(job.status).includes('green') ? 'background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.5);' : 'background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.5);'}">
                          ${getStatusLabel(job.status)}
                        </span>
                        ${job.plannedDate ? `<span style="font-size: 10px; color: #64748b;">${formatDate(job.plannedDate)}</span>` : ''}
                        ${job.finalValue ? `<span style="font-size: 10px; color: #10b981; font-weight: 600;">${formatCurrency(job.finalValue)}</span>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `;
        } else {
          const job = jobsAtLocation[0];
          infoWindowContent = `
            <div style="min-width: 200px; font-family: system-ui, -apple-system, sans-serif; color: #1e293b;">
              <div style="font-weight: bold; margin-bottom: 8px; color: #1e293b;">${job.title}</div>
              ${job.seq ? `<div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">OS #${job.seq}</div>` : ''}
              <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px; font-size: 12px; color: #475569;">
                <div style="margin-bottom: 4px;"><strong>Cliente:</strong> ${job.clientName}</div>
                <div style="margin-bottom: 4px;"><strong>Local:</strong> ${job.site}</div>
                <div style="margin-bottom: 4px;"><strong>Equipe:</strong> ${job.team}</div>
                <div style="margin: 8px 0;">
                  <span style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; display: inline-block; ${getStatusColor(job.status).includes('yellow') ? 'background: rgba(251, 191, 36, 0.2); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.5);' : getStatusColor(job.status).includes('blue') ? 'background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.5);' : getStatusColor(job.status).includes('green') ? 'background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.5);' : 'background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.5);'}">
                    ${getStatusLabel(job.status)}
                  </span>
                </div>
                ${job.plannedDate ? `<div style="margin-top: 4px;"><strong>Data:</strong> ${formatDate(job.plannedDate)}</div>` : ''}
                ${job.finalValue ? `<div style="margin-top: 4px;"><strong>Valor:</strong> ${formatCurrency(job.finalValue)}</div>` : ''}
              </div>
            </div>
          `;
        }

        const infoWindow = new window.google.maps.InfoWindow({
          content: infoWindowContent
        });

        marker.addListener('click', () => {
          if (infoWindowRef.current) {
            infoWindowRef.current.close();
          }
          infoWindow.open(map, marker);
          infoWindowRef.current = infoWindow;
          // If single job, set as selected; if multiple, show first one or let user click individual jobs
          if (!isMultiple) {
            setSelectedJob(jobsAtLocation[0]);
          }
        });

        markers.push(marker);
        markersRef.current.push(marker);
        
        // Store all jobs for this location
        jobsAtLocation.forEach(job => {
          markersMapRef.current.set(job._id, { marker, infoWindow });
        });
      });

      // Group teams by location (same lat/lng)
      const teamsByLocation = new Map<string, Team[]>();
      teams.forEach((team) => {
        if (!team.currentLocation?.latitude || !team.currentLocation?.longitude) {
          console.log(`[Roadmap] Skipping team ${team.name} - no location`);
          return;
        }
        const locationKey = `${team.currentLocation.latitude.toFixed(6)}_${team.currentLocation.longitude.toFixed(6)}`;
        if (!teamsByLocation.has(locationKey)) {
          teamsByLocation.set(locationKey, []);
        }
        teamsByLocation.get(locationKey)!.push(team);
      });

      console.log(`[Roadmap] Total teams loaded: ${teams.length}`);
      console.log(`[Roadmap] Teams with location: ${Array.from(teamsByLocation.values()).flat().length}`);
      console.log(`[Roadmap] Unique locations: ${teamsByLocation.size}`);

      // Add team location markers - one per location
      teamsByLocation.forEach((teamsAtLocation, locationKey) => {
        const [lat, lng] = locationKey.split('_').map(Number);
        const isMultiple = teamsAtLocation.length > 1;
        
        // Create marker icon - show count if multiple teams
        let teamIconUrl: string;
        if (isMultiple) {
          teamIconUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#8b5cf6" stroke="white" stroke-width="3"/>
              <circle cx="20" cy="20" r="8" fill="white"/>
              <text x="20" y="24" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#8b5cf6" text-anchor="middle">${teamsAtLocation.length}</text>
            </svg>
          `)}`;
        } else {
          teamIconUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="#8b5cf6" stroke="white" stroke-width="3"/>
              <text x="20" y="26" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">👥</text>
            </svg>
          `)}`;
        }

        const teamMarker = new window.google.maps.Marker({
          position: { lat, lng },
          map: map,
          icon: {
            url: teamIconUrl,
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 20)
          },
          title: isMultiple ? `${teamsAtLocation.length} equipes neste local` : `Equipe: ${teamsAtLocation[0].name}`,
          zIndex: 1000 // Show team markers above job markers
        });

        // Create info window content - show all teams if multiple
        let teamInfoWindowContent: string;
        if (isMultiple) {
          teamInfoWindowContent = `
            <div style="min-width: 250px; max-width: 400px; font-family: system-ui, -apple-system, sans-serif; color: #1e293b;">
              <div style="font-weight: bold; margin-bottom: 8px; color: #8b5cf6; font-size: 14px;">
                👥 ${teamsAtLocation.length} Equipes neste local
              </div>
              ${teamsAtLocation[0].currentLocation?.address ? `
                <div style="font-size: 11px; color: #64748b; margin-bottom: 12px;">
                  <strong>Endereço:</strong> ${teamsAtLocation[0].currentLocation.address}
                </div>
              ` : ''}
              <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px;">
                <div style="max-height: 300px; overflow-y: auto;">
                  ${teamsAtLocation.map((team) => {
                    const timestamp = new Date(team.currentLocation!.timestamp);
                    const timeAgo = Math.floor((Date.now() - timestamp.getTime()) / 1000 / 60);
                    let timeText = "";
                    if (timeAgo < 1) {
                      timeText = "Agora mesmo";
                    } else if (timeAgo < 60) {
                      timeText = `${timeAgo} minuto${timeAgo > 1 ? "s" : ""} atrás`;
                    } else {
                      const hoursAgo = Math.floor(timeAgo / 60);
                      timeText = `${hoursAgo} hora${hoursAgo > 1 ? "s" : ""} atrás`;
                    }
                    
                    return `
                      <div style="border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px; margin-bottom: 6px; background: #f8fafc;">
                        <div style="font-weight: 600; font-size: 12px; color: #1e293b; margin-bottom: 4px;">${team.name}</div>
                        <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap;">
                          <span style="padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500; background: ${team.status === "ativa" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}; color: ${team.status === "ativa" ? "#10b981" : "#ef4444"}; border: 1px solid ${team.status === "ativa" ? "rgba(16, 185, 129, 0.5)" : "rgba(239, 68, 68, 0.5)"};">
                            ${team.status === "ativa" ? "Ativa" : "Inativa"}
                          </span>
                          <span style="font-size: 10px; color: #64748b;">📍 ${timeText}</span>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          `;
        } else {
          const team = teamsAtLocation[0];
          const timestamp = new Date(team.currentLocation!.timestamp);
          const timeAgo = Math.floor((Date.now() - timestamp.getTime()) / 1000 / 60);
          let timeText = "";
          if (timeAgo < 1) {
            timeText = "Agora mesmo";
          } else if (timeAgo < 60) {
            timeText = `${timeAgo} minuto${timeAgo > 1 ? "s" : ""} atrás`;
          } else {
            const hoursAgo = Math.floor(timeAgo / 60);
            timeText = `${hoursAgo} hora${hoursAgo > 1 ? "s" : ""} atrás`;
          }

          teamInfoWindowContent = `
            <div style="min-width: 200px; font-family: system-ui, -apple-system, sans-serif; color: #1e293b;">
              <div style="font-weight: bold; margin-bottom: 8px; color: #8b5cf6; font-size: 14px;">
                👥 ${team.name}
              </div>
              <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px; font-size: 12px; color: #475569;">
                <div style="margin-bottom: 4px;"><strong>Status:</strong> ${team.status === "ativa" ? "Ativa" : "Inativa"}</div>
                ${team.currentLocation?.address ? `<div style="margin-bottom: 4px;"><strong>Endereço:</strong> ${team.currentLocation.address}</div>` : ''}
                <div style="margin-top: 8px; font-size: 11px; color: #64748b;">
                  📍 Atualizado: ${timeText}
                </div>
              </div>
            </div>
          `;
        }

        const teamInfoWindow = new window.google.maps.InfoWindow({
          content: teamInfoWindowContent
        });

        teamMarker.addListener('click', () => {
          if (infoWindowRef.current) {
            infoWindowRef.current.close();
          }
          teamInfoWindow.open(map, teamMarker);
          infoWindowRef.current = teamInfoWindow;
        });

        teamMarkersRef.current.push(teamMarker);
      });

      // All markers are already added to the map via the map property
      // If you want clustering, you can add the MarkerClusterer library later

      setMapLoading(false);
    } catch (err: any) {
      console.error("Erro ao inicializar mapa:", err);
      setMapError(`Erro ao inicializar mapa: ${err.message}`);
      setMapLoading(false);
    }
  }, [validJobs, teams]);

  // Load Google Maps script
  useEffect(() => {
    if (!googleMapsApiKey) {
      setMapError("Google Maps API Key não configurada");
      setMapLoading(false);
      return;
    }

    const loadAndInitialize = () => {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps && typeof window.google.maps.Map === "function") {
        initializeMap();
        return;
      }

      // Check if script already exists
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
      if (existingScript) {
        // Wait for it to load
        let attempts = 0;
        const maxAttempts = 100;
        
        const checkInterval = setInterval(() => {
          if (window.google && window.google.maps && typeof window.google.maps.Map === "function") {
            clearInterval(checkInterval);
            initializeMap();
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            setMapError("Timeout ao carregar Google Maps");
            setMapLoading(false);
          }
          attempts++;
        }, 100);

        return () => clearInterval(checkInterval);
      }

      // Create new script
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        setTimeout(() => {
          initializeMap();
        }, 500);
      };

      script.onerror = () => {
        setMapError("Falha ao carregar Google Maps. Verifique sua conexão e API key.");
        setMapLoading(false);
      };

      document.head.appendChild(script);
    };

    // Wait for mapRef to be available
    const waitForMapRef = (callback: () => void) => {
      let attempts = 0;
      const maxAttempts = 50;
      const checkInterval = setInterval(() => {
        if (mapRef.current) {
          clearInterval(checkInterval);
          callback();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          setMapError("Erro ao inicializar container do mapa");
          setMapLoading(false);
        }
        attempts++;
      }, 100);
    };

    waitForMapRef(loadAndInitialize);
  }, [googleMapsApiKey, initializeMap]);

  // Update team locations
  const updateTeamLocations = useCallback(async () => {
    setUpdatingLocations(true);
    try {
      // Reload teams with locations
      const teamsRes = await apiFetch("/teams?locations=true", { cache: "no-store" });
      const teamsData = await teamsRes.json().catch(() => null);
      if (teamsRes.ok && teamsData?.data) {
        setTeams(Array.isArray(teamsData.data) ? teamsData.data : []);
        // Reinitialize map to update team markers
        if (mapInstanceRef.current) {
          initializeMap();
        }
      }
    } catch (err) {
      console.error("Error updating team locations:", err);
    } finally {
      setUpdatingLocations(false);
    }
  }, [initializeMap]);

  // Update markers when jobs change
  useEffect(() => {
    if (mapInstanceRef.current && window.google && window.google.maps) {
      initializeMap();
    }
  }, [validJobs, initializeMap]);

  // Function to navigate to a job on the map
  const navigateToJob = useCallback((job: RoadmapJob) => {
    if (!mapInstanceRef.current || !job.latitude || !job.longitude) return;

    const jobMarker = markersMapRef.current.get(job._id);
    
    if (jobMarker) {
      // Center map on job location
      mapInstanceRef.current.setCenter({ lat: job.latitude, lng: job.longitude });
      mapInstanceRef.current.setZoom(15);
      
      // Close any open info window
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
      
      // Check if there are multiple jobs at this location
      const locationKey = `${job.latitude.toFixed(6)}_${job.longitude.toFixed(6)}`;
      const jobsAtLocation = validJobs.filter(j => 
        j.latitude && j.longitude && 
        `${j.latitude.toFixed(6)}_${j.longitude.toFixed(6)}` === locationKey
      );
      
      if (jobsAtLocation.length > 1) {
        // Recreate info window with all jobs at this location
        const statusCounts: Record<string, number> = {};
        jobsAtLocation.forEach(j => {
          statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
        });
        
        const statusSummary = Object.entries(statusCounts)
          .map(([status, count]) => `${count} ${getStatusLabel(status)}`)
          .join(', ');

        const infoWindowContent = `
          <div style="min-width: 250px; max-width: 400px; font-family: system-ui, -apple-system, sans-serif; color: #1e293b;">
            <div style="font-weight: bold; margin-bottom: 8px; color: #1e293b; font-size: 14px;">
              ${jobsAtLocation.length} OS neste local
            </div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 12px;">
              ${statusSummary}
            </div>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px;">
              <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;"><strong>Local:</strong> ${job.site}</div>
              <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;"><strong>Cliente:</strong> ${job.clientName}</div>
              <div style="max-height: 300px; overflow-y: auto;">
                ${jobsAtLocation.map((j) => `
                  <div style="border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px; margin-bottom: 6px; background: ${j._id === job._id ? '#eff6ff' : '#f8fafc'};">
                    <div style="font-weight: 600; font-size: 12px; color: #1e293b; margin-bottom: 4px;">${j.title}</div>
                    ${j.seq ? `<div style="font-size: 10px; color: #64748b; margin-bottom: 4px;">OS #${j.seq}</div>` : ''}
                    <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap;">
                      <span style="padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500; ${getStatusColor(j.status).includes('yellow') ? 'background: rgba(251, 191, 36, 0.2); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.5);' : getStatusColor(j.status).includes('blue') ? 'background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.5);' : getStatusColor(j.status).includes('green') ? 'background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.5);' : 'background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.5);'}">
                        ${getStatusLabel(j.status)}
                      </span>
                      ${j.plannedDate ? `<span style="font-size: 10px; color: #64748b;">${formatDate(j.plannedDate)}</span>` : ''}
                      ${j.finalValue ? `<span style="font-size: 10px; color: #10b981; font-weight: 600;">${formatCurrency(j.finalValue)}</span>` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
        
        const newInfoWindow = new window.google.maps.InfoWindow({
          content: infoWindowContent
        });
        
        newInfoWindow.open(mapInstanceRef.current, jobMarker.marker);
        infoWindowRef.current = newInfoWindow;
      } else {
        // Single job - open normal info window
        jobMarker.infoWindow.open(mapInstanceRef.current, jobMarker.marker);
        infoWindowRef.current = jobMarker.infoWindow;
      }
      
      setSelectedJob(job);
    } else {
      // If marker not found, just center the map
      mapInstanceRef.current.setCenter({ lat: job.latitude, lng: job.longitude });
      mapInstanceRef.current.setZoom(15);
      setSelectedJob(job);
    }
  }, [validJobs]);

  // Function to navigate to a team on the map
  const navigateToTeam = useCallback((team: Team) => {
    if (!mapInstanceRef.current || !team.currentLocation?.latitude || !team.currentLocation?.longitude) return;

    // Center map on team location
    mapInstanceRef.current.setCenter({ lat: team.currentLocation.latitude, lng: team.currentLocation.longitude });
    mapInstanceRef.current.setZoom(15);
    
    // Close any open info window
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
    
    // Find the team marker and open its info window
    // Since teams might be grouped by location, we need to find the marker
    const locationKey = `${team.currentLocation.latitude.toFixed(6)}_${team.currentLocation.longitude.toFixed(6)}`;
    
    // Find marker for this location
    const marker = teamMarkersRef.current.find((m: any) => {
      const pos = m.getPosition();
      const markerKey = `${pos.lat().toFixed(6)}_${pos.lng().toFixed(6)}`;
      return markerKey === locationKey;
    });
    
    if (marker) {
      // Get all teams at this location
      const teamsAtLocation = teams.filter(t => 
        t.currentLocation?.latitude && t.currentLocation?.longitude &&
        `${t.currentLocation.latitude.toFixed(6)}_${t.currentLocation.longitude.toFixed(6)}` === locationKey
      );
      
      if (teamsAtLocation.length > 1) {
        // Create info window with all teams
        const teamInfoWindowContent = `
          <div style="min-width: 250px; max-width: 400px; font-family: system-ui, -apple-system, sans-serif; color: #1e293b;">
            <div style="font-weight: bold; margin-bottom: 8px; color: #8b5cf6; font-size: 14px;">
              👥 ${teamsAtLocation.length} Equipes neste local
            </div>
            ${teamsAtLocation[0].currentLocation?.address ? `
              <div style="font-size: 11px; color: #64748b; margin-bottom: 12px;">
                <strong>Endereço:</strong> ${teamsAtLocation[0].currentLocation.address}
              </div>
            ` : ''}
            <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px;">
              <div style="max-height: 300px; overflow-y: auto;">
                ${teamsAtLocation.map((t) => {
                  const timestamp = new Date(t.currentLocation!.timestamp);
                  const timeAgo = Math.floor((Date.now() - timestamp.getTime()) / 1000 / 60);
                  let timeText = "";
                  if (timeAgo < 1) {
                    timeText = "Agora mesmo";
                  } else if (timeAgo < 60) {
                    timeText = `${timeAgo} minuto${timeAgo > 1 ? "s" : ""} atrás`;
                  } else {
                    const hoursAgo = Math.floor(timeAgo / 60);
                    timeText = `${hoursAgo} hora${hoursAgo > 1 ? "s" : ""} atrás`;
                  }
                  
                  return `
                    <div style="border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px; margin-bottom: 6px; background: ${t._id === team._id ? '#eff6ff' : '#f8fafc'};">
                      <div style="font-weight: 600; font-size: 12px; color: #1e293b; margin-bottom: 4px;">${t.name}</div>
                      <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap;">
                        <span style="padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500; background: ${t.status === "ativa" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}; color: ${t.status === "ativa" ? "#10b981" : "#ef4444"}; border: 1px solid ${t.status === "ativa" ? "rgba(16, 185, 129, 0.5)" : "rgba(239, 68, 68, 0.5)"};">
                          ${t.status === "ativa" ? "Ativa" : "Inativa"}
                        </span>
                        <span style="font-size: 10px; color: #64748b;">📍 ${timeText}</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        `;
        
        const newInfoWindow = new window.google.maps.InfoWindow({
          content: teamInfoWindowContent
        });
        
        newInfoWindow.open(mapInstanceRef.current, marker);
        infoWindowRef.current = newInfoWindow;
      } else {
        // Single team - trigger click on marker to open its info window
        window.google.maps.event.trigger(marker, 'click');
      }
    }
  }, [teams]);

  // Filter teams with locations
  const teamsWithLocation = useMemo(() => {
    return teams.filter(t => t.currentLocation?.latitude && t.currentLocation?.longitude);
  }, [teams]);

  if (!googleMapsApiKey) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
          <div className="text-red-300 font-semibold">Google Maps API Key não configurada</div>
          <div className="text-sm text-red-200 mt-2">
            Configure a variável de ambiente VITE_GOOGLE_MAPS_API_KEY no arquivo .env
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Roadmap de OS</h1>
          <p className="text-sm text-slate-400 mt-1">
            Visualize todas as Ordens de Serviço em um mapa interativo
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={updateTeamLocations}
            disabled={updatingLocations}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg border border-purple-500/50 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {updatingLocations ? (
              <>
                <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="hidden sm:inline">Atualizando...</span>
                <span className="sm:hidden">Atualizando</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Atualizar Localizações</span>
                <span className="sm:hidden">Atualizar</span>
              </>
            )}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition flex items-center justify-center gap-2 text-sm"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="rounded-lg border border-white/10 bg-white/5 p-2 sm:p-3">
          <div className="text-xs text-slate-400 uppercase">Total</div>
          <div className="text-lg sm:text-xl font-bold text-white">{stats.total}</div>
        </div>
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-2 sm:p-3">
          <div className="text-xs text-yellow-300 uppercase">Pendente</div>
          <div className="text-lg sm:text-xl font-bold text-yellow-300">{stats.pendente}</div>
        </div>
        <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-2 sm:p-3">
          <div className="text-xs text-blue-300 uppercase">Em Execução</div>
          <div className="text-lg sm:text-xl font-bold text-blue-300">{stats.em_execucao}</div>
        </div>
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-2 sm:p-3">
          <div className="text-xs text-green-300 uppercase">Concluída</div>
          <div className="text-lg sm:text-xl font-bold text-green-300">{stats.concluida}</div>
        </div>
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-2 sm:p-3 col-span-2 lg:col-span-1">
          <div className="text-xs text-red-300 uppercase">Cancelada</div>
          <div className="text-lg sm:text-xl font-bold text-red-300">{stats.cancelada}</div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-2">Equipe</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900 text-white text-sm"
              >
                <option value="all">Todas as equipes</option>
                {teams.map(team => (
                  <option key={team._id} value={team._id}>{team.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900 text-white text-sm"
              >
                <option value="all">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="em_execucao">Em Execução</option>
                <option value="concluida">Concluída</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-2">Data Inicial</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-2">Data Final</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900 text-white text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedTeam("all");
                setSelectedStatus("all");
                setDateFrom("");
                setDateTo("");
              }}
              className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition text-sm"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 overflow-hidden relative">
        <div ref={mapRef} className="w-full h-[400px] sm:h-[400px] md:h-[450px] lg:h-[500px] xl:h-[600px] min-h-[300px]" />
        {mapLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
            <div className="text-slate-400">Carregando mapa...</div>
          </div>
        )}
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
            <div className="text-center">
              <div className="text-red-300 font-semibold mb-2">Erro ao carregar mapa</div>
              <div className="text-sm text-red-200">{mapError}</div>
            </div>
          </div>
        )}
        {!loading && validJobs.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
            <div className="text-center">
              <div className="text-slate-400 mb-2">Nenhuma OS encontrada</div>
              <div className="text-sm text-slate-500">Ajuste os filtros para ver mais resultados</div>
            </div>
          </div>
        )}
      </div>

      {/* Job List - Always visible */}
      <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-white">Lista de OS ({filteredJobs.length})</h2>
          <div className="text-xs text-slate-400 hidden sm:block">Clique em uma OS para ver no mapa</div>
        </div>
        <div className="space-y-2 max-h-48 sm:max-h-64 md:max-h-72 lg:max-h-96 overflow-y-auto">
          {filteredJobs.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              Nenhuma OS encontrada com os filtros aplicados
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div
                key={job._id}
                onClick={() => {
                  if (job.latitude && job.longitude) {
                    navigateToJob(job);
                  } else {
                    setSelectedJob(job);
                  }
                }}
                className={`rounded-lg border p-2 sm:p-3 cursor-pointer transition ${
                  job.latitude && job.longitude
                    ? "border-white/10 bg-white/5 hover:bg-white/10 hover:border-emerald-400/50"
                    : "border-white/5 bg-white/5 opacity-60"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-white text-xs sm:text-sm truncate">{job.title}</div>
                      {job.latitude && job.longitude && (
                        <svg className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </div>
                    {job.seq && <div className="text-xs text-slate-400 mt-0.5">OS #{job.seq}</div>}
                    <div className="text-xs text-slate-400 mt-1 truncate">{job.clientName}</div>
                    <div className="text-xs text-slate-400 truncate">{job.site}</div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${getStatusColor(job.status)}`}>
                        {getStatusLabel(job.status)}
                      </span>
                      <span className="text-xs text-slate-400 truncate">{job.team}</span>
                      {job.plannedDate && (
                        <span className="text-xs text-slate-500 hidden sm:inline">• {formatDate(job.plannedDate)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 sm:gap-1">
                    {job.finalValue && (
                      <div className="text-xs sm:text-sm font-semibold text-emerald-300">
                        {formatCurrency(job.finalValue)}
                      </div>
                    )}
                    {job.latitude && job.longitude ? (
                      <div className="text-xs text-emerald-400 font-medium">📍 Ver no mapa</div>
                    ) : (
                      <div className="text-xs text-slate-500">Sem localização</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelectedJob(null)}>
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-white/10 p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-lg sm:text-xl font-bold text-white">{selectedJob.title}</div>
                  {selectedJob.seq && <div className="text-sm text-slate-400 mt-1">OS #{selectedJob.seq}</div>}
                </div>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-400 uppercase mb-1">Cliente</div>
                  <div className="text-sm font-semibold text-white">{selectedJob.clientName}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-400 uppercase mb-1">Local</div>
                  <div className="text-sm font-semibold text-white">{selectedJob.site}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-400 uppercase mb-1">Equipe</div>
                  <div className="text-sm font-semibold text-white">{selectedJob.team}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-400 uppercase mb-1">Status</div>
                  <div>
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(selectedJob.status)}`}>
                      {getStatusLabel(selectedJob.status)}
                    </span>
                  </div>
                </div>
                {selectedJob.plannedDate && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-slate-400 uppercase mb-1">Data Planejada</div>
                    <div className="text-sm font-semibold text-white">{formatDate(selectedJob.plannedDate)}</div>
                  </div>
                )}
                {selectedJob.estimatedDuration && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-slate-400 uppercase mb-1">Duração Estimada</div>
                    <div className="text-sm font-semibold text-white">{Math.round(selectedJob.estimatedDuration / 60)}h {selectedJob.estimatedDuration % 60}min</div>
                  </div>
                )}
              </div>
              {selectedJob.services && selectedJob.services.length > 0 && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="text-sm font-semibold text-white mb-3">Serviços ({selectedJob.services.length})</div>
                  <div className="space-y-2">
                    {selectedJob.services.map((service, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <div>
                          <div className="text-white">{service.service}</div>
                          {service.quantity && <div className="text-xs text-slate-400">Quantidade: {service.quantity}</div>}
                        </div>
                        {service.value > 0 && (
                          <div className="text-emerald-300 font-semibold">{formatCurrency(service.value)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedJob.finalValue && (
                <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-4">
                  <div className="text-sm text-emerald-300 uppercase mb-1">Valor Total</div>
                  <div className="text-2xl font-bold text-emerald-300">{formatCurrency(selectedJob.finalValue)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team List - Always visible */}
      <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-white">Localizações das Equipes ({teamsWithLocation.length})</h2>
          <div className="text-xs text-slate-400 hidden sm:block">Clique em uma equipe para ver no mapa</div>
        </div>
        <div className="space-y-2 max-h-48 sm:max-h-64 md:max-h-72 lg:max-h-96 overflow-y-auto">
          {teamsWithLocation.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              Nenhuma equipe com localização disponível
            </div>
          ) : (
            teamsWithLocation.map((team) => {
              const timestamp = new Date(team.currentLocation!.timestamp);
              const timeAgo = Math.floor((Date.now() - timestamp.getTime()) / 1000 / 60);
              let timeText = "";
              if (timeAgo < 1) {
                timeText = "Agora mesmo";
              } else if (timeAgo < 60) {
                timeText = `${timeAgo} minuto${timeAgo > 1 ? "s" : ""} atrás`;
              } else {
                const hoursAgo = Math.floor(timeAgo / 60);
                timeText = `${hoursAgo} hora${hoursAgo > 1 ? "s" : ""} atrás`;
              }

              return (
                <div
                  key={team._id}
                  onClick={() => navigateToTeam(team)}
                  className="rounded-lg border border-purple-500/50 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-400/50 p-2 sm:p-3 cursor-pointer transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold text-white text-xs sm:text-sm truncate">👥 {team.name}</div>
                        <svg className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      {team.currentLocation?.address && (
                        <div className="text-xs text-slate-400 mt-1 line-clamp-2">{team.currentLocation.address}</div>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${
                          team.status === "ativa" 
                            ? "bg-green-500/20 text-green-300 border-green-500/50" 
                            : "bg-red-500/20 text-red-300 border-red-500/50"
                        }`}>
                          {team.status === "ativa" ? "Ativa" : "Inativa"}
                        </span>
                        <span className="text-xs text-slate-400">📍 {timeText}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
