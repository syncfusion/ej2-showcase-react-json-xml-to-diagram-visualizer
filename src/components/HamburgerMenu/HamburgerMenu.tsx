import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DropDownButtonComponent, ItemModel } from '@syncfusion/ej2-react-splitbuttons';
import { MenuEventArgs } from '@syncfusion/ej2-splitbuttons';

// Type definitions for better type safety
interface HamburgerMenuProps {
  onExportImage: () => void;
  onRotateLayout: () => void;
  onCollapseGraph: () => void;
  isGraphCollapsed: boolean;
}

// Menu item identifier
const MENU_IDS = {
  EXPORT_IMAGE: 'exportImage',
  ROTATE_LAYOUT: 'rotateLayout',
  COLLAPSE_GRAPH: 'collapseGraph'
} as const;

// Icon CSS classes for menu items
const MENU_ICONS = {
  EXPORT: 'e-icons e-export',
  REFRESH: 'e-icons e-refresh',
  COLLAPSE: 'e-icons e-collapse-2',
  EXPAND: 'e-icons e-expand',
  HAMBURGER: 'e-icons e-menu'
} as const;

// CSS classes for styling
const MENU_STYLES = {
  CONTAINER: 'hamburger-menu',
  HIDE_CARET: 'e-caret-hide'
} as const;

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  onExportImage,
  onRotateLayout,
  onCollapseGraph,
  isGraphCollapsed
}) => {
  // Create base menu items configuration
  const getBaseMenuItems = useCallback((): ItemModel[] => [
    { 
      text: 'Export as Image', 
      id: MENU_IDS.EXPORT_IMAGE, 
      iconCss: MENU_ICONS.EXPORT 
    },
    { 
      text: 'Rotate Layout', 
      id: MENU_IDS.ROTATE_LAYOUT, 
      iconCss: MENU_ICONS.REFRESH 
    },
    { 
      text: 'Collapse Graph', 
      id: MENU_IDS.COLLAPSE_GRAPH, 
      iconCss: MENU_ICONS.COLLAPSE 
    }
  ], []);

  // State management for menu items
  const [menuItems, setMenuItems] = useState<ItemModel[]>(getBaseMenuItems);

  // Update collapse/expand menu item based on graph state
  const updateCollapseMenuItem = useCallback((items: ItemModel[], isCollapsed: boolean): ItemModel[] => {
    return items.map(item => 
      item.id === MENU_IDS.COLLAPSE_GRAPH 
        ? {
            ...item,
            text: isCollapsed ? 'Expand Graph' : 'Collapse Graph',
            iconCss: isCollapsed ? MENU_ICONS.EXPAND : MENU_ICONS.COLLAPSE
          }
        : item
    );
  }, []);

  // Update menu items when graph collapse state changes
  useEffect(() => {
    setMenuItems(prevItems => updateCollapseMenuItem(prevItems, isGraphCollapsed));
  }, [isGraphCollapsed, updateCollapseMenuItem]);

  // Handle menu item selection with proper action routing
  const handleMenuSelect = useCallback((args: MenuEventArgs) => {
    const menuId = args.item.id;
    
    // Route to appropriate action based on menu item selected
    switch (menuId) {
      case MENU_IDS.EXPORT_IMAGE:
        onExportImage();
        break;
      case MENU_IDS.ROTATE_LAYOUT:
        onRotateLayout();
        break;
      case MENU_IDS.COLLAPSE_GRAPH:
        onCollapseGraph();
        break;
      default:
        console.warn(`Unknown menu item selected: ${menuId}`);
    }
  }, [onExportImage, onRotateLayout, onCollapseGraph]);

  // Memoize dropdown button props for performance
  const dropdownProps = useMemo(() => ({
    iconCss: MENU_ICONS.HAMBURGER,
    cssClass: MENU_STYLES.HIDE_CARET,
    items: menuItems,
    select: handleMenuSelect
  }), [menuItems, handleMenuSelect]);

  return (
    <div className={MENU_STYLES.CONTAINER}>
      <DropDownButtonComponent {...dropdownProps} />
    </div>
  );
};

export default HamburgerMenu;