// Brand Constants for Bangladeshi LPG Business
// Comprehensive lists of popular brands with metadata

// ============= VALVE-SIZE SPECIFIC COLOR MAPS =============

// 22mm Valve Size Colors (Primary cylinders - most common in Bangladesh)
export const LPG_COLORS_22MM: Record<string, string> = {
  "Bashundhara": "#991b1b",    // Deep Red
  "Omera": "#22c55e",          // Parrot Green
  "Fresh": "#2563eb",          // Blue
  "Green": "#facc15",          // Yellow
  "BM": "#0d9488",             // Turquoise/Teal
  "BM Energy": "#0d9488",      // Turquoise/Teal
  "Jamuna": "#dc2626",         // Red
  "LAUGFS": "#ca8a04",         // Very Deep Yellow
  "Laugfs": "#ca8a04",         // Very Deep Yellow
  "Total": "#ea580c",          // Deep Orange
  "Totalgaz": "#ea580c",       // Deep Orange
  "Beximco": "#16a34a",        // Green
  "Navana": "#166534",         // Deep Green
  "Petromax": "#ec4899",       // Pink
  "JMI": "#f97316",            // Orange
  "G-Gas": "#3b82f6",          // Blue+Red mix
  "G-Gas (Energypac)": "#3b82f6",
  "Universal": "#22c55e",      // Kelly Green
  "Universal Gas": "#22c55e",
  "Sena": "#dc2626",           // Red
  "Delta": "#dc2626",          // Red
  "INDEX": "#9333ea",          // Purple
  "Index": "#9333ea",          // Purple
  "Unigas": "#fef3c7",         // Cream Yellow
  "Uni Gas": "#fef3c7",
  "Akij": "#a5b4fc",           // Powder Blue
  "I-Gas": "#a5b4fc",          // Powder Blue
  "Orion": "#581c87",          // Deep Purple
};

// 20mm Valve Size Colors (Different from 22mm for distinction)
export const LPG_COLORS_20MM: Record<string, string> = {
  "Bashundhara": "#facc15",    // Yellow
  "Omera": "#166534",          // Deep Green
  "Fresh": "#1e40af",          // Deep Blue
  "BM": "#14b8a6",             // Green-Teal
  "BM Energy": "#14b8a6",
  "Jamuna": "#22c55e",         // Green
  "LAUGFS": "#84cc16",         // Yellow-Green
  "Laugfs": "#84cc16",
  "Total": "#ea580c",          // Deep Orange
  "Totalgaz": "#ea580c",
  "Beximco": "#16a34a",        // Green
  "Navana": "#166534",         // Deep Green
  "Petromax": "#be185d",       // Deep Pink
  "JMI": "#be185d",            // Deep Pink Green
  "G-Gas": "#22c55e",          // Green
  "G-Gas (Energypac)": "#22c55e",
  "Universal": "#22c55e",      // Kelly Green
  "Universal Gas": "#22c55e",
  "Unigas": "#84cc16",         // Yellow-Green
  "Uni Gas": "#84cc16",
  "Akij": "#0d9488",           // Blue-Green
  "I-Gas": "#0d9488",
  "Orion": "#581c87",          // Deep Purple
};

// ============= LPG CYLINDER BRANDS =============
export interface LpgBrandInfo {
  name: string;
  mouthSize: "22mm" | "20mm";
  color: string;
}

