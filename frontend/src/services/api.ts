import axios from 'axios';

// Criar instância do axios com configuração personalizada.
// Em produção a API é servida pela mesma origem do frontend (Javalin),
// então a baseURL fica vazia (URLs relativas) — funciona em qualquer
// máquina da rede. Em desenvolvimento, .env.development aponta para
// http://localhost:8080.
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL ?? '',
  timeout: 10000,
});

// Interceptor para requisições
api.interceptors.request.use(
  (config) => {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Interceptor para respostas
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('[API Response Error]', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response?.status === 500) {
      console.error('[500 Error Details]', {
        url: error.config?.url,
        method: error.config?.method,
        requestData: error.config?.data,
        responseData: error.response?.data
      });
    }
    
    return Promise.reject(error);
  }
);

export default api;