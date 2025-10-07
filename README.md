# TJSP - Sistema de Gestão de Audiências

Sistema completo para gestão de audiências judiciais do Tribunal de Justiça de São Paulo (TJSP), desenvolvido com Spring Boot (backend) e React com TypeScript (frontend).

## 📋 Pré-requisitos

### Backend
- Java 17 ou superior
- Maven 3.6 ou superior

### Frontend
- Node.js 16 ou superior
- npm ou yarn

## 🚀 Configuração e Execução

### 1. Backend (Spring Boot)

#### Executar o backend:
```bash
# Na raiz do projeto
mvn spring-boot:run
```

O backend estará disponível em: `http://localhost:8080`

#### Endpoints da API:
- **Audiências**: `/api/audiencias`
- **Varas**: `/api/varas`
- **Juízes**: `/api/juizes`
- **Promotores**: `/api/promotores`
- **Advogados**: `/api/advogados`
- **Pessoas**: `/api/pessoas`

### 2. Frontend (React + TypeScript)

#### Instalar dependências:
```bash
# Navegar para a pasta frontend
cd frontend

# Instalar dependências
npm install
```

#### Executar o frontend:
```bash
# Na pasta frontend
npm start
```

O frontend estará disponível em: `http://localhost:3000`

## 🏗️ Estrutura do Projeto

### Backend (`/src/main/java/br/gov/sp/tjsp/audiencias/`)
```
├── controller/          # Controllers REST
├── model/              # Entidades JPA
├── repository/         # Repositórios Spring Data
├── service/            # Camada de serviços
└── AudienciasApplication.java
```

### Frontend (`/frontend/src/`)
```
├── components/         # Componentes reutilizáveis
├── pages/             # Páginas da aplicação
│   ├── audiencias/    # Listagem e formulários de audiências
│   ├── varas/         # Listagem e formulários de varas
│   ├── juizes/        # Listagem e formulários de juízes
│   ├── promotores/    # Listagem e formulários de promotores
│   ├── advogados/     # Listagem e formulários de advogados
│   └── pessoas/       # Listagem e formulários de pessoas
├── App.tsx            # Componente principal
├── index.tsx          # Ponto de entrada
└── setupProxy.js      # Configuração de proxy para API
```

## 🎨 Tecnologias Utilizadas

### Backend
- **Spring Boot 3.1.2** - Framework principal
- **Spring Data JPA** - Persistência de dados
- **H2 Database** - Banco de dados em memória (desenvolvimento)
- **Spring Web** - API REST
- **Maven** - Gerenciamento de dependências

### Frontend
- **React 18** - Biblioteca de interface
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Framework de estilos
- **React Router** - Roteamento
- **Axios** - Cliente HTTP
- **Headless UI** - Componentes acessíveis

## 📱 Funcionalidades

### ✅ Implementadas
- **Dashboard** com resumo de audiências
- **CRUD completo** para todas as entidades:
  - Audiências (com data, hora, vara, juiz, promotor)
  - Varas (nome, comarca, endereço, contato)
  - Juízes (nome, matrícula, email, telefone)
  - Promotores (nome, matrícula, email, telefone)
  - Advogados (nome, OAB, email, telefone)
  - Pessoas (nome, CPF, email, telefone, endereço)
- **Filtros e busca** em todas as listagens
- **Interface responsiva** com design moderno
- **Navegação intuitiva** com sidebar

### 🔄 Em Desenvolvimento
- Validações avançadas nos formulários
- Testes unitários
- Autenticação e autorização
- Relatórios e exportação de dados

## 🛠️ Solução de Problemas

### Node.js não reconhecido no terminal
Se o comando `node` não for reconhecido:

1. **Verificar instalação**: Execute `node -v` no Prompt de Comando do Windows
2. **Usar caminho completo**: 
   ```bash
   "C:\Program Files\nodejs\node" -v
   "C:\Program Files\nodejs\npm" install
   ```
3. **Executar comandos no Prompt de Comando**: Como alternativa, execute os comandos npm diretamente no Prompt de Comando do Windows

### Problemas de CORS
O frontend está configurado com proxy para `http://localhost:8080`. Certifique-se de que o backend esteja rodando nesta porta.

## 📝 Próximos Passos

1. **Implementar validações** nos formulários usando Yup
2. **Adicionar testes** unitários e de integração
3. **Configurar banco de dados** PostgreSQL para produção
4. **Implementar autenticação** JWT
5. **Adicionar relatórios** em PDF
6. **Deploy** em ambiente de produção

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

**Desenvolvido para o Tribunal de Justiça de São Paulo (TJSP)**