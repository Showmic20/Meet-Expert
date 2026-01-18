import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MD3LightTheme,
  MD3DarkTheme,
  PaperProvider,
  adaptNavigationTheme,
} from 'react-native-paper';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';

// 1. Merge Navigation Themes with Paper Themes
const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
});

const CombinedLightTheme = {
  ...MD3LightTheme,
  ...LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...LightTheme.colors,
    primary: '#2196F3', // Change your primary color here
    background: '#ffffff',
    surface: '#ffffff',
  },
};

const CombinedDarkTheme = {
  ...MD3DarkTheme,
  ...DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...DarkTheme.colors,
    primary: '#90CAF9', 
    background: '#121212',
    surface: '#1E1E1E',
  },
};

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
});

export const useAppTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // 2. Load saved theme from storage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('userTheme');
        if (savedTheme) {
          setIsDarkMode(savedTheme === 'dark');
        } else {
          setIsDarkMode(systemScheme === 'dark');
        }
      } catch (e) {
        console.log('Error loading theme:', e);
      } finally {
        setLoaded(true);
      }
    };
    loadTheme();
  }, []);

  // 3. Toggle function
  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    await AsyncStorage.setItem('userTheme', newMode ? 'dark' : 'light');
  };

  const theme = isDarkMode ? CombinedDarkTheme : CombinedLightTheme;

  // Prevent white flash while loading
  if (!loaded) {
    return null; 
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {/* We cast to 'any' to avoid TypeScript conflicts between Paper and Navigation types */}
      <PaperProvider theme={theme as any}>
        <NavigationThemeProvider value={theme as any}>
          {children}
        </NavigationThemeProvider>
      </PaperProvider>
    </ThemeContext.Provider>
  );
};