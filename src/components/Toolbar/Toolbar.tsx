import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ToolbarComponent, ItemsDirective, ItemDirective } from '@syncfusion/ej2-react-navigations';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { ClickEventArgs } from '@syncfusion/ej2-navigations';

// Type definitions for better type safety
interface ToolbarProps {
  onToolClick: (action: string) => void;
  onSearch: (query: string) => void;
}

interface SearchCounter {
  current: number;
  total: number;
}

// Constants for better maintainability
const ZOOM_TOOLBAR_ITEMS = [
  {
    prefixIcon: "e-icons e-reset",
    tooltipText: "Reset Zoom",
    id: "reset",
    cssClass: "e-flat toolbar-btn",
  },
  {
    prefixIcon: "e-icons e-zoom-to-fit",
    tooltipText: "Fit To Page",
    id: "fitToPage",
    cssClass: "e-flat toolbar-btn",
  },
  {
    prefixIcon: "e-icons e-zoom-in",
    tooltipText: "Zoom In",
    id: "zoomIn",
    cssClass: "e-flat toolbar-btn",
  },
  {
    prefixIcon: "e-icons e-zoom-out",
    tooltipText: "Zoom Out",
    id: "zoomOut",
    cssClass: "e-flat toolbar-btn",
  },
] as const;

const Toolbar: React.FC<ToolbarProps> = ({ onToolClick, onSearch }) => {
  const searchRef = useRef<TextBoxComponent>(null);
  const [searchCounter, setSearchCounter] = useState<SearchCounter>({ current: 0, total: 0 });
  const [showCounter, setShowCounter] = useState<boolean>(false);

  // Handle toolbar button clicks and route to appropriate action
  const handleToolbarClick = (args: ClickEventArgs) => {
    if (args.item && args.item.id) {
      onToolClick(args.item.id);
    }
  };

  // Handle search input changes and update counter visibility
  const handleSearchInput = (args: any) => {
    const searchQuery = args.value?.trim() || '';
    setShowCounter(searchQuery.length > 0);
    onSearch(searchQuery);
  };

  // Clear search input and reset all search-related state
  const clearSearchInput = useCallback(() => {
    if (searchRef.current) {
      searchRef.current.value = '';
      setShowCounter(false);
      setSearchCounter({ current: 0, total: 0 });
      onSearch(''); // Trigger search with empty string to reset highlights
    }
  }, [onSearch]);

  // Configure search textbox after creation with icon and counter
  const handleSearchCreated = () => {
    setTimeout(() => {
      const searchContainer = document.querySelector('.search-bar-container .e-input-group');
      
      if (searchContainer) {
        // Add search icon if not already present
        if (!searchContainer.querySelector('.e-search')) {
          // Method 1: Using addIcon (similar to JS version)
          if (searchRef.current) {
            searchRef.current.addIcon('prepend', 'e-icons e-search search-icon');
          }
        }

        // Add counter element if not already present
        if (!searchContainer.querySelector('.search-counter')) {
          const searchResultCounter = document.createElement('span');
          searchResultCounter.className = 'e-input-group-icon counter-icon search-counter';
          searchResultCounter.style.fontSize = '.75rem';
          searchResultCounter.style.display = showCounter ? 'flex' : 'none';
          searchContainer.appendChild(searchResultCounter);
        }
      }
    }, 100);
  };

  // Update search counter display when counter values or visibility changes
  useEffect(() => {
    const counterElement = document.querySelector('.search-counter') as HTMLElement;
    if (counterElement) {
      counterElement.textContent = `${searchCounter.current} / ${searchCounter.total}`;
      counterElement.style.display = showCounter ? 'flex' : 'none';
    }
  }, [searchCounter, showCounter]);

  // Expose updateSearchCounter and clearSearchInput methods to parent component via window object
  useEffect(() => {
    // Function to update search counter from external components
    const updateSearchCounter = (current: number, total: number) => {
      setSearchCounter({ current, total });
    };

    // Attach methods to window for global access
    (window as any).updateSearchCounter = updateSearchCounter;
    (window as any).clearSearchInput = clearSearchInput;

    // Cleanup methods on component unmount
    return () => {
      delete (window as any).updateSearchCounter;
      delete (window as any).clearSearchInput; 
    };
  }, [clearSearchInput]);

  return (
    <div className="toolbar-container">
      {/* Toolbar with zoom control buttons */}
      <div className="toolbar-wrapper">
        <ToolbarComponent
          overflowMode="Extended"
          clicked={handleToolbarClick}
        >
          <ItemsDirective>
            {ZOOM_TOOLBAR_ITEMS.map((item, index) => (
              <ItemDirective
                key={index}
                prefixIcon={item.prefixIcon}
                tooltipText={item.tooltipText}
                id={item.id}
                cssClass={item.cssClass}
              />
            ))}
          </ItemsDirective>
        </ToolbarComponent>
      </div>

      {/* Search functionality container */}
      <div className="search-bar-container">
        <TextBoxComponent
          ref={searchRef}
          placeholder="Search Node"
          cssClass="toolbar-search"
          input={handleSearchInput}
          created={handleSearchCreated}
        />
      </div>
    </div>
  );
};

export default Toolbar;