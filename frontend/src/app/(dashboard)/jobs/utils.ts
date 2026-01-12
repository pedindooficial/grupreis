import { CATALOG_DIAMETERS, LOCAL_TYPES, SOIL_TYPES, ACCESS_TYPES } from "./constants";

// Map jobs soil types to catalog soil types
export const mapSoilTypeToCatalog = (soilType: string): "argiloso" | "arenoso" | "rochoso" | "misturado" | "outro" => {
  const mapping: Record<string, "argiloso" | "arenoso" | "rochoso" | "misturado" | "outro"> = {
    "Argiloso": "argiloso",
    "Arenoso": "arenoso",
    "Rochoso": "rochoso",
    "Terra comum": "misturado",
    "Não sei informar": "outro"
  };
  return mapping[soilType] || "outro";
};

// Map jobs access types to catalog access types
export const mapAccessToCatalog = (access: string): "livre" | "limitado" | "restrito" => {
  const mapping: Record<string, "livre" | "limitado" | "restrito"> = {
    "Acesso livre e desimpedido": "livre",
    "Algumas limitações": "limitado",
    "Acesso restrito ou complicado": "restrito"
  };
  return mapping[access] || "livre";
};

// Map stored values to display values (reverse mapping)
export const normalizeLocalType = (value: string): string => {
  if (!value) return "";
  const trimmed = value.trim();
  // First check if it's already in the correct format (case-insensitive)
  const exactMatch = LOCAL_TYPES.find(opt => opt.toLowerCase() === trimmed.toLowerCase());
  if (exactMatch) return exactMatch;
  
  // Then try mapping from stored format
  const normalized = trimmed.toLowerCase();
  const mapping: Record<string, string> = {
    "residencial": "Residencial",
    "comercial": "Comercial",
    "industrial": "Industrial",
    "rural": "Rural"
  };
  return mapping[normalized] || "";
};

export const normalizeSoilType = (value: string): string => {
  if (!value) return "";
  const trimmed = value.trim();
  // First check if it's already in the correct format (case-insensitive)
  const exactMatch = SOIL_TYPES.find(opt => opt.toLowerCase() === trimmed.toLowerCase());
  if (exactMatch) return exactMatch;
  
  // Then try mapping from stored format
  const normalized = trimmed.toLowerCase();
  const mapping: Record<string, string> = {
    "terra_comum": "Terra comum",
    "terra comum": "Terra comum",
    "argiloso": "Argiloso",
    "arenoso": "Arenoso",
    "rochoso": "Rochoso",
    "não sei informar": "Não sei informar",
    "nao sei informar": "Não sei informar"
  };
  return mapping[normalized] || "";
};

export const normalizeAccess = (value: string): string => {
  if (!value) return "";
  const trimmed = value.trim();
  // First check if it's already in the correct format (case-insensitive)
  const exactMatch = ACCESS_TYPES.find(opt => opt.toLowerCase() === trimmed.toLowerCase());
  if (exactMatch) return exactMatch;
  
  // Then try mapping from stored format
  const normalized = trimmed.toLowerCase();
  const mapping: Record<string, string> = {
    "facil": "Acesso livre e desimpedido",
    "fácil": "Acesso livre e desimpedido",
    "livre": "Acesso livre e desimpedido",
    "acesso livre e desimpedido": "Acesso livre e desimpedido",
    "medio": "Algumas limitações",
    "médio": "Algumas limitações",
    "limitado": "Algumas limitações",
    "algumas limitações": "Algumas limitações",
    "dificil": "Acesso restrito ou complicado",
    "difícil": "Acesso restrito ou complicado",
    "restrito": "Acesso restrito ou complicado",
    "acesso restrito ou complicado": "Acesso restrito ou complicado"
  };
  return mapping[normalized] || "";
};

// Normalize diameter value: "25cm" -> "25", "25 cm" -> "25", "25" -> "25" (supports 25-120cm)
export const normalizeDiameter = (value: string): string => {
  if (!value) return "";
  const trimmed = value.trim();
  // Extract numeric value (remove "cm", spaces, etc.)
  const match = trimmed.match(/^(\d+)/);
  if (match) {
    const num = match[1];
    // Check if it's a valid catalog diameter
    if (CATALOG_DIAMETERS.includes(parseInt(num, 10))) {
      return num;
    }
  }
  // If it's already just a number string, return it if valid
  if (/^\d+$/.test(trimmed) && CATALOG_DIAMETERS.includes(parseInt(trimmed, 10))) {
    return trimmed;
  }
  return "";
};

// Helper function to format datetime for display
export const formatDateTime = (dateTimeString: string | null | undefined): string => {
  if (!dateTimeString) return "-";
  try {
    // Parse date string directly to avoid timezone conversion
    // Format: YYYY-MM-DDTHH:mm:ss or YYYY-MM-DDTHH:mm:ssZ
    const dateStr = dateTimeString.trim();
    const dateTimeMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    
    if (dateTimeMatch) {
      const [, year, month, day, hours, minutes] = dateTimeMatch;
      // Format as DD/MM/YYYY HH:mm (preserving the exact time stored)
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } else {
      // Fallback to Date object if format is unexpected
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) return dateTimeString;
      
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
  } catch {
    return dateTimeString;
  }
};

