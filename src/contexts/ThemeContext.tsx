import React, { createContext, useContext, useState, ReactNode } from 'react';
import themeService from '../utils/themeService';
import { ThemeType } from '../App';

// Define the shape of theme context data
interface ThemeContextType {
  theme: ThemeType;
  themeSettings: any;
  setTheme: (theme: ThemeType) => void;
}

// Create theme context with undefined default value
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Props interface for ThemeProvider component
interface ThemeProviderProps {
  children: ReactNode;
}

// Theme provider component that manages theme state and provides context
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Initialize theme state from theme service
  const [theme, setThemeState] = useState<ThemeType>(themeService.getCurrentTheme());
  // Initialize theme settings state from theme service
  const [themeSettings, setThemeSettings] = useState(themeService.getCurrentThemeSettings());

  // Function to update theme and sync with theme service
  const setTheme = (newTheme: ThemeType) => {
    themeService.setTheme(newTheme); // Update theme service
    setThemeState(newTheme); // Update local theme state
    setThemeSettings(themeService.getCurrentThemeSettings()); // Update theme settings
  };

  // Context value object containing theme data and setter
  const value: ThemeContextType = {
    theme,
    themeSettings,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to access theme context with error handling
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  // Throw error if hook is used outside of ThemeProvider
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};