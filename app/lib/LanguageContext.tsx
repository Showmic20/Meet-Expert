import React, { createContext, useContext, useState } from 'react';

// ১. আপনার অ্যাপের সব টেক্সট এখানে লিখুন
const translations = {
  en: {
    home: "Home",
    expertsForYou: "Experts For you",
    upcomingEvents: "Upcoming Events",
    searchPlaceholder: "Search for an expert",
    join: "Join",
    notifications: "Notifications",
    language: "Language (BN/EN)",
    profile: "Profile",
    logout: "Logout",
    online: "Online",
    noTitle: "Untitled Event",
  },
  bn: {
    home: "হোম",
    expertsForYou: "আপনার জন্য বিশেষজ্ঞ",
    upcomingEvents: "আসন্ন ইভেন্টসমূহ",
    searchPlaceholder: "বিশেষজ্ঞ খুঁজুন...",
    join: "যোগ দিন",
    notifications: "নোটিফিকেশন",
    language: "ভাষা (বাংলা/ইংরেজি)",
    profile: "প্রোফাইল",
    logout: "লগ আউট",
    online: "অনলাইন",
    noTitle: "শিরোনামহীন ইভেন্ট",
  }
};

type Language = 'en' | 'bn';

type LanguageContextType = {
  language: Language;
  toggleLanguage: () => void;
  t: (key: keyof typeof translations.en) => string; // Translation Helper Function
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

  // এই ফাংশনটি সঠিক টেক্সট রিটার্ন করবে
  const t = (key: keyof typeof translations.en) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};