// Helper function to convert datetime-local format to ISO string for backend
// Preserves the local time without timezone conversion
export const convertToISO = (dateTimeLocal: string): string => {
  if (!dateTimeLocal || dateTimeLocal.trim() === "") return "";
  try {
    // datetime-local format is YYYY-MM-DDTHH:mm
    // Parse the components directly to avoid timezone conversion
    const [datePart, timePart] = dateTimeLocal.split("T");
    if (!datePart || !timePart) return "";
    
    const [year, month, day] = datePart.split("-").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);
    
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
      return "";
    }
    
    // Create ISO string WITHOUT timezone (no Z suffix)
    // This preserves the exact time the user selected as local time
    // The backend will parse it as local time when using new Date()
    return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}T${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;
  } catch {
    return "";
  }
};

// Helper function to convert ISO string to datetime-local format for input
// Extracts the time components directly from the ISO string to avoid timezone conversion
export const convertFromISO = (isoString: string | null | undefined): string => {
  if (!isoString) return "";
  try {
    // Parse ISO string directly: YYYY-MM-DDTHH:mm:ss.sssZ
    // Extract the date and time components before the 'Z' or timezone offset
    const isoDate = isoString.split("T")[0]; // YYYY-MM-DD
    const timePart = isoString.split("T")[1]; // HH:mm:ss.sssZ or HH:mm:ss.sss+HH:mm
    
    if (!isoDate || !timePart) {
      // Fallback to Date object if format is unexpected
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "";
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    // Extract hours and minutes from time part (before seconds or timezone)
    const timeMatch = timePart.match(/^(\d{2}):(\d{2})/);
    if (timeMatch) {
      const [, hours, minutes] = timeMatch;
      return `${isoDate}T${hours}:${minutes}`;
    }
    
    return "";
  } catch {
    return "";
  }
};

// Helper function to calculate service price based on catalog variation
// Formula: (quantity * profundidade) * base_price
export const calculateServicePrice = (
  catalogItem: any,
  diameter: string,
  soilType: string,
  access: string,
  quantidade: string,
  profundidade: string
): { value: string; executionTime?: number } => {
  if (!catalogItem || !diameter || !soilType || !access) {
    return { value: "" };
  }

  const catalogSoilType = mapSoilTypeToCatalog(soilType);
  const catalogAccess = mapAccessToCatalog(access);
  const diameterNum = parseInt(diameter, 10);

  const priceVariation = catalogItem.priceVariations?.find(
    (pv: any) =>
      pv.diameter === diameterNum &&
      pv.soilType === catalogSoilType &&
      pv.access === catalogAccess
  );

  if (!priceVariation) {
    return { value: "" };
  }

  const quantity = parseFloat(quantidade) || 0;
  const depth = parseFloat(profundidade) || 0;
  const basePrice = priceVariation.price || 0;
  const executionTime = priceVariation.executionTime; // Get execution time from variation

  // Formula: (quantity * profundidade) * base_price
  const calculatedValue = (quantity * depth) * basePrice;

  return {
    value: calculatedValue > 0 ? calculatedValue.toFixed(2) : "",
    executionTime: executionTime
  };
};

// Helper function to get date range for date filter
export const getDateRange = (filterType: string): { start: Date; end: Date } | null => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (filterType) {
    case "ontem": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const start = new Date(yesterday);
      start.setHours(0, 0, 0, 0);
      const end = new Date(yesterday);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "hoje": {
      const start = new Date(today);
      start.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "amanha": {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const start = new Date(tomorrow);
      start.setHours(0, 0, 0, 0);
      const end = new Date(tomorrow);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "esse_mes": {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      firstDay.setHours(0, 0, 0, 0);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      lastDay.setHours(23, 59, 59, 999);
      return { start: firstDay, end: lastDay };
    }
    case "esse_ano": {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      firstDay.setHours(0, 0, 0, 0);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      lastDay.setHours(23, 59, 59, 999);
      return { start: firstDay, end: lastDay };
    }
    default:
      return null;
  }
};

// Helper function to extract date part from ISO string (YYYY-MM-DD)
export const extractDatePart = (dateString: string): string | null => {
  if (!dateString) return null;
  // Handle ISO format: YYYY-MM-DDTHH:mm:ss or YYYY-MM-DD
  const match = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
};

// Helper function to normalize date to YYYY-MM-DD format for comparison
export const normalizeDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper function to check if a job's plannedDate matches the date filter
export const matchesDateFilter = (
  jobPlannedDate: string | null | undefined,
  filterType: string,
  customStart?: string,
  customEnd?: string
): boolean => {
  if (filterType === "all") return true;
  
  // If job has no plannedDate, exclude it from date-specific filters
  if (!jobPlannedDate || !jobPlannedDate.trim()) return false;
  
  try {
    // Extract date part to normalize comparison (ignore time component)
    const jobDatePart = extractDatePart(jobPlannedDate);
    if (!jobDatePart) return false;
    
    if (filterType === "custom") {
      if (!customStart || !customEnd) return true; // If custom dates not set, show all
      // Compare date strings directly (YYYY-MM-DD format)
      return jobDatePart >= customStart && jobDatePart <= customEnd;
    }
    
    const range = getDateRange(filterType);
    if (!range) return true;
    
    // Normalize range dates to YYYY-MM-DD format for comparison
    const rangeStartStr = normalizeDate(range.start);
    const rangeEndStr = normalizeDate(range.end);
    
    // Compare date strings directly
    return jobDatePart >= rangeStartStr && jobDatePart <= rangeEndStr;
  } catch {
    return false;
  }
};

