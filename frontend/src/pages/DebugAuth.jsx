import React from 'react';
import { clearAuthData, debugToken } from '../utils/clearAuth';
import { useAuth } from '../context/AuthContext';

const DebugAuth = () => {
  const { user, token, isLoggedIn } = useAuth();

  const handleClearAuth = () => {
    if (window.confirm('Bạn có chắc muốn xóa tất cả dữ liệu đăng nhập?')) {
      clearAuthData();
    }
  };

  const handleDebugToken = () => {
    debugToken();
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>🔧 Debug Authentication</h2>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
        <h3>Current Auth State:</h3>
        <p><strong>Is Logged In:</strong> {isLoggedIn ? '✅ Yes' : '❌ No'}</p>
        <p><strong>User:</strong> {user ? JSON.stringify(user, null, 2) : 'None'}</p>
        <p><strong>Token (first 50 chars):</strong> {token ? token.substring(0, 50) + '...' : 'None'}</p>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '5px' }}>
        <h3>LocalStorage Data:</h3>
        <p><strong>Token:</strong> {localStorage.getItem('token') ? localStorage.getItem('token').substring(0, 50) + '...' : 'None'}</p>
        <p><strong>User:</strong> {localStorage.getItem('user') || 'None'}</p>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={handleDebugToken}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🔍 Debug Token (Check Console)
        </button>
        
        <button 
          onClick={handleClearAuth}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🗑️ Clear Auth Data
        </button>
        
        <button 
          onClick={() => window.location.href = '/login'}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🔐 Go to Login
        </button>
        
        <button 
          onClick={() => window.location.href = '/admin/login'}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6f42c1',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
        👨‍💼 Go to Admin Login
        </button>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#d1ecf1', borderRadius: '5px' }}>
        <h3>Instructions:</h3>
        <ol>
          <li>Nếu bạn gặp lỗi "JWT malformed", click <strong>"Clear Auth Data"</strong></li>
          <li>Sau đó đăng nhập lại</li>
          <li>Nếu vẫn lỗi, check console với <strong>"Debug Token"</strong></li>
          <li>Đảm bảo backend đang chạy trên port 5000</li>
        </ol>
      </div>
    </div>
  );
};

export default DebugAuth; 