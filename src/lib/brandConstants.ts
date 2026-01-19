// Brand Constants for Bangladeshi LPG Business
// Comprehensive lists of popular brands with metadata

// ============= LPG CYLINDER BRANDS =============
export interface LpgBrandInfo {
  name: string;
  mouthSize: "22mm" | "20mm";
  color: string;
}

export const LPG_BRANDS: LpgBrandInfo[] = [
  // Market Leaders (22mm)
  { name: "Bashundhara", mouthSize: "22mm", color: "#e11d48" },
  { name: "Omera", mouthSize: "22mm", color: "#22c55e" },
  { name: "Jamuna", mouthSize: "22mm", color: "#3b82f6" },
  { name: "Beximco", mouthSize: "22mm", color: "#8b5cf6" },
  { name: "INDEX", mouthSize: "22mm", color: "#f97316" },
  { name: "BM Energy", mouthSize: "22mm", color: "#06b6d4" },
  { name: "Fresh", mouthSize: "22mm", color: "#84cc16" },
  { name: "Navana", mouthSize: "22mm", color: "#ec4899" },
  { name: "Akij", mouthSize: "22mm", color: "#14b8a6" },
  { name: "Orion", mouthSize: "22mm", color: "#6366f1" },
  { name: "Delta", mouthSize: "22mm", color: "#f43f5e" },
  { name: "JMI", mouthSize: "22mm", color: "#0ea5e9" },
  { name: "G-Gas (Energypac)", mouthSize: "22mm", color: "#10b981" },
  { name: "Runner", mouthSize: "22mm", color: "#d946ef" },
  { name: "Meghna", mouthSize: "22mm", color: "#a855f7" },
  { name: "Unitex", mouthSize: "22mm", color: "#facc15" },
  { name: "Sena", mouthSize: "22mm", color: "#64748b" },
  { name: "City", mouthSize: "22mm", color: "#78716c" },
  { name: "RP", mouthSize: "22mm", color: "#0284c7" },
  { name: "Golden", mouthSize: "22mm", color: "#ca8a04" },
  { name: "Padma", mouthSize: "22mm", color: "#16a34a" },
  { name: "Confidence", mouthSize: "22mm", color: "#9333ea" },
  { name: "Unique", mouthSize: "22mm", color: "#ea580c" },
  { name: "S Alam", mouthSize: "22mm", color: "#0d9488" },
  // 20mm Brands
  { name: "Totalgaz", mouthSize: "20mm", color: "#0891b2" },
  { name: "Laugfs", mouthSize: "20mm", color: "#7c3aed" },
  { name: "Petromax", mouthSize: "20mm", color: "#dc2626" },
  { name: "K-Gas", mouthSize: "20mm", color: "#059669" },
  { name: "Lufs", mouthSize: "20mm", color: "#f59e0b" },
  { name: "Shell", mouthSize: "20mm", color: "#facc15" },
];

// ============= GAS STOVE BRANDS =============
export interface StoveBrandInfo {
  name: string;
  country: "BD" | "JP" | "CN" | "IN" | "US" | "DE" | "KR" | "TW";
  countryName: string;
}

export const STOVE_BRANDS: StoveBrandInfo[] = [
  // Bangladeshi Leaders
  { name: "Walton", country: "BD", countryName: "Bangladesh" },
  { name: "RFL", country: "BD", countryName: "Bangladesh" },
  { name: "Gazi", country: "BD", countryName: "Bangladesh" },
  { name: "Miyako", country: "BD", countryName: "Bangladesh" },
  { name: "Vision", country: "BD", countryName: "Bangladesh" },
  { name: "Singer", country: "BD", countryName: "Bangladesh" },
  { name: "Minister", country: "BD", countryName: "Bangladesh" },
  { name: "Jamuna", country: "BD", countryName: "Bangladesh" },
  { name: "Navana", country: "BD", countryName: "Bangladesh" },
  { name: "Kiam", country: "BD", countryName: "Bangladesh" },
  { name: "Rangs", country: "BD", countryName: "Bangladesh" },
  { name: "Electra", country: "BD", countryName: "Bangladesh" },
  // International
  { name: "Rinnai", country: "JP", countryName: "Japan" },
  { name: "Midea", country: "CN", countryName: "China" },
  { name: "Butterfly", country: "IN", countryName: "India" },
  { name: "Sharp", country: "JP", countryName: "Japan" },
  { name: "Black & Decker", country: "US", countryName: "USA" },
  { name: "Haibali", country: "CN", countryName: "China" },
  { name: "Dorfen", country: "DE", countryName: "Germany" },
  { name: "Konka", country: "CN", countryName: "China" },
  { name: "LG", country: "KR", countryName: "South Korea" },
  { name: "Panasonic", country: "JP", countryName: "Japan" },
  { name: "Paloma", country: "JP", countryName: "Japan" },
  { name: "Prestige", country: "IN", countryName: "India" },
  { name: "Pigeon", country: "IN", countryName: "India" },
];

