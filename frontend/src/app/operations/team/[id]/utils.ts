import { Status, DateFilter } from "./types";

export function encodePassword(password: string): string {
  return btoa(password);
}

export function decodePassword(encoded: string): string {
  try {
    return atob(encoded);
  } catch {
    return "";
  }
}

export function statusLabel(s: Status): string {
  if (s === "pendente") return "Pendente";
  if (s === "em_execucao") return "Em execução";
  if (s === "concluida") return "Concluída";
  return "Cancelada";
}

export function matchesDateFilter(dateString: string | undefined, dateFilter: DateFilter): boolean {
  if (!dateString) return dateFilter === "all";
  
  try {
    const jobDate = new Date(dateString);
    if (isNaN(jobDate.getTime())) return dateFilter === "all";
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    
    const monthFromNow = new Date(today);
    monthFromNow.setMonth(monthFromNow.getMonth() + 1);
    
    const jobDateOnly = new Date(jobDate);
    jobDateOnly.setHours(0, 0, 0, 0);
    
    switch (dateFilter) {
      case "today":
        return jobDateOnly.getTime() === today.getTime();
      case "tomorrow":
        return jobDateOnly.getTime() === tomorrow.getTime();
      case "week":
        return jobDateOnly >= today && jobDateOnly <= weekFromNow;
      case "month":
        return jobDateOnly >= today && jobDateOnly <= monthFromNow;
      default:
        return true;
    }
  } catch {
    return dateFilter === "all";
  }
}

export function groupJobsByDate(jobs: any[]): { date: string; jobs: any[] }[] {
  const groups: { [key: string]: any[] } = {};
  
  jobs.forEach((job) => {
    let dateKey = "Sem data";
    if (job.plannedDate) {
      try {
        const date = new Date(job.plannedDate);
        if (!isNaN(date.getTime())) {
          dateKey = date.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
          });
          dateKey = dateKey.charAt(0).toUpperCase() + dateKey.slice(1);
        }
      } catch {
        // Keep "Sem data"
      }
    }
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(job);
  });
  
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === "Sem data") return 1;
    if (b === "Sem data") return -1;
    try {
      const dateA = new Date(a.split(",")[1]?.trim() || a);
      const dateB = new Date(b.split(",")[1]?.trim() || b);
      return dateA.getTime() - dateB.getTime();
    } catch {
      return a.localeCompare(b);
    }
  });
  
  return sortedKeys.map((key) => ({ date: key, jobs: groups[key] }));
}

