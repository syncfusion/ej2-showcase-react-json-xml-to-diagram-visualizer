import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { DropDownButtonComponent, ItemModel } from '@syncfusion/ej2-react-splitbuttons';
import { MenuEventArgs } from '@syncfusion/ej2-splitbuttons';
import { ChangeEventArgs } from '@syncfusion/ej2-dropdowns';
import { useTheme } from '../../contexts/ThemeContext';
import { EditorType, ThemeType } from '../../App';
import logoSvg from '../../assets/logo.svg';

// Type definitions for better type safety
interface NavMenuProps {
  currentEditorType: EditorType;
  onEditorTypeChange: (type: EditorType) => void;
  onFileAction: (action: string) => void;
  onViewOptionToggle: (optionId: string) => void;
  onThemeChange: (theme: ThemeType) => void;
}

// Menu item identifiers as constants
const MENU_IDS = {
  FILE: {
    IMPORT: 'import',
    EXPORT: 'export'
  },
  VIEW: {
    GRID: 'view-grid',
    COUNT: 'view-count',
    EXPAND_COLLAPSE: 'expand-collapse'
  },
  THEME: {
    LIGHT: 'light',
    DARK: 'dark'
  }
} as const;

// Icon CSS classes for menu items
const MENU_ICONS = {
  IMPORT: 'e-icons e-import',
  EXPORT: 'e-icons e-export',
  CHECK: 'e-icons e-check'
} as const;

// CSS classes for styling
const NAV_STYLES = {
  NAVBAR: 'navbar',
  NAVBAR_LEFT: 'navbar-left',
  NAVBAR_RIGHT: 'navbar-right',
  NAV_LOGO: 'nav-logo',
  NAV_TITLE: 'nav-title'
} as const;

// Default active view options
const DEFAULT_ACTIVE_VIEW_OPTIONS = new Set([
  MENU_IDS.VIEW.GRID,
  MENU_IDS.VIEW.COUNT,
  MENU_IDS.VIEW.EXPAND_COLLAPSE
]);

const NavMenu: React.FC<NavMenuProps> = ({
  currentEditorType,
  onEditorTypeChange,
  onFileAction,
  onViewOptionToggle,
  onThemeChange
}) => {
  const { theme } = useTheme();
  
  // State management for active view options
  const [activeViewOptions, setActiveViewOptions] = useState<Set<string>>(DEFAULT_ACTIVE_VIEW_OPTIONS);

  // Create editor type dropdown data configuration
  const editorTypeData = useMemo(() => [
    { text: 'JSON', value: 'json' },
    { text: 'XML', value: 'xml' }
  ], []);

  // Create file operations menu items configuration
  const fileMenuItems = useMemo((): ItemModel[] => [
    { text: 'Import', id: MENU_IDS.FILE.IMPORT, iconCss: MENU_ICONS.IMPORT },
    { text: 'Export', id: MENU_IDS.FILE.EXPORT, iconCss: MENU_ICONS.EXPORT }
  ], []);

  // Create view options menu items with dynamic check icons
  const viewMenuItems = useMemo((): ItemModel[] => [
    { 
      text: 'Show Grid', 
      id: MENU_IDS.VIEW.GRID, 
      iconCss: activeViewOptions.has(MENU_IDS.VIEW.GRID) ? MENU_ICONS.CHECK : '' 
    },
    { 
      text: 'Item Count', 
      id: MENU_IDS.VIEW.COUNT, 
      iconCss: activeViewOptions.has(MENU_IDS.VIEW.COUNT) ? MENU_ICONS.CHECK : '' 
    },
    { 
      text: 'Show Expand/Collapse', 
      id: MENU_IDS.VIEW.EXPAND_COLLAPSE, 
      iconCss: activeViewOptions.has(MENU_IDS.VIEW.EXPAND_COLLAPSE) ? MENU_ICONS.CHECK : '' 
    }
  ], [activeViewOptions]);

  // Create theme selector menu items with dynamic check icons
  const themeMenuItems = useMemo((): ItemModel[] => [
    { 
      text: 'Light', 
      id: MENU_IDS.THEME.LIGHT, 
      iconCss: theme === MENU_IDS.THEME.LIGHT ? MENU_ICONS.CHECK : '' 
    },
    { 
      text: 'Dark', 
      id: MENU_IDS.THEME.DARK, 
      iconCss: theme === MENU_IDS.THEME.DARK ? MENU_ICONS.CHECK : '' 
    }
  ], [theme]);

  // Handle editor type dropdown selection change
  const handleEditorTypeChange = useCallback((args: ChangeEventArgs) => {
    onEditorTypeChange(args.value as EditorType);
  }, [onEditorTypeChange]);

  // Handle file menu item selection
  const handleFileMenuSelect = useCallback((args: MenuEventArgs) => {
    const actionId = args.item.id;
    if (actionId) {
      onFileAction(actionId);
    }
  }, [onFileAction]);

  // Toggle view option active state and update UI
  const handleViewMenuSelect = useCallback((args: MenuEventArgs) => {
    const optionId = args.item.id;
    if (!optionId) return;

    // Create new Set to trigger re-render with updated state
    setActiveViewOptions(prevOptions => {
      const newOptions = new Set(prevOptions);
      if (newOptions.has(optionId)) {
        newOptions.delete(optionId);
      } else {
        newOptions.add(optionId);
      }
      return newOptions;
    });

    onViewOptionToggle(optionId);
  }, [onViewOptionToggle]);

  // Handle theme selection and update theme state
  const handleThemeMenuSelect = useCallback((args: MenuEventArgs) => {
    const selectedTheme = args.item.id as ThemeType;
    if (selectedTheme) {
      onThemeChange(selectedTheme);
    }
  }, [onThemeChange]);

  // Generate navigation title based on current editor type
  const getNavTitle = useCallback((): string => {
    return `${currentEditorType.toUpperCase()} To Diagram`;
  }, [currentEditorType]);

  // Render logo and title section
  const renderLogoSection = () => (
    <>
      <img src={logoSvg} alt="Logo" className={NAV_STYLES.NAV_LOGO} />
      <span className={NAV_STYLES.NAV_TITLE}>{getNavTitle()}</span>
    </>
  );

  // Render main navigation menu buttons
  const renderMenuButtons = () => (
    <>
      <DropDownButtonComponent
        items={fileMenuItems}
        select={handleFileMenuSelect}
      >
        File
      </DropDownButtonComponent>

      <DropDownButtonComponent
        items={viewMenuItems}
        select={handleViewMenuSelect}
      >
        View
      </DropDownButtonComponent>

      <DropDownButtonComponent
        items={themeMenuItems}
        select={handleThemeMenuSelect}
      >
        Theme
      </DropDownButtonComponent>
    </>
  );

  // Render editor type selector dropdown
  const renderEditorTypeSelector = () => (
    <DropDownListComponent
      width="90px"
      dataSource={editorTypeData}
      fields={{ text: 'text', value: 'value' }}
      value={currentEditorType}
      change={handleEditorTypeChange}
    />
  );

  return (
    <div className={NAV_STYLES.NAVBAR}>
      {/* Left side of navbar with logo and main menu buttons */}
      <div className={NAV_STYLES.NAVBAR_LEFT}>
        {renderLogoSection()}
        {renderMenuButtons()}
      </div>

      {/* Right side of navbar with editor type toggle */}
      <div className={NAV_STYLES.NAVBAR_RIGHT}>
        {renderEditorTypeSelector()}
      </div>
    </div>
  );
};

export default NavMenu;