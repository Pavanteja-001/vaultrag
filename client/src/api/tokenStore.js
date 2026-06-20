// In-memory JWT store — module-scoped variable, never exposed on window/localStorage.
// The axiosClient and AuthContext both import from here to share the token
// without making it accessible to injected scripts via window or global scope.
let _accessToken = null;

export const getToken = () => _accessToken;
export const setToken = (token) => { _accessToken = token; };
export const clearToken = () => { _accessToken = null; };
