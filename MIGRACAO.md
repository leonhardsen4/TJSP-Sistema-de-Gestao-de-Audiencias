# Migração: Spring Boot → Javalin + SQLite

Registro do andamento da migração iniciada em 01/07/2026.

## Decisões

- **Servidor**: Javalin 6 (substitui Spring Boot 3.2).
- **Banco**: SQLite em `data/tjsp_audiencias.db` (substitui H2). Banco novo, sem migração dos dados de teste antigos (o arquivo H2 permanece guardado em `data/`).
- **Sem Lombok**: código Java puro — com isso o projeto compila no Java 26 instalado na máquina.
- **Senhas com hash BCrypt** (antes eram texto puro no banco).
- **Removidos**: envio de e-mail, recuperação de senha (admin redefine via comando `reset-senha`), pauta em texto (só PDF), CRUDs avulsos `/participacoes` e `/representacoes`, endpoints de debug, actuator, console H2, perfis dev/prod.
- **Login simples**: valida credenciais, sem token/sessão protegendo a API (uso local).
- **Datas**: exibição sempre `dd/MM/yyyy` (telas e PDF); tráfego interno API/banco em `yyyy-MM-dd` (exigência dos campos de data do navegador). A API aceita os dois formatos na entrada.
- **Contrato da API preservado**: o frontend React não sofre nenhuma alteração. Rotas registradas com e sem prefixo `/api` (o frontend usa os dois).
- **Javadoc em português** em todas as classes e métodos.
- **Testes JUnit 5** para todas as funcionalidades.

## Checklist

- [x] 1. Base do projeto: `pom.xml` sem Spring, `schema.sql`, `Database.java`, main Javalin na porta 8080
- [x] 2. CRUDs simples: varas, juízes, promotores, advogados, pessoas — testados via curl
- [x] 3. Audiências: validações, vara/juiz/promotor aninhados, conflitos (consultivo), horários livres, participantes — testados via curl
- [x] 4. Usuários (BCrypt + comando reset-senha), estatísticas do dashboard, pauta em PDF (OpenPDF) — testados via curl
- [x] 5. Testes JUnit de todas as funcionalidades — 48 testes, todos verdes (`mvn test`)
- [x] 6. Remoção do código Spring antigo, README atualizado, scripts run-backend.sh/run-frontend.sh, .gitignore criado, arquivos obsoletos excluídos (DEPLOY-GUIDE.md, artefatos de teste, .vscode, trace do H2, imagem estática do PDF antigo)
- [x] 7. Teste ponta a ponta: backend + frontend no ar, login via proxy do dev server, CRUDs, conflitos, participantes, estatísticas e PDF verificados por HTTP. Falta apenas a conferência visual no navegador (com o usuário).

## Ambiente

- Java 26 (Zulu) em `/usr/lib/jvm/java-26-zulu-openjdk-jdk-fx`
- Maven 3.9.9 em `~/tools/apache-maven-3.9.9`
- Node 22 em `~/tools/node-v22.17.0-linux-x64`
