import React, { useEffect, useRef } from 'react';
import { createSpinner, showSpinner, hideSpinner } from '@syncfusion/ej2-popups';

interface SpinnerProps {
  isVisible: boolean;
  target?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ isVisible, target = 'spinner-container' }) => {
  const spinnerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (spinnerRef.current && !isInitialized.current) {
      // Initialize spinner only once
      createSpinner({
        target: spinnerRef.current,
      });
      isInitialized.current = true;
    }
  }, []);

  useEffect(() => {
    if (spinnerRef.current && isInitialized.current) {
      if (isVisible) {
        showSpinner(spinnerRef.current);
      } else {
        hideSpinner(spinnerRef.current);
      }
    }
  }, [isVisible]);

  return (
    <div 
      ref={spinnerRef} 
      id={target}
      className="e-spinner-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1000,
        display: isVisible ? 'block' : 'none'
      }}
    />
  );
};

export default Spinner;