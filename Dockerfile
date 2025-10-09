# Multi-stage build para otimizar o tamanho da imagem

# Stage 1: Build do Frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

# Stage 2: Build do Backend
#FROM maven:3.9-openjdk-17-slim AS backend-build
FROM maven:3.9-eclipse-temurin-17 AS backend-build
WORKDIR /app
COPY pom.xml ./
COPY src ./src
# Copiar os arquivos estáticos do frontend para o backend
COPY --from=frontend-build /app/frontend/build ./src/main/resources/static
RUN mvn clean package -DskipTests

# Stage 3: Runtime
FROM openjdk:17-jre-slim
WORKDIR /app

# Instalar dependências necessárias
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar o JAR do backend
COPY --from=backend-build /app/target/*.jar app.jar

# Criar usuário não-root para segurança
RUN addgroup --system spring && adduser --system spring --ingroup spring
USER spring:spring

# Configurar variáveis de ambiente
ENV SPRING_PROFILES_ACTIVE=prod
ENV SERVER_PORT=8080

# Expor a porta
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# Comando para executar a aplicação
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
