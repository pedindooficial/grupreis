import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api-client";

interface TeamAvailability {
  teamId: string;
  teamName: string;
  availability: Record<string, Array<{
    startTime: string;
    endTime: string;
    duration: number;
    jobId: string;
    status: string;
  }>>;
}

interface TeamAvailabilityCalendarProps {
  dateFrom?: string;
  dateTo?: string;
}

interface JobDetail {
  _id: string;
  title: string;
  seq?: number;
  clientName?: string;
  site?: string;
  status: string;
  plannedDate?: string;
  estimatedDuration?: number;
  value?: number;
  finalValue?: number;
}

interface TeamLocation {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: Date | string;
}

export default function TeamAvailabilityCalendar({ dateFrom, dateTo }: TeamAvailabilityCalendarProps) {
  const [availability, setAvailability] = useState<TeamAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [selectedDay, setSelectedDay] = useState<{ teamId: string; teamName: string; date: string } | null>(null);
  const [dayJobs, setDayJobs] = useState<JobDetail[]>([]);
  const [teamLocation, setTeamLocation] = useState<TeamLocation | null>(null);
  const [loadingDayDetails, setLoadingDayDetails] = useState(false);

  // Generate date range for calendar
  const calendarDates = useMemo(() => {
    const dates: string[] = [];
    const start = dateFrom ? new Date(dateFrom) : new Date();
    const end = dateTo ? new Date(dateTo) : new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
    
    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [dateFrom, dateTo]);

  useEffect(() => {
    const loadAvailability = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        
        // In day view, use selectedDate; otherwise use dateFrom/dateTo from props
        if (viewMode === "day" && selectedDate) {
          params.append("dateFrom", selectedDate);
          params.append("dateTo", selectedDate);
        } else {
          if (dateFrom) params.append("dateFrom", dateFrom);
          if (dateTo) params.append("dateTo", dateTo);
        }
        
        const res = await apiFetch(`/jobs/team-availability?${params.toString()}`, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        
        if (res.ok && data?.data) {
          setAvailability(Array.isArray(data.data) ? data.data : []);
        } else {
          console.error("Error loading team availability:", data?.error || "Unknown error");
          setAvailability([]);
        }
      } catch (err) {
        console.error("Error loading team availability:", err);
        setAvailability([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadAvailability();
  }, [dateFrom, dateTo, viewMode, selectedDate]);

  const formatTime = (timeString: string): string => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      // Parse date string directly to avoid timezone issues
      // dateString is in format YYYY-MM-DD
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
    } catch {
      return dateString;
    }
  };

  const getTimeSlots = (date: string, teamAvailability: TeamAvailability) => {
    const dayJobs = teamAvailability.availability[date] || [];
    const slots: Array<{ time: string; busy: boolean; jobId?: string; status?: string }> = [];
    
    // Generate time slots from 6:00 to 20:00 (every 30 minutes)
    for (let hour = 6; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        const slotTime = new Date(`${date}T${timeString}:00`);
        
        // Check if this time slot is busy
        const isBusy = dayJobs.some(job => {
          const jobStart = new Date(job.startTime);
          const jobEnd = new Date(job.endTime);
          return slotTime >= jobStart && slotTime < jobEnd;
        });
        
        const busyJob = dayJobs.find(job => {
          const jobStart = new Date(job.startTime);
          const jobEnd = new Date(job.endTime);
          return slotTime >= jobStart && slotTime < jobEnd;
        });
        
        slots.push({
          time: timeString,
          busy: isBusy,
          jobId: busyJob?.jobId,
          status: busyJob?.status
        });
      }
    }
    
    return slots;
  };

  const getBusyRanges = (date: string, teamAvailability: TeamAvailability): Array<{
    start: string;
    end: string;
    duration: number;
    status: string;
    jobId: string;
  }> => {
    // Ensure date is in YYYY-MM-DD format for matching
    const dateKey = date.split('T')[0];
    const dayJobs = teamAvailability.availability[dateKey] || [];
    return dayJobs.map(job => ({
      start: formatTime(job.startTime),
      end: formatTime(job.endTime),
      duration: job.duration,
      status: job.status,
      jobId: job.jobId
    }));
  };

  const handleDayClick = async (teamId: string, teamName: string, date: string) => {
    const dateKey = date.split('T')[0];
    setSelectedDay({ teamId, teamName, date: dateKey });
    setLoadingDayDetails(true);
    
    try {
      // Fetch jobs for this team and date (include jobs without location for modal)
      const jobsParams = new URLSearchParams();
      jobsParams.append("teamId", teamId);
      jobsParams.append("dateFrom", dateKey);
      jobsParams.append("dateTo", dateKey);
      jobsParams.append("includeWithoutLocation", "true");
      
      const jobsRes = await apiFetch(`/jobs/roadmap?${jobsParams.toString()}`, { cache: "no-store" });
      const jobsData = await jobsRes.json().catch(() => null);
      
      if (jobsRes.ok && jobsData?.data) {
        setDayJobs(Array.isArray(jobsData.data) ? jobsData.data : []);
      } else {
        setDayJobs([]);
      }
      
      // Fetch team location
      const teamRes = await apiFetch(`/teams/${teamId}/location`, { cache: "no-store" });
      const teamData = await teamRes.json().catch(() => null);
      
      if (teamRes.ok && teamData?.data) {
        setTeamLocation(teamData.data);
      } else {
        setTeamLocation(null);
      }
    } catch (err) {
      console.error("Error loading day details:", err);
      setDayJobs([]);
      setTeamLocation(null);
    } finally {
      setLoadingDayDetails(false);
    }
  };

  const formatCurrency = (value?: number): string => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateString;
    }
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

  // Normalize dates to YYYY-MM-DD format
  const datesToShow = useMemo(() => {
    if (viewMode === "day") {
      // Ensure selectedDate is in YYYY-MM-DD format
      const normalized = selectedDate.split('T')[0];
      return [normalized];
    }
    return calendarDates.map(d => d.split('T')[0]);
  }, [viewMode, selectedDate, calendarDates]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-white">Disponibilidade das Equipes</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("week")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              viewMode === "week"
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/50"
                : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setViewMode("day")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              viewMode === "day"
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/50"
                : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
            }`}
          >
            Dia
          </button>
        </div>
      </div>

      {viewMode === "day" && (
        <div className="mb-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-white/10 bg-slate-900 text-white text-sm"
          />
        </div>
      )}

      {loading && (
        <div className="text-center text-slate-400 py-2 text-sm">Carregando disponibilidade...</div>
      )}

      <div className="space-y-4 overflow-x-auto">
        {availability.map((team) => (
          <div key={team.teamId} className="min-w-0">
            <div className="text-sm font-semibold text-white mb-2">{team.teamName}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-2">
              {datesToShow.map((date) => {
                // Ensure date is in YYYY-MM-DD format
                const dateKey = date.split('T')[0];
                const busyRanges = getBusyRanges(dateKey, team);
                const hasJobs = busyRanges.length > 0;
                
                return (
                  <div
                    key={dateKey}
                    onClick={() => handleDayClick(team.teamId, team.teamName, dateKey)}
                    className="rounded-lg border border-white/10 bg-slate-900/50 p-2 min-w-[140px] cursor-pointer hover:border-emerald-400/50 hover:bg-slate-800/50 transition"
                  >
                    <div className="text-xs font-medium text-slate-300 mb-2 text-center">
                      {formatDate(dateKey)}
                    </div>
                    {hasJobs ? (
                      <div className="space-y-1">
                        {busyRanges.map((range, idx) => (
                          <div
                            key={idx}
                            className={`text-xs p-1.5 rounded ${
                              range.status === "em_execucao"
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/50"
                                : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/50"
                            }`}
                          >
                            <div className="font-medium">{range.start} - {range.end}</div>
                            <div className="text-[10px] opacity-75">
                              {Math.round(range.duration / 60)}h {range.duration % 60}min
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 text-center py-2">Disponível</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {availability.length === 0 && (
        <div className="text-center text-slate-400 py-8">
          Nenhuma equipe com disponibilidade no período selecionado
        </div>
      )}

      {/* Day Details Modal */}
      {selectedDay && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelectedDay(null)}
        >
          <div 
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-white/10 p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-lg sm:text-xl font-bold text-white">{selectedDay.teamName}</div>
                  <div className="text-sm text-slate-400 mt-1">
                    {formatDate(selectedDay.date)} - {new Date(selectedDay.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {/* Team Location */}
              {teamLocation && (
                <div className="rounded-lg border border-purple-500/50 bg-purple-500/10 p-4">
                  <div className="text-sm font-semibold text-purple-300 mb-2 flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Última Localização da Equipe
                  </div>
                  {teamLocation.address && (
                    <div className="text-sm text-white mb-2">{teamLocation.address}</div>
                  )}
                  <div className="text-xs text-slate-300">
                    Coordenadas: {teamLocation.latitude.toFixed(6)}, {teamLocation.longitude.toFixed(6)}
                  </div>
                  {teamLocation.timestamp && (
                    <div className="text-xs text-slate-400 mt-1">
                      Atualizado: {formatDateTime(teamLocation.timestamp.toString())}
                    </div>
                  )}
                </div>
              )}

              {/* Jobs List */}
              {loadingDayDetails ? (
                <div className="text-center text-slate-400 py-8">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-emerald-400"></div>
                  <div className="mt-2 text-sm">Carregando detalhes...</div>
                </div>
              ) : dayJobs.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-white mb-3">
                    Ordens de Serviço ({dayJobs.length})
                  </div>
                  {dayJobs.map((job) => (
                    <div
                      key={job._id}
                      className="rounded-lg border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white text-sm">{job.title}</div>
                          {job.seq && (
                            <div className="text-xs text-slate-400 mt-0.5">OS #{job.seq}</div>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${getStatusColor(job.status)}`}>
                          {getStatusLabel(job.status)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        {job.clientName && (
                          <div>
                            <div className="text-xs text-slate-400 mb-1">Cliente</div>
                            <div className="text-sm text-white">{job.clientName}</div>
                          </div>
                        )}
                        {job.site && (
                          <div>
                            <div className="text-xs text-slate-400 mb-1">Local</div>
                            <div className="text-sm text-white">{job.site}</div>
                          </div>
                        )}
                        {job.plannedDate && (
                          <div>
                            <div className="text-xs text-slate-400 mb-1">Data Planejada</div>
                            <div className="text-sm text-white">{formatDateTime(job.plannedDate)}</div>
                          </div>
                        )}
                        {job.estimatedDuration && (
                          <div>
                            <div className="text-xs text-slate-400 mb-1">Duração Estimada</div>
                            <div className="text-sm text-white">
                              {Math.round(job.estimatedDuration / 60)}h {job.estimatedDuration % 60}min
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {(job.finalValue || job.value) && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <div className="text-xs text-slate-400 mb-1">Valor</div>
                          <div className="text-sm font-semibold text-emerald-300">
                            {formatCurrency(job.finalValue || job.value)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-400 py-8">
                  Nenhuma OS encontrada para esta data
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

