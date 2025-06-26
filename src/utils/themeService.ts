import { ThemeType } from '../App';

class ThemeSettings {
  theme: string;
  nodeFillColor: string;
  nodeStrokeColor: string;
  textKeyColor: string;
  textValueColor: string;
  textValueNullColor: string;
  connectorStrokeColor: string;
  expandIconColor: string;
  expandIconFillColor: string;
  expandIconBorder: string;
  backgroundColor: string;
  gridlinesColor: string;
  childCountColor: string;
  booleanColor: string;
  numericColor: string;
  popupKeyColor: string;
  popupValueColor: string;
  popupContentBGColor: string;
  highlightFillColor: string;
  highlightFocusColor: string;
  highlightStrokeColor: string;

  constructor(theme: ThemeType) {
    this.theme = theme;
    
    if (theme === 'dark') {
      // Dark theme colors
      this.nodeFillColor = "rgb(41, 41, 41)";
      this.nodeStrokeColor = "rgb(66, 66, 66)";
      this.textKeyColor = "#4dabf7";
      this.textValueColor = "rgb(207, 227, 225)";
      this.textValueNullColor = "rgb(151, 150, 149)";
      this.connectorStrokeColor = "rgb(66, 66, 66)";
      this.expandIconColor = "rgb(220, 221, 222)";
      this.expandIconFillColor = "#1e1e1e";
      this.expandIconBorder = "rgb(66, 66, 66)";
      this.backgroundColor = "#1e1e1e";
      this.gridlinesColor = "rgb(45, 45, 45)";
      this.childCountColor = "rgb(255, 255, 255)";
      this.booleanColor = "rgb(61, 226, 49)";
      this.numericColor = "rgb(232, 196, 121)";
      this.popupKeyColor = "#A5D8FF";
      this.popupValueColor = "#40C057";
      this.popupContentBGColor = "#1A1A1A";
      this.highlightFillColor = "rgba(27, 255, 0, 0.1)";
      this.highlightFocusColor = "rgba(82, 102, 0, 0.61)";
      this.highlightStrokeColor = "rgb(0, 135, 54)";
    } else {
      // Light theme colors
      this.nodeFillColor = "rgb(255, 255, 255)";
      this.nodeStrokeColor = "rgb(188, 190, 192)";
      this.textKeyColor = "#A020F0";
      this.textValueColor = "rgb(83, 83, 83)";
      this.textValueNullColor = "rgb(41, 41, 41)";
      this.connectorStrokeColor = "rgb(188, 190, 192)";
      this.expandIconColor = "rgb(46, 51, 56)";
      this.expandIconFillColor = "#e0dede";
      this.expandIconBorder = "rgb(188, 190, 192)";
      this.backgroundColor = "#F8F9FA";
      this.gridlinesColor = "#EBE8E8";
      this.childCountColor = "rgb(41, 41, 41)";
      this.booleanColor = "rgb(74, 145, 67)";
      this.numericColor = "rgb(182, 60, 30)";
      this.popupKeyColor = "#5C940D";
      this.popupValueColor = "#1864AB";
      this.popupContentBGColor = "#F8F9FA";
      this.highlightFillColor = "rgba(27, 255, 0, 0.1)";
      this.highlightFocusColor = "rgba(252, 255, 166, 0.57)";
      this.highlightStrokeColor = "rgb(0, 135, 54)";
    }
  }
}

class ThemeService {
  private currentTheme: ThemeType = 'light';
  private currentThemeSettings: ThemeSettings;

  constructor() {
    this.currentThemeSettings = new ThemeSettings(this.currentTheme);
  }

  // Set a new theme and update settings
  setTheme(theme: ThemeType): void {
    this.currentTheme = theme;
    this.currentThemeSettings = new ThemeSettings(theme);
  }

  // Get the current theme name ('light' or 'dark')
  getCurrentTheme(): ThemeType {
    return this.currentTheme;
  }

  // Get the current theme settings object
  getCurrentThemeSettings(): ThemeSettings {
    return this.currentThemeSettings;
  }
}

// Export singleton instance
const themeService = new ThemeService();
export default themeService;