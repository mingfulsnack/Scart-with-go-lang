// utils/clearAuth.js
export const clearAuthData = () => {
  // Clear all auth-related data from localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('accessToken'); // Để chắc chắn xóa cả old token key
  
  // Clear any other auth-related keys
  const authKeys = ['authToken', 'userInfo', 'loginData'];
  authKeys.forEach(key => localStorage.removeItem(key));
  
  console.log('✅ Cleared all authentication data');
  
  // Redirect to login page
  window.location.href = '/login';
};

export const debugToken = () => {
  const token = localStorage.getItem('token');
  console.log('Current token:', token);
  
  if (token) {
    try {
      // Try to decode JWT payload (without verification)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      console.log('Token payload:', JSON.parse(jsonPayload));
    } catch (error) {
      console.error('Token is malformed:', error);
      console.log('Token value:', token);
    }
  } else {
    console.log('No token found');
  }
}; 