export const LPG_BRANDS: LpgBrandInfo[] = [
  // Market Leaders (22mm)
  { name: "Bashundhara", mouthSize: "22mm", color: "#991b1b" },
  { name: "Omera", mouthSize: "22mm", color: "#22c55e" },
  { name: "Jamuna", mouthSize: "22mm", color: "#dc2626" },
  { name: "Beximco", mouthSize: "22mm", color: "#16a34a" },
  { name: "INDEX", mouthSize: "22mm", color: "#9333ea" },
  { name: "BM Energy", mouthSize: "22mm", color: "#0d9488" },
  { name: "Fresh", mouthSize: "22mm", color: "#2563eb" },
  { name: "Navana", mouthSize: "22mm", color: "#166534" },
  { name: "Akij", mouthSize: "22mm", color: "#a5b4fc" },
  { name: "Orion", mouthSize: "22mm", color: "#581c87" },
  { name: "Delta", mouthSize: "22mm", color: "#dc2626" },
  { name: "JMI", mouthSize: "22mm", color: "#f97316" },
  { name: "G-Gas (Energypac)", mouthSize: "22mm", color: "#3b82f6" },
  { name: "Runner", mouthSize: "22mm", color: "#d946ef" },
  { name: "Meghna", mouthSize: "22mm", color: "#a855f7" },
  { name: "Unitex", mouthSize: "22mm", color: "#facc15" },
  { name: "Sena", mouthSize: "22mm", color: "#dc2626" },
  { name: "City", mouthSize: "22mm", color: "#78716c" },
  { name: "RP", mouthSize: "22mm", color: "#0284c7" },
  { name: "Golden", mouthSize: "22mm", color: "#ca8a04" },
  { name: "Padma", mouthSize: "22mm", color: "#16a34a" },
  { name: "Confidence", mouthSize: "22mm", color: "#9333ea" },
  { name: "Unique", mouthSize: "22mm", color: "#ea580c" },
  { name: "S Alam", mouthSize: "22mm", color: "#0d9488" },
  // Additional 22mm Brands
  { name: "Cylinderwala (BM)", mouthSize: "22mm", color: "#0d9488" },
  { name: "Universal Gas", mouthSize: "22mm", color: "#22c55e" },
  { name: "Unigas", mouthSize: "22mm", color: "#fef3c7" },
  { name: "Star", mouthSize: "22mm", color: "#eab308" },
  { name: "Pioneer", mouthSize: "22mm", color: "#16a34a" },
  { name: "Summit", mouthSize: "22mm", color: "#ea580c" },
  { name: "Aftab", mouthSize: "22mm", color: "#dc2626" },
  { name: "Bengal", mouthSize: "22mm", color: "#059669" },
  { name: "MEGA", mouthSize: "22mm", color: "#8b5cf6" },
  { name: "Metro", mouthSize: "22mm", color: "#0284c7" },
  { name: "Crown", mouthSize: "22mm", color: "#ca8a04" },
  { name: "Sunrise", mouthSize: "22mm", color: "#f97316" },
  { name: "Super", mouthSize: "22mm", color: "#6366f1" },
  { name: "Royal", mouthSize: "22mm", color: "#9333ea" },
  { name: "Speed", mouthSize: "22mm", color: "#14b8a6" },
  { name: "National", mouthSize: "22mm", color: "#ef4444" },
  { name: "Atlas", mouthSize: "22mm", color: "#3b82f6" },
  { name: "Quality", mouthSize: "22mm", color: "#10b981" },
  { name: "Excel", mouthSize: "22mm", color: "#7c3aed" },
  { name: "Prime", mouthSize: "22mm", color: "#f59e0b" },
  { name: "Elite", mouthSize: "22mm", color: "#4f46e5" },
  { name: "Standard", mouthSize: "22mm", color: "#71717a" },
  { name: "Trust", mouthSize: "22mm", color: "#0d9488" },
  { name: "Safe", mouthSize: "22mm", color: "#22c55e" },
  { name: "Shikha", mouthSize: "22mm", color: "#f472b6" },
  { name: "Baraka", mouthSize: "22mm", color: "#059669" },
  // 20mm Brands
  { name: "Totalgaz", mouthSize: "20mm", color: "#ea580c" },
  { name: "Laugfs", mouthSize: "20mm", color: "#84cc16" },
  { name: "Petromax", mouthSize: "20mm", color: "#be185d" },
  { name: "K-Gas", mouthSize: "20mm", color: "#059669" },
  { name: "Lufs", mouthSize: "20mm", color: "#f59e0b" },
  { name: "Shell", mouthSize: "20mm", color: "#facc15" },
  { name: "HP Gas", mouthSize: "20mm", color: "#1e40af" },
  { name: "Indane", mouthSize: "20mm", color: "#4f46e5" },
  { name: "Bharat Gas", mouthSize: "20mm", color: "#7c2d12" },
  { name: "Super Gas", mouthSize: "20mm", color: "#be185d" },
  { name: "IOC", mouthSize: "20mm", color: "#0369a1" },
];

