# TJSP - Sistema de Gestão de Audiências

Sistema para gestão de audiências judiciais do Tribunal de Justiça de São Paulo (TJSP):
backend Java com **Javalin + SQLite** e frontend **React com TypeScript**.

## 📋 Pré-requisitos

- **Java 17 ou superior** (testado com Java 26)
- **Maven 3.6 ou superior**
- **Node.js 16 ou superior** (testado com Node 22)

## 🚀 Execução

### Forma simples (um comando)

```bash
./iniciar.sh
```

Compila o frontend somente se algum fonte mudou e sobe o sistema completo em
`http://localhost:8080` — o backend Javalin serve a interface e a API no mesmo
endereço (funciona também acessando pelo IP da máquina na rede local).

As seções abaixo são o modo de **desenvolvimento** (frontend com recarga
automática na porta 3000), útil apenas quando se está alterando o código.

### Backend (porta 8080)

```bash
# Desenvolvimento
mvn compile exec:java

# Ou gerar o jar executável
mvn package
java -jar target/audiencias-1.0.0.jar
```

O banco SQLite é criado automaticamente em `data/tjsp_audiencias.db` na primeira execução.
Variáveis de ambiente opcionais: `PORT` (porta do servidor) e `DB_PATH` (caminho do banco).

### Frontend (porta 3000)

```bash
cd frontend
npm install   # apenas na primeira vez
npm start
```

Acesse `http://localhost:3000`. O frontend fala com o backend em `http://localhost:8080`.

> Nesta máquina, os scripts `./run-backend.sh` e `./run-frontend.sh` já apontam para o
> Maven e o Node instalados em `~/tools`.

### Comando administrativo

Não há recuperação de senha pelo sistema. O administrador redefine senhas por:

```bash
java -jar target/audiencias-1.0.0.jar reset-senha <emailOuMatricula> <novaSenha>
```

O usuário será obrigado a trocar a senha no próximo login.

### Levar para outra máquina (sem instalar Java)

Para rodar em um computador que não tem Java 17+ (ex.: estações que só têm
Java 8), gere os pacotes autocontidos — cada um traz um Java portátil embutido:

```bash
./empacotar-distribuivel.sh
```

Produz em `dist/` um `.zip` (Windows) e um `.tar.gz` (Linux). Basta extrair e
iniciar (`Iniciar-Sistema.bat` ou `iniciar-sistema.sh`). Detalhes e cuidados de
rede em [`DISTRIBUICAO.md`](DISTRIBUICAO.md).

## 🧪 Testes

```bash
mvn test
```

## 🏗️ Estrutura

### Backend (`src/main/java/br/jus/tjsp/audiencias/`)
```
├── AudienciasApplication.java  # main: banco + servidor Javalin
├── config/Database.java        # acesso JDBC ao SQLite (schema.sql no classpath)
├── model/enums/                # enums de domínio (status, tipos, competência...)
├── dao/CrudDao.java            # CRUD genérico das entidades simples
├── service/                    # regras de negócio (audiências, participantes,
│                               #   usuários com BCrypt, estatísticas, pauta em PDF)
└── web/                        # rotas Javalin e tratamento de erros
```

### Frontend (`frontend/src/`)
```
├── components/         # componentes reutilizáveis (login, DataTable, formulários)
├── pages/              # páginas (dashboard, pautas, audiências, mandados, varas,
│                       #   juízes, promotores, advogados, pessoas, configurações)
├── contexts/           # autenticação (localStorage)
└── services/api.ts     # cliente axios para o backend (prefixo /api)
```

## 📱 Funcionalidades

- **Dashboard** com resumo e pendências (audiências vencidas, partes não intimadas,
  mandados com problema)
- **Pautas**: a audiência nasce dentro de uma pauta (data/vara/juiz/promotor herdados);
  calendário mês/semana/dia na tela de Pautas, com horários livres por pauta
- **Audiências**: tabela com filtros colapsáveis e persistentes; partes por audiência
  (réu, vítima, testemunhas...) com advogado, intimação e situação do mandado; réu preso
  derivado das partes
- **Mandados e pendências**: acompanhamento da situação das intimações
- **Documentos em PDF** com timbre oficial (brasão + Tribunal/Comarca): pauta e relação
  de audiências; exportação em CSV e PDF paisagem
- **Configurações**: dados do usuário, troca de senha e **backup** (CSV + cópia do banco
  na pasta `backups/`, automático semanal e sob demanda)
- Verificação de conflitos de horário por vara (consultiva, com confirmação)
- Login por e-mail ou matrícula (senhas com hash BCrypt); datas sempre em `dd/MM/yyyy`

> A API é servida sob o prefixo `/api`; os demais caminhos pertencem ao SPA (React).

## 🎨 Tecnologias

**Backend**: Javalin 6 · SQLite (xerial sqlite-jdbc) · Jackson · OpenPDF · jBCrypt · JUnit 5

**Frontend**: React 18 · TypeScript · Tailwind CSS · React Router · Axios

## 📝 Histórico

O projeto foi originalmente construído com Spring Boot + H2 e migrado para
Javalin + SQLite (ver `MIGRACAO.md` para as decisões e o registro da migração).
