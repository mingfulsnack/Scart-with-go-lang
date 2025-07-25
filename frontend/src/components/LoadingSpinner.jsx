import React from 'react';

function LoadingSpinner() {
  return (
    <div className="loading-spinner-container">
      <div className="loading-spinner">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
      <style jsx="true">{`
        .loading-spinner-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(255, 255, 255, 0.9);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }
        
        .loading-spinner {
          text-align: center;
        }
        
        .spinner-border {
          width: 3rem;
          height: 3rem;
        }
      `}</style>
    </div>
  );
}

export default LoadingSpinner; 