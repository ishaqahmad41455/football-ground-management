// Authentication helper functions
const getAuthToken = () => localStorage.getItem('authToken');
const getCurrentUser = () => JSON.parse(localStorage.getItem('userData'));

// Make authenticated API requests
async function authFetch(url, options = {}) {
    const token = getAuthToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    if (options.body) {
        mergedOptions.body = JSON.stringify(options.body);
    }
    
    const response = await fetch(url, mergedOptions);
    
    if (response.status === 401) {
        logout();
        throw new Error('Session expired. Please login again.');
    }
    
    return response;
}