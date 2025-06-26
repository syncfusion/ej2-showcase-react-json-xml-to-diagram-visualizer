import React, { useState, useRef, useCallback } from 'react';
import { DialogComponent } from '@syncfusion/ej2-react-popups';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { RadioButtonComponent } from '@syncfusion/ej2-react-buttons';

// Type definitions for better type safety
interface ExportDialogProps {
  isVisible: boolean;
  onClose: () => void;
  onExport: (fileName: string, format: string) => void;
}

interface TextBoxChangeArgs {
  value: string;
}

// Constants for better maintainability
const EXPORT_FORMATS = ['PNG', 'JPG', 'SVG'] as const;
const DEFAULT_FILE_NAME = 'Diagram';
const DIALOG_WIDTH = '300px';

const DIALOG_STYLES = {
  container: { marginTop: '-20px' },
  formatSection: { marginTop: '20px' },
  radioButton: { marginRight: '16px', display: 'inline-block' }
};

const ExportDialog: React.FC<ExportDialogProps> = ({ isVisible, onClose, onExport }) => {
  // State management for dialog inputs
  const [fileName, setFileName] = useState<string>(DEFAULT_FILE_NAME);
  const [selectedFormat, setSelectedFormat] = useState<string>('PNG');
  const dialogRef = useRef<DialogComponent>(null);

  // Handle export button click with validation
  const handleExport = useCallback(() => {
    // Sanitize and validate file name input
    const sanitizedFileName = fileName.trim() || 'diagram';
    const finalFileName = sanitizedFileName.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    onExport(finalFileName, selectedFormat);
    onClose();
  }, [fileName, selectedFormat, onExport, onClose]);

  // Handle dialog overlay click to close dialog
  const handleOverlayClick = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle file name input changes
  const handleFileNameChange = useCallback((args: TextBoxChangeArgs) => {
    setFileName(args.value);
  }, []);

  // Handle format selection changes
  const handleFormatChange = useCallback((format: string) => {
    setSelectedFormat(format);
  }, []);

  // Configure dialog action buttons
  const getDialogButtons = useCallback(() => [
    {
      click: handleExport,
      buttonModel: { content: 'Export', isPrimary: true },
    },
  ], [handleExport]);

  // Render file name input section
  const renderFileNameSection = () => (
    <div>
      <p>File Name</p>
      <TextBoxComponent
        placeholder="Enter file name"
        value={fileName}
        input={handleFileNameChange}
        floatLabelType="Never"
      />
    </div>
  );

  // Render format selection radio buttons
  const renderFormatSection = () => (
    <div style={DIALOG_STYLES.formatSection}>
      <p>Format</p>
      <div>
        {EXPORT_FORMATS.map((format, index) => (
          <div key={format} style={DIALOG_STYLES.radioButton}>
            <RadioButtonComponent
              label={format}
              name="exportMode"
              checked={selectedFormat === format}
              change={() => handleFormatChange(format)}
            />
          </div>
        ))}
      </div>
    </div>
  );

  // Render complete dialog content
  const renderDialogContent = () => (
    <div style={DIALOG_STYLES.container}>
      {renderFileNameSection()}
      {renderFormatSection()}
    </div>
  );

  return (
    <DialogComponent
      ref={dialogRef}
      header="Export Options"
      showCloseIcon={true}
      isModal={true}
      visible={isVisible}
      width={DIALOG_WIDTH}
      content={renderDialogContent}
      buttons={getDialogButtons()}
      overlayClick={handleOverlayClick}
      closeOnEscape={true}
    />
  );
};

export default ExportDialog;