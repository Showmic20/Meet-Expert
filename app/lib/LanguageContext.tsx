import React, { createContext, useContext, useState } from 'react';


const translations = {
  en: {
    
    settings: "Settings",
    darkTheme: "Dark Theme",
    language: "Language",
    verificationRequests: "Verification Requests",
    complaints: "Complaints & Reports",
    logout: "Logout",
    logoutSuccess: "Logged out successfully!",
    
    
    home: "Home",
    expertsForYou: "Experts For you",
    upcomingEvents: "Upcoming Events",
    searchPlaceholder: "Search for an expert",
    join: "Join",
    notifications: "Notifications",
    profile: "Profile",
    online: "Online",
    noTitle: "Untitled Event",
    noNotifications: "No notifications yet",
    justNow: "Just now",
    chat: "Chat", 
  
  },
  bn: {

    settings: "সেটিংস",
    darkTheme: "ডার্ক থিম",
    language: "ভাষা (বাংলা)",
    verificationRequests: "ভেরিফিকেশন রিকোয়েস্ট",
    complaints: "অভিযোগ এবং রিপোর্ট",
    logout: "লগ আউট",
    logoutSuccess: "সফলভাবে লগ আউট হয়েছে!",

    home: "হোম",
    expertsForYou: "আপনার জন্য বিশেষজ্ঞ",
    upcomingEvents: "আসন্ন ইভেন্টসমূহ",
    searchPlaceholder: "বিশেষজ্ঞ খুঁজুন...",
    join: "যোগ দিন",
    notifications: "নোটিফিকেশন",
    profile: "প্রোফাইল",
    online: "অনলাইন",
    noTitle: "শিরোনামহীন ইভেন্ট",
    noNotifications: "এখনো কোনো নোটিফিকেশন নেই",
    justNow: "এইমাত্র",
    chat: "চ্যাট",
  }
  
};


type Language = 'en' | 'bn';
type TranslationKeys = keyof typeof translations.en; 

type LanguageContextType = {
  language: Language;
  toggleLanguage: () => void;
  t: (key: TranslationKeys) => string;
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  toggleLanguage: () => {},
  t: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'bn' : 'en'));
  };

  const t = (key: TranslationKeys) => {
    return translations[language][key] || key;
  };
  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};