// ============= GAS STOVE BRANDS =============
export interface StoveBrandInfo {
  name: string;
  country: "BD" | "JP" | "CN" | "IN" | "US" | "DE" | "KR" | "TW" | "IT" | "MY";
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
  { name: "Marcel", country: "BD", countryName: "Bangladesh" },
  { name: "Sony", country: "BD", countryName: "Bangladesh" },
  { name: "Transtec", country: "BD", countryName: "Bangladesh" },
  { name: "Youwe", country: "BD", countryName: "Bangladesh" },
  { name: "Ocean", country: "BD", countryName: "Bangladesh" },
  { name: "Click", country: "BD", countryName: "Bangladesh" },
  { name: "Konka", country: "BD", countryName: "Bangladesh" },
  { name: "Golden", country: "BD", countryName: "Bangladesh" },
  { name: "Atom", country: "BD", countryName: "Bangladesh" },
  { name: "Energy", country: "BD", countryName: "Bangladesh" },
  { name: "Queen", country: "BD", countryName: "Bangladesh" },
  // International
  { name: "Rinnai", country: "JP", countryName: "Japan" },
  { name: "Midea", country: "CN", countryName: "China" },
  { name: "Butterfly", country: "IN", countryName: "India" },
  { name: "Sharp", country: "JP", countryName: "Japan" },
  { name: "Black & Decker", country: "US", countryName: "USA" },
  { name: "Haibali", country: "CN", countryName: "China" },
  { name: "Dorfen", country: "DE", countryName: "Germany" },
  { name: "LG", country: "KR", countryName: "South Korea" },
  { name: "Panasonic", country: "JP", countryName: "Japan" },
  { name: "Paloma", country: "JP", countryName: "Japan" },
  { name: "Prestige", country: "IN", countryName: "India" },
  { name: "Pigeon", country: "IN", countryName: "India" },
  { name: "Haier", country: "CN", countryName: "China" },
  { name: "Hisense", country: "CN", countryName: "China" },
  { name: "Sakura", country: "JP", countryName: "Japan" },
  { name: "Turbo", country: "TW", countryName: "Taiwan" },
  { name: "Preethi", country: "IN", countryName: "India" },
  { name: "Sunflame", country: "IN", countryName: "India" },
  { name: "Bajaj", country: "IN", countryName: "India" },
  { name: "Glen", country: "IN", countryName: "India" },
  { name: "Elica", country: "IT", countryName: "Italy" },
  { name: "Faber", country: "IT", countryName: "Italy" },
  { name: "Pensonic", country: "MY", countryName: "Malaysia" },
  { name: "Khind", country: "MY", countryName: "Malaysia" },
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
  { name: "GOK", tier: "premium", origin: "Germany" },
  { name: "Rego", tier: "premium", origin: "USA" },
  { name: "Comap", tier: "premium", origin: "France" },
  { name: "Kosangas", tier: "premium", origin: "Denmark" },
  { name: "Rotarex", tier: "premium", origin: "Luxembourg" },
  // Standard
  { name: "Pamir", tier: "standard", origin: "Bangladesh" },
  { name: "Sena", tier: "standard", origin: "Bangladesh" },
  { name: "Bono", tier: "standard", origin: "Bangladesh" },
  { name: "BM", tier: "standard", origin: "Bangladesh" },
  { name: "Navana", tier: "standard", origin: "Bangladesh" },
  { name: "Ujala", tier: "standard", origin: "Bangladesh" },
  { name: "RFL", tier: "standard", origin: "Bangladesh" },
  { name: "M-Gas", tier: "standard", origin: "Bangladesh" },
  { name: "HP", tier: "standard", origin: "Bangladesh" },
  { name: "Supergas", tier: "standard", origin: "India" },
  { name: "Gas-Flo", tier: "standard", origin: "India" },
  { name: "Crystal", tier: "standard", origin: "Bangladesh" },
  { name: "Safe", tier: "standard", origin: "Bangladesh" },
  { name: "Omera", tier: "standard", origin: "Bangladesh" },
  { name: "INDEX", tier: "standard", origin: "Bangladesh" },
  // Economy
  { name: "Generic Chinese", tier: "economy", origin: "China" },
  { name: "Local Made", tier: "economy", origin: "Bangladesh" },
  { name: "Trust", tier: "economy", origin: "China" },
  { name: "Budget", tier: "economy", origin: "China" },
];

