import axios from 'axios';

// Criar instância do axios com configuração personalizada.
// A API vive sob o prefixo "/api" (separada do SPA, que ocupa os demais
// caminhos). Em produção, o Javalin serve ambos na mesma origem, então a
// URL fica relativa ("/api/...") e funciona em qualquer máquina da rede;
// em desenvolvimento, o proxy (setupProxy.js) encaminha "/api" ao backend.
// REACT_APP_API_URL só é usada se for preciso apontar para outra origem.
const api = axios.create({
  baseURL: (process.env.REACT_APP_API_URL ?? '') + '/api',
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