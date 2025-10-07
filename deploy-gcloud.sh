#!/bin/bash

# Script de Deploy para Google Cloud
# Execute este script para fazer o deploy completo da aplicação

set -e

echo "🚀 Iniciando deploy no Google Cloud..."

# Configurações (ajuste conforme necessário)
PROJECT_ID="seu-projeto-gcp"
REGION="us-central1"
SERVICE_NAME="tjsp-audiencias"
DB_INSTANCE_NAME="tjsp-audiencias-db"

# Verificar se o gcloud está configurado
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK não encontrado. Instale em: https://cloud.google.com/sdk"
    exit 1
fi

# Verificar se o projeto está configurado
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo "⚙️  Configurando projeto: $PROJECT_ID"
    gcloud config set project $PROJECT_ID
fi

# Habilitar APIs necessárias
echo "🔧 Habilitando APIs necessárias..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Criar instância do Cloud SQL (PostgreSQL) se não existir
echo "🗄️  Verificando instância do banco de dados..."
if ! gcloud sql instances describe $DB_INSTANCE_NAME --quiet 2>/dev/null; then
    echo "📦 Criando instância PostgreSQL..."
    gcloud sql instances create $DB_INSTANCE_NAME \
        --database-version=POSTGRES_14 \
        --tier=db-f1-micro \
        --region=$REGION \
        --storage-type=SSD \
        --storage-size=10GB \
        --backup-start-time=03:00
    
    echo "🔐 Definindo senha do usuário postgres..."
    gcloud sql users set-password postgres \
        --instance=$DB_INSTANCE_NAME \
        --password=$(openssl rand -base64 32)
    
    echo "🏗️  Criando banco de dados..."
    gcloud sql databases create tjsp_audiencias --instance=$DB_INSTANCE_NAME
fi

# Build e deploy usando Cloud Build
echo "🏗️  Iniciando build e deploy..."
gcloud builds submit --config cloudbuild.yaml

# Obter URL do serviço
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo ""
echo "✅ Deploy concluído com sucesso!"
echo "🌐 URL da aplicação: $SERVICE_URL"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure as variáveis de ambiente no Cloud Run:"
echo "   - DATABASE_URL"
echo "   - DATABASE_USERNAME" 
echo "   - DATABASE_PASSWORD"
echo "   - MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD"
echo ""
echo "2. Configure o domínio personalizado (opcional)"
echo "3. Configure SSL/TLS (automático no Cloud Run)"
echo ""
echo "🔗 Acesse o console: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME"