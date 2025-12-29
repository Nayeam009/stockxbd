import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "bn";

interface Translations {
  [key: string]: {
    en: string;
    bn: string;
  };
}

// Translation dictionary
export const translations: Translations = {
  // Settings Page
  "settings": { en: "Settings", bn: "সেটিংস" },
  "settings_desc": { en: "Manage your application preferences and configurations.", bn: "আপনার অ্যাপ্লিকেশন পছন্দ এবং কনফিগারেশন পরিচালনা করুন।" },
  "business_info": { en: "Business Information", bn: "ব্যবসার তথ্য" },
  "business_info_desc": { en: "Update your business details and contact information.", bn: "আপনার ব্যবসার বিবরণ এবং যোগাযোগের তথ্য আপডেট করুন।" },
  "business_name": { en: "Business Name", bn: "ব্যবসার নাম" },
  "phone_number": { en: "Phone Number", bn: "ফোন নম্বর" },
  "address": { en: "Address", bn: "ঠিকানা" },
  "save_changes": { en: "Save Changes", bn: "পরিবর্তন সংরক্ষণ" },
  "notifications": { en: "Notifications", bn: "বিজ্ঞপ্তি" },
  "notifications_desc": { en: "Configure your notification preferences.", bn: "আপনার বিজ্ঞপ্তি পছন্দ কনফিগার করুন।" },
  "low_stock_alerts": { en: "Low Stock Alerts", bn: "কম স্টক সতর্কতা" },
  "low_stock_desc": { en: "Get notified when stock is low", bn: "স্টক কম হলে বিজ্ঞপ্তি পান" },
  "new_order_alerts": { en: "New Order Alerts", bn: "নতুন অর্ডার সতর্কতা" },
  "new_order_desc": { en: "Get notified for new orders", bn: "নতুন অর্ডারের জন্য বিজ্ঞপ্তি পান" },
  "payment_alerts": { en: "Payment Alerts", bn: "পেমেন্ট সতর্কতা" },
  "payment_desc": { en: "Get notified for payments", bn: "পেমেন্টের জন্য বিজ্ঞপ্তি পান" },
  "daily_reports": { en: "Daily Reports", bn: "দৈনিক রিপোর্ট" },
  "daily_reports_desc": { en: "Receive daily summary reports", bn: "দৈনিক সারসংক্ষেপ রিপোর্ট পান" },
  "security": { en: "Security", bn: "নিরাপত্তা" },
  "security_desc": { en: "Manage security settings and access controls.", bn: "নিরাপত্তা সেটিংস এবং অ্যাক্সেস নিয়ন্ত্রণ পরিচালনা করুন।" },
  "change_password": { en: "Change Password", bn: "পাসওয়ার্ড পরিবর্তন" },
  "two_factor": { en: "Two-Factor Authentication", bn: "দ্বি-ফ্যাক্টর প্রমাণীকরণ" },
  "active_sessions": { en: "Active Sessions", bn: "সক্রিয় সেশন" },
  "access_logs": { en: "Access Logs", bn: "অ্যাক্সেস লগ" },
  "appearance": { en: "Appearance", bn: "চেহারা" },
  "appearance_desc": { en: "Customize the look and feel of your dashboard.", bn: "আপনার ড্যাশবোর্ডের চেহারা কাস্টমাইজ করুন।" },
  "dark_mode": { en: "Dark Mode", bn: "ডার্ক মোড" },
  "dark_mode_desc": { en: "Use dark theme", bn: "ডার্ক থিম ব্যবহার করুন" },
  "language": { en: "Language", bn: "ভাষা" },
  "language_desc": { en: "Select your preferred language", bn: "আপনার পছন্দের ভাষা নির্বাচন করুন" },
  "english": { en: "English", bn: "ইংরেজি" },
  "bangla": { en: "বাংলা", bn: "বাংলা" },
  "data_management": { en: "Data Management", bn: "ডেটা ম্যানেজমেন্ট" },
  "data_management_desc": { en: "Manage your data, backups, and exports.", bn: "আপনার ডেটা, ব্যাকআপ এবং এক্সপোর্ট পরিচালনা করুন।" },
  "export_data": { en: "Export Data", bn: "ডেটা এক্সপোর্ট" },
  "backup_database": { en: "Backup Database", bn: "ডেটাবেস ব্যাকআপ" },
  "clear_cache": { en: "Clear Cache", bn: "ক্যাশ মুছুন" },
  "settings_saved": { en: "Settings saved successfully", bn: "সেটিংস সফলভাবে সংরক্ষিত" },
  "cache_cleared": { en: "Cache cleared successfully", bn: "ক্যাশ সফলভাবে মুছে ফেলা হয়েছে" },
  "export_started": { en: "Export started...", bn: "এক্সপোর্ট শুরু হয়েছে..." },
  "backup_created": { en: "Backup created successfully", bn: "ব্যাকআপ সফলভাবে তৈরি হয়েছে" },

  // Dashboard Navigation
  "dashboard": { en: "Dashboard", bn: "ড্যাশবোর্ড" },
  "overview": { en: "Dashboard", bn: "ড্যাশবোর্ড" },
  "daily_sales": { en: "Daily Sales", bn: "দৈনিক বিক্রয়" },
  "daily_expenses": { en: "Daily Expenses", bn: "দৈনিক খরচ" },
  "analysis": { en: "Analytics", bn: "বিশ্লেষণ" },
  "lpg_stock": { en: "LPG Stock", bn: "এলপিজি স্টক" },
  "stove_stock": { en: "Gas Stove", bn: "গ্যাস চুলা" },
  "regulators": { en: "Regulators", bn: "রেগুলেটর" },
  "product_pricing": { en: "Product Pricing", bn: "পণ্যের মূল্য" },
  "online_delivery": { en: "Online Delivery", bn: "অনলাইন ডেলিভারি" },
  "pos": { en: "Point of Sale", bn: "পয়েন্ট অফ সেল" },
  "customers": { en: "Customers", bn: "গ্রাহক" },
  "staff_salary": { en: "Staff Salary", bn: "কর্মী বেতন" },
  "vehicle_cost": { en: "Vehicle Cost", bn: "গাড়ির খরচ" },
  "community": { en: "LPG Community", bn: "এলপিজি কমিউনিটি" },
  "search": { en: "Search & Reports", bn: "অনুসন্ধান ও রিপোর্ট" },
  "logout": { en: "Sign Out", bn: "সাইন আউট" },
  "exchange": { en: "Exchange", bn: "এক্সচেঞ্জ" },

  // Common
  "welcome": { en: "Welcome", bn: "স্বাগতম" },
  "loading": { en: "Loading...", bn: "লোড হচ্ছে..." },
  "save": { en: "Save", bn: "সংরক্ষণ" },
  "cancel": { en: "Cancel", bn: "বাতিল" },
  "delete": { en: "Delete", bn: "মুছুন" },
  "edit": { en: "Edit", bn: "সম্পাদনা" },
  "add": { en: "Add", bn: "যোগ করুন" },
  "total": { en: "Total", bn: "মোট" },
  "today": { en: "Today", bn: "আজ" },
  "yesterday": { en: "Yesterday", bn: "গতকাল" },
  "this_month": { en: "This Month", bn: "এই মাস" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("app-language");
    return (saved as Language) || "en";
  });

  useEffect(() => {
    localStorage.setItem("app-language", language);
  }, [language]);

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) return key;
    return translation[language] || translation.en || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