// ============= SUPPLIER CONSTANTS =============
export interface SupplierInfo {
  name: string;
  type: "lpg" | "stove" | "regulator" | "multi";
  category: "manufacturer" | "distributor" | "importer";
}

// LPG Cylinder Suppliers/Distributors
export const LPG_SUPPLIERS: SupplierInfo[] = [
  // Major Manufacturers & Distributors
  { name: "Bashundhara LP Gas Ltd.", type: "lpg", category: "manufacturer" },
  { name: "Omera Petroleum Ltd.", type: "lpg", category: "manufacturer" },
  { name: "Jamuna Oil Company Ltd.", type: "lpg", category: "manufacturer" },
  { name: "Beximco LPG Ltd.", type: "lpg", category: "manufacturer" },
  { name: "TotalEnergies Bangladesh", type: "lpg", category: "manufacturer" },
  { name: "Laugfs Gas Bangladesh Ltd.", type: "lpg", category: "manufacturer" },
  { name: "Petromax LPG Ltd.", type: "lpg", category: "manufacturer" },
  { name: "BM Energy (BD) Ltd.", type: "lpg", category: "manufacturer" },
  { name: "INDEX Energy Ltd.", type: "lpg", category: "manufacturer" },
  { name: "Fresh LPG Ltd.", type: "lpg", category: "manufacturer" },
  { name: "Navana LPG Ltd.", type: "lpg", category: "manufacturer" },
  { name: "Akij Gas Ltd.", type: "lpg", category: "manufacturer" },
  { name: "Orion LPG Ltd.", type: "lpg", category: "manufacturer" },
  { name: "Delta LPG Ltd.", type: "lpg", category: "manufacturer" },
  { name: "JMI LPG Ltd.", type: "lpg", category: "manufacturer" },
  { name: "G-Gas (Energypac)", type: "lpg", category: "manufacturer" },
  { name: "Runner LPG Ltd.", type: "lpg", category: "manufacturer" },
  { name: "Meghna LPG Ltd.", type: "lpg", category: "manufacturer" },
  { name: "Unitex Gas Ltd.", type: "lpg", category: "manufacturer" },
  { name: "Sena LPG Ltd.", type: "lpg", category: "manufacturer" },
  { name: "City LPG Ltd.", type: "lpg", category: "manufacturer" },
  { name: "RP Gas Ltd.", type: "lpg", category: "manufacturer" },
  { name: "Golden LPG", type: "lpg", category: "manufacturer" },
  { name: "Padma Energy", type: "lpg", category: "manufacturer" },
  { name: "Confidence Gas Ltd.", type: "lpg", category: "manufacturer" },
  { name: "Unique Gas Ltd.", type: "lpg", category: "manufacturer" },
  { name: "S Alam Gas Ltd.", type: "lpg", category: "manufacturer" },
  { name: "Universal Gas & Cylinder Ltd.", type: "lpg", category: "manufacturer" },
  // Regional Distributors
  { name: "Unigas Bangladesh", type: "lpg", category: "distributor" },
  { name: "K-Gas Bangladesh", type: "lpg", category: "distributor" },
  { name: "Local Distributor", type: "lpg", category: "distributor" },
  { name: "Dhaka Gas Distributor", type: "lpg", category: "distributor" },
  { name: "Chittagong Gas Supplies", type: "lpg", category: "distributor" },
  { name: "Sylhet Gas Agency", type: "lpg", category: "distributor" },
  { name: "Rajshahi Gas Depot", type: "lpg", category: "distributor" },
  { name: "Khulna Gas Services", type: "lpg", category: "distributor" },
];