// ============= REGULATOR BRANDS =============
export interface RegulatorBrandInfo {
  name: string;
  tier: "premium" | "standard" | "economy";
  origin: string;
}

export const REGULATOR_BRANDS: RegulatorBrandInfo[] = [
  // Premium/Safety Focused
  { name: "IGT", tier: "premium", origin: "India" },
  { name: "Cavagna", tier: "premium", origin: "Italy" },
  { name: "Kosan", tier: "premium", origin: "Denmark" },
  { name: "CLESSE", tier: "premium", origin: "France" },
  { name: "Fisher", tier: "premium", origin: "USA" },
  // Standard
  { name: "Pamir", tier: "standard", origin: "Bangladesh" },
  { name: "Sena", tier: "standard", origin: "Bangladesh" },
  { name: "Bono", tier: "standard", origin: "Bangladesh" },
  { name: "BM", tier: "standard", origin: "Bangladesh" },
  { name: "Navana", tier: "standard", origin: "Bangladesh" },
  { name: "Ujala", tier: "standard", origin: "Bangladesh" },
  { name: "RFL", tier: "standard", origin: "Bangladesh" },
  { name: "M-Gas", tier: "standard", origin: "Bangladesh" },
  // Economy
  { name: "Generic Chinese", tier: "economy", origin: "China" },
  { name: "Local Made", tier: "economy", origin: "Bangladesh" },
];

// ============= HELPER FUNCTIONS =============

/**
 * Get LPG brands filtered by mouth size
 */
export const getLpgBrandsByMouthSize = (size: "22mm" | "20mm"): LpgBrandInfo[] => {
  return LPG_BRANDS.filter(brand => brand.mouthSize === size);
};

/**
 * Get the suggested color for a brand name
 */
export const getLpgBrandColor = (brandName: string): string => {
  const brand = LPG_BRANDS.find(b => b.name.toLowerCase() === brandName.toLowerCase());
  return brand?.color ?? "#22c55e"; // Default green
};

/**
 * Get the default mouth size for a brand
 */
export const getDefaultMouthSize = (brandName: string): "22mm" | "20mm" => {
  const brand = LPG_BRANDS.find(b => b.name.toLowerCase() === brandName.toLowerCase());
  return brand?.mouthSize ?? "22mm"; // Default 22mm
};

/**
 * Get all LPG brand names for mouth size mapping (for POS)
 */
export const getBrandMouthSizeMap = (): Record<string, string> => {
  return LPG_BRANDS.reduce((acc, brand) => {
    acc[brand.name.toLowerCase()] = brand.mouthSize;
    return acc;
  }, {} as Record<string, string>);
};

/**
 * Get regulator tier badge styling
 */
export const getRegulatorTierStyle = (tier: "premium" | "standard" | "economy"): { bg: string; text: string } => {
  switch (tier) {
    case "premium":
      return { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" };
    case "standard":
      return { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" };
    case "economy":
      return { bg: "bg-gray-100 dark:bg-gray-900/30", text: "text-gray-600 dark:text-gray-400" };
  }
};

/**
 * Get stove brand country flag emoji
 */
export const getCountryFlag = (country: StoveBrandInfo["country"]): string => {
  const flags: Record<StoveBrandInfo["country"], string> = {
    BD: "🇧🇩",
    JP: "🇯🇵",
    CN: "🇨🇳",
    IN: "🇮🇳",
    US: "🇺🇸",
    DE: "🇩🇪",
    KR: "🇰🇷",
    TW: "🇹🇼",
  };
  return flags[country] ?? "🌐";
};

// Get sorted LPG brand names for dropdown
export const getLpgBrandNames = (mouthSize?: "22mm" | "20mm"): string[] => {
  const brands = mouthSize ? getLpgBrandsByMouthSize(mouthSize) : LPG_BRANDS;
  return brands.map(b => b.name).sort();
};

// Get sorted stove brand names for dropdown
export const getStoveBrandNames = (): string[] => {
  return STOVE_BRANDS.map(b => b.name).sort();
};

// Get sorted regulator brand names for dropdown
export const getRegulatorBrandNames = (): string[] => {
  return REGULATOR_BRANDS.map(b => b.name).sort();
};

// Find brand info
export const findLpgBrand = (name: string): LpgBrandInfo | undefined => {
  return LPG_BRANDS.find(b => b.name.toLowerCase() === name.toLowerCase());
};

export const findStoveBrand = (name: string): StoveBrandInfo | undefined => {
  return STOVE_BRANDS.find(b => b.name.toLowerCase() === name.toLowerCase());
};

export const findRegulatorBrand = (name: string): RegulatorBrandInfo | undefined => {
  return REGULATOR_BRANDS.find(b => b.name.toLowerCase() === name.toLowerCase());
};
