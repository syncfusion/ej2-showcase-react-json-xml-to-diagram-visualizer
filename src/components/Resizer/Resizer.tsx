import React, { useRef, useCallback, useEffect } from 'react';

// Type definitions for better type safety
interface ResizerProps {
  onResize?: (leftWidth: number) => void;
}

// Constants for better maintainability
const RESIZER_CONFIG = {
  RIGHT_PANEL_MIN_PERCENTAGE: 0.5, // 50% minimum width for right panel
  THROTTLE_DELAY: 16, // ~60fps for smooth resizing
  CURSOR_RESIZE: 'col-resize',
  CURSOR_DEFAULT: ''
} as const;

const DOM_SELECTORS = {
  MAIN_GRID: '.main-grid',
  LEFT_PANEL: '.left-panel',
  SPLITTER: 'splitter'
} as const;

const Resizer: React.FC<ResizerProps> = ({ onResize }) => {
  const splitterRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get main grid element with error handling
  const getMainGridElement = useCallback((): HTMLElement | null => {
    const element = document.querySelector(DOM_SELECTORS.MAIN_GRID) as HTMLElement;
    if (!element) {
      console.warn('Main grid element not found');
      return null;
    }
    return element;
  }, []);

  // Get left panel element with error handling
  const getLeftPanelElement = useCallback((): HTMLElement | null => {
    const element = document.querySelector(DOM_SELECTORS.LEFT_PANEL) as HTMLElement;
    if (!element) {
      console.warn('Left panel element not found');
      return null;
    }
    return element;
  }, []);

  // Calculate optimal left panel width based on mouse position
  const calculateLeftPanelWidth = useCallback((mouseX: number, containerWidth: number): number => {
    const rightPanelMinWidth = containerWidth * RESIZER_CONFIG.RIGHT_PANEL_MIN_PERCENTAGE;
    const maxLeftWidth = containerWidth - rightPanelMinWidth;
    
    // Ensure left panel doesn't exceed maximum allowed width
    return Math.min(Math.max(mouseX, 0), maxLeftWidth);
  }, []);

  // Update left panel width in DOM
  const updateLeftPanelWidth = useCallback((width: number): void => {
    const leftPanel = getLeftPanelElement();
    if (leftPanel) {
      leftPanel.style.width = `${width}px`;
    }
  }, [getLeftPanelElement]);

  // Set cursor style for resize operation
  const setCursorStyle = useCallback((cursorType: string): void => {
    document.body.style.cursor = cursorType;
  }, []);

  // Handle mouse down event to start dragging
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    setCursorStyle(RESIZER_CONFIG.CURSOR_RESIZE);
    event.preventDefault();
  }, [setCursorStyle]);

  // Handle mouse move event with throttling for performance
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDraggingRef.current) return;

    // Throttle mouse move events for better performance
    if (throttleTimeoutRef.current) return;

    throttleTimeoutRef.current = setTimeout(() => {
      const mainGrid = getMainGridElement();
      if (!mainGrid) return;

      const containerWidth = mainGrid.offsetWidth;
      const calculatedLeftWidth = calculateLeftPanelWidth(event.clientX, containerWidth);
      
      // Update DOM and notify parent component
      updateLeftPanelWidth(calculatedLeftWidth);
      
      if (onResize) {
        onResize(calculatedLeftWidth);
      }

      throttleTimeoutRef.current = null;
    }, RESIZER_CONFIG.THROTTLE_DELAY);
  }, [getMainGridElement, calculateLeftPanelWidth, updateLeftPanelWidth, onResize]);

  // Handle mouse up event to stop dragging
  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setCursorStyle(RESIZER_CONFIG.CURSOR_DEFAULT);
      
      // Clear any pending throttled updates
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
        throttleTimeoutRef.current = null;
      }
    }
  }, [setCursorStyle]);

  // Handle keyboard events for accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      // Could implement keyboard-based resizing here
    }
  }, []);

  // Setup and cleanup global event listeners
  useEffect(() => {
    const mouseMoveHandler = handleMouseMove;
    const mouseUpHandler = handleMouseUp;

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);

    return () => {
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      
      // Cleanup throttle timeout on unmount
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
      
      // Reset cursor style on cleanup
      setCursorStyle(RESIZER_CONFIG.CURSOR_DEFAULT);
    };
  }, [handleMouseMove, handleMouseUp, setCursorStyle]);

  return (
    <div
      ref={splitterRef}
      className={DOM_SELECTORS.SPLITTER}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panels"
      tabIndex={0}
    />
  );
};

export default Resizer;