// Stove Suppliers
export const STOVE_SUPPLIERS: SupplierInfo[] = [
  // Bangladeshi Manufacturers
  { name: "Walton Hi-Tech Industries Ltd.", type: "stove", category: "manufacturer" },
  { name: "RFL Electronics Ltd.", type: "stove", category: "manufacturer" },
  { name: "Gazi Group", type: "stove", category: "manufacturer" },
  { name: "Miyako Electronics", type: "stove", category: "manufacturer" },
  { name: "Vision Electronics", type: "stove", category: "manufacturer" },
  { name: "Singer Bangladesh Ltd.", type: "stove", category: "manufacturer" },
  { name: "Minister Hi-Tech Park", type: "stove", category: "manufacturer" },
  { name: "Jamuna Electronics", type: "stove", category: "manufacturer" },
  { name: "Navana Home Appliances", type: "stove", category: "manufacturer" },
  { name: "Kiam Metal Industries", type: "stove", category: "manufacturer" },
  { name: "Rangs Electronics", type: "stove", category: "manufacturer" },
  { name: "Electra International", type: "stove", category: "manufacturer" },
  { name: "Marcel Bangladesh", type: "stove", category: "manufacturer" },
  { name: "Transtec Ltd.", type: "stove", category: "manufacturer" },
  // Importers
  { name: "Butterfly Import House", type: "stove", category: "importer" },
  { name: "Midea Bangladesh", type: "stove", category: "importer" },
  { name: "Haier Bangladesh", type: "stove", category: "importer" },
  { name: "Sharp Bangladesh", type: "stove", category: "importer" },
  { name: "Prestige Bangladesh", type: "stove", category: "importer" },
  { name: "Pigeon Distributor BD", type: "stove", category: "importer" },
  { name: "Local Electronics Importer", type: "stove", category: "importer" },
  { name: "Asia Electronics Ltd.", type: "stove", category: "importer" },
  { name: "Fair Electronics Ltd.", type: "stove", category: "importer" },
];

// Regulator Suppliers
export const REGULATOR_SUPPLIERS: SupplierInfo[] = [
  // Premium brands (importers)
  { name: "IGT Bangladesh", type: "regulator", category: "importer" },
  { name: "Cavagna Group BD", type: "regulator", category: "importer" },
  { name: "CLESSE Industries BD", type: "regulator", category: "importer" },
  { name: "Fisher Controls BD", type: "regulator", category: "importer" },
  { name: "GOK Regulators BD", type: "regulator", category: "importer" },
  // Local manufacturers
  { name: "HP Regulators Bangladesh", type: "regulator", category: "manufacturer" },
  { name: "Pamir Gas Equipment", type: "regulator", category: "manufacturer" },
  { name: "Sena Gas Accessories", type: "regulator", category: "manufacturer" },
  { name: "Bono Gas Equipment", type: "regulator", category: "manufacturer" },
  { name: "BM Gas Accessories", type: "regulator", category: "manufacturer" },
  { name: "Navana Gas Accessories", type: "regulator", category: "manufacturer" },
  { name: "RFL Gas Accessories", type: "regulator", category: "manufacturer" },
  { name: "DECO Limited", type: "regulator", category: "distributor" },
  { name: "Local Regulator Supplier", type: "regulator", category: "distributor" },
  { name: "Gas Equipment Wholesale", type: "regulator", category: "distributor" },
];

// ============= DEFAULT PRICING CONSTANTS =============
// Default pricing formulas for cylinders
export const DEFAULT_PRICING = {
  refill: {
    wholesaleMarkup: 20,  // Company + 20 = Wholesale
    retailMarkup: 30,     // Wholesale + 30 = Retail
  },
  package: {
    wholesaleMarkup: 50,  // Company + 50 = Wholesale
    retailMarkup: 50,     // Wholesale + 50 = Retail
  }
};

/**
 * Calculate default prices based on company price
 */
