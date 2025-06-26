import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { DialogComponent } from '@syncfusion/ej2-react-popups';
import { useTheme } from '../../contexts/ThemeContext';

// Type definitions for better type safety
interface NodeDetailsDialogProps {
  isVisible: boolean;
  nodeContent: string;
  nodePath: string;
  onClose: () => void;
}

interface JsonLine {
  key: string;
  value: string;
  hasComma: boolean;
}

interface CopyStates {
  content: boolean;
  path: boolean;
}

// Constants for better maintainability
const DIALOG_CONFIG = {
  WIDTH: '400px',
  HEADER: 'Node Details',
  CSS_CLASS: 'node-details-dialog',
  ANIMATION_EFFECT: 'Zoom' as const,
  COPY_FEEDBACK_DURATION: 1500
} as const;

const COPY_BUTTON_CLASSES = {
  CONTENT: 'copy-content-btn',
  PATH: 'copy-path-btn'
} as const;

const ICON_CLASSES = {
  COPY: 'e-icons e-copy',
  CHECK: 'e-icons e-check'
} as const;

const DIALOG_STYLES = {
  container: { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px' },
  section: { marginBottom: '15px' },
  label: { fontWeight: 500, display: 'block', marginBottom: '5px' },
  dialogBox: { borderRadius: '5px', position: 'relative' as const },
  codeContent: { 
    padding: '10px', 
    overflowX: 'auto' as const, 
    fontFamily: 'Consolas', 
    fontSize: '14px' 
  },
  jsonLine: { lineHeight: '16px' },
  jsonKey: { fontWeight: 550, marginLeft: '14px' },
  copyButton: {
    position: 'absolute' as const,
    top: '5px',
    right: '5px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px'
  },
  copyIcon: { color: '#6C757D' }
} as const;

const NodeDetailsDialog: React.FC<NodeDetailsDialogProps> = ({
  isVisible,
  nodeContent,
  nodePath,
  onClose,
}) => {
  const { themeSettings } = useTheme();
  const [copyStates, setCopyStates] = useState<CopyStates>({ content: false, path: false });
  const timeoutRefs = useRef<{ content?: NodeJS.Timeout; path?: NodeJS.Timeout }>({});

  // Parse content lines into formatted JSON key-value pairs
  const formatJsonLines = useCallback((inputContent: string): JsonLine[] => {
    if (!inputContent?.trim()) return [];

    return inputContent.split('\n').reduce<JsonLine[]>((acc, currentLine, lineIndex, arr) => {
      const colonIndex = currentLine.indexOf(':');
      if (colonIndex === -1) return acc;

      const extractedKey = currentLine.slice(0, colonIndex).trim();
      let extractedValue = currentLine.slice(colonIndex + 1).trim();
      let processedValue: string;

      // Format value based on type (boolean, number, or string)
      if (/^(true|false)$/i.test(extractedValue)) {
        processedValue = extractedValue.toLowerCase();
      } else if (!isNaN(parseFloat(extractedValue))) {
        processedValue = extractedValue;
      } else {
        processedValue = `"${extractedValue.replace(/^"(.*)"$/, '$1')}"`;
      }

      acc.push({
        key: `"${extractedKey}"`,
        value: processedValue,
        hasComma: lineIndex !== arr.length - 1,
      });
      return acc;
    }, []);
  }, []);

  // Add curly braces around root path for better display
  const formatRootPath = useCallback((pathInput: string): string => {
    return pathInput.startsWith('Root') ? `{Root}${pathInput.slice(4)}` : pathInput;
  }, []);

  // Memoized computed values
  const jsonLines = useMemo(() => formatJsonLines(nodeContent), [nodeContent, formatJsonLines]);
  const formattedPath = useMemo(() => formatRootPath(nodePath.trim()), [nodePath, formatRootPath]);

  // Handle copy operations with visual feedback and DOM manipulation
  const handleCopy = useCallback(async (text: string, type: keyof CopyStates) => {
    try {
      await navigator.clipboard.writeText(text);
      
      // Clear existing timeout for this type
      if (timeoutRefs.current[type]) {
        clearTimeout(timeoutRefs.current[type]);
      }
      
      // Set copy success state
      setCopyStates(prev => ({ ...prev, [type]: true }));

      // Direct DOM manipulation for Syncfusion compatibility
      const buttonSelector = type === 'content' ? `.${COPY_BUTTON_CLASSES.CONTENT}` : `.${COPY_BUTTON_CLASSES.PATH}`;
      const iconElement = document.querySelector(`${buttonSelector} span`);
      if (iconElement) {
        iconElement.className = ICON_CLASSES.CHECK;
      }

      // Reset state after delay
      timeoutRefs.current[type] = setTimeout(() => {
        setCopyStates(prev => ({ ...prev, [type]: false }));
        // Reset the icon back to copy
        if (iconElement) {
          iconElement.className = ICON_CLASSES.COPY;
        }
        delete timeoutRefs.current[type];
      }, DIALOG_CONFIG.COPY_FEEDBACK_DURATION);
      
    } catch (error) {
      console.error('Failed to copy text to clipboard:', error);
    }
  }, []);

  // Copy formatted JSON content to clipboard
  const handleCopyContent = useCallback(() => {
    if (!jsonLines.length) {
      handleCopy(`"${nodeContent.trim()}"`, 'content');
      return;
    }

    const formattedJson = '{\n' +
      jsonLines.map(({ key, value, hasComma }) => 
        `    ${key}: ${value}${hasComma ? ',' : ''}`
      ).join('\n') +
      '\n}';
    
    handleCopy(formattedJson, 'content');
  }, [jsonLines, nodeContent, handleCopy]);

  // Copy formatted path to clipboard
  const handleCopyPath = useCallback(() => {
    handleCopy(formattedPath, 'path');
  }, [formattedPath, handleCopy]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  // Reset copy states when dialog closes
  useEffect(() => {
    if (!isVisible) {
      setCopyStates({ content: false, path: false });
      Object.values(timeoutRefs.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
      timeoutRefs.current = {};
    }
  }, [isVisible]);

  // Update icons when copy states change (fallback for React state changes)
  useEffect(() => {
    if (isVisible) {
      const contentIcon = document.querySelector(`.${COPY_BUTTON_CLASSES.CONTENT} span`);
      const pathIcon = document.querySelector(`.${COPY_BUTTON_CLASSES.PATH} span`);

      if (contentIcon) {
        contentIcon.className = copyStates.content ? ICON_CLASSES.CHECK : ICON_CLASSES.COPY;
      }
      if (pathIcon) {
        pathIcon.className = copyStates.path ? ICON_CLASSES.CHECK : ICON_CLASSES.COPY;
      }
    }
  }, [copyStates, isVisible]);

  // Render copy button with dynamic icon
  const renderCopyButton = (type: keyof CopyStates, onClick: () => void, className: string) => (
    <button
      className={className}
      type="button"
      onClick={onClick}
      style={DIALOG_STYLES.copyButton}
      title={copyStates[type] ? 'Copied!' : 'Copy'}
    >
      <span
        className={copyStates[type] ? ICON_CLASSES.CHECK : ICON_CLASSES.COPY}
        style={DIALOG_STYLES.copyIcon}
      />
    </button>
  );

  // Render JSON content with syntax highlighting
  const renderJsonContent = () => {
    if (!jsonLines.length) {
      return (
        <span style={{ color: themeSettings.popupValueColor }}>
          "{nodeContent.trim()}"
        </span>
      );
    }

    return (
      <>
        <div>{'{'}</div>
        {jsonLines.map(({ key, value, hasComma }, index) => (
          <div key={`${key}-${index}`} style={DIALOG_STYLES.jsonLine}>
            <span style={{ 
              color: themeSettings.popupKeyColor, 
              ...DIALOG_STYLES.jsonKey
            }}>
              {key}
            </span>
            <span style={{ marginRight: '3px' }}>:</span>
            <span style={{ color: themeSettings.popupValueColor }}>
              {value}
            </span>
            {hasComma ? ',' : ''}
          </div>
        ))}
        <div>{'}'}</div>
      </>
    );
  };

  // Render content section with copy functionality
  const renderContentSection = () => (
    <div style={DIALOG_STYLES.section}>
      <label style={DIALOG_STYLES.label}>Content</label>
      <div className="dialog-box" style={DIALOG_STYLES.dialogBox}>
        <div style={DIALOG_STYLES.codeContent}>
          {renderJsonContent()}
        </div>
        {renderCopyButton('content', handleCopyContent, COPY_BUTTON_CLASSES.CONTENT)}
      </div>
    </div>
  );

  // Render path section with copy functionality
  const renderPathSection = () => (
    <div>
      <label style={DIALOG_STYLES.label}>JSON Path</label>
      <div className="dialog-box" style={DIALOG_STYLES.dialogBox}>
        <div style={DIALOG_STYLES.codeContent}>
          {formattedPath}
        </div>
        {renderCopyButton('path', handleCopyPath, COPY_BUTTON_CLASSES.PATH)}
      </div>
    </div>
  );

  // Render complete dialog content
  const renderDialogContent = () => (
    <div style={DIALOG_STYLES.container}>
      {renderContentSection()}
      {renderPathSection()}
    </div>
  );

  if (!isVisible) return null;

  return (
    <DialogComponent
      width={DIALOG_CONFIG.WIDTH}
      header={DIALOG_CONFIG.HEADER}
      showCloseIcon={true}
      isModal={true}
      visible={isVisible}
      animationSettings={{ effect: DIALOG_CONFIG.ANIMATION_EFFECT }}
      closeOnEscape={true}
      close={onClose}
      overlayClick={onClose}
      target="body"
      cssClass={DIALOG_CONFIG.CSS_CLASS}
      content={renderDialogContent}
    />
  );
};

export default NodeDetailsDialog;