export const calculateDefaultPrices = (
  companyPrice: number, 
  cylinderType: 'refill' | 'package'
): { wholesale: number; retail: number } => {
  const config = DEFAULT_PRICING[cylinderType];
  const wholesale = companyPrice + config.wholesaleMarkup;
  const retail = wholesale + config.retailMarkup;
  return { wholesale, retail };
};

// ============= HELPER FUNCTIONS =============

/**
 * Get LPG brand color based on valve size
 * Different valve sizes have different colors for easy identification
 */
export const getLpgColorByValveSize = (
  brandName: string, 
  valveSize: "22mm" | "20mm"
): string => {
  // Normalize brand name for lookup
  const normalizedName = brandName.trim();
  
  // Check valve-size-specific color maps first
  const colorMap = valveSize === "22mm" ? LPG_COLORS_22MM : LPG_COLORS_20MM;
  
  // Try exact match
  if (colorMap[normalizedName]) {
    return colorMap[normalizedName];
  }
  
  // Try partial match (brand name contains key)
  for (const [key, color] of Object.entries(colorMap)) {
    if (normalizedName.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(normalizedName.toLowerCase())) {
      return color;
    }
  }
  
  // Fallback to general brand lookup
  const brand = LPG_BRANDS.find(b => 
    b.name.toLowerCase() === normalizedName.toLowerCase()
  );
  
  return brand?.color ?? "#22c55e"; // Default green
};

/**
 * Get LPG brands filtered by mouth size
 */
export const getLpgBrandsByMouthSize = (size: "22mm" | "20mm"): LpgBrandInfo[] => {
  return LPG_BRANDS.filter(brand => brand.mouthSize === size);
};

/**
 * Get the suggested color for a brand name (legacy - uses 22mm by default)
 */
export const getLpgBrandColor = (brandName: string): string => {
  return getLpgColorByValveSize(brandName, "22mm");
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
    IT: "🇮🇹",
    MY: "🇲🇾",
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

// ============= SUPPLIER HELPER FUNCTIONS =============

/**
 * Get suppliers by product type
 */
export const getSuppliersByType = (type: "lpg" | "stove" | "regulator"): SupplierInfo[] => {
  switch (type) {
    case "lpg": return LPG_SUPPLIERS;
    case "stove": return STOVE_SUPPLIERS;
    case "regulator": return REGULATOR_SUPPLIERS;
  }
};

/**
 * Get supplier names for dropdown
 */
export const getSupplierNames = (type: "lpg" | "stove" | "regulator"): string[] => {
  return getSuppliersByType(type).map(s => s.name).sort();
};

/**
 * Get suppliers grouped by category
 */
export const getSuppliersByCategory = (type: "lpg" | "stove" | "regulator"): Record<string, SupplierInfo[]> => {
  const suppliers = getSuppliersByType(type);
  return suppliers.reduce((acc, supplier) => {
    if (!acc[supplier.category]) {
      acc[supplier.category] = [];
    }
    acc[supplier.category].push(supplier);
    return acc;
  }, {} as Record<string, SupplierInfo[]>);
};

/**
 * Find supplier info by name
 */
export const findSupplier = (name: string, type: "lpg" | "stove" | "regulator"): SupplierInfo | undefined => {
  return getSuppliersByType(type).find(s => s.name.toLowerCase() === name.toLowerCase());
};

/**
 * Validate custom brand name
 */
export const validateCustomBrand = (name: string): { valid: boolean; error?: string } => {
  if (!name || name.trim().length < 2) {
    return { valid: false, error: "Brand name must be at least 2 characters" };
  }
  if (name.length > 50) {
    return { valid: false, error: "Brand name must be less than 50 characters" };
  }
  if (!/^[a-zA-Z0-9\s\-&()]+$/.test(name)) {
    return { valid: false, error: "Brand name contains invalid characters" };
  }
  return { valid: true };
};

/**
 * Validate custom supplier name
 */
export const validateCustomSupplier = (name: string): { valid: boolean; error?: string } => {
  if (!name || name.trim().length < 3) {
    return { valid: false, error: "Supplier name must be at least 3 characters" };
  }
  if (name.length > 100) {
    return { valid: false, error: "Supplier name must be less than 100 characters" };
  }
  return { valid: true };
};
