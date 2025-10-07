# Script de Deploy para Google Cloud (PowerShell)
# Execute este script para fazer o deploy completo da aplicação

param(
    [string]$ProjectId = "seu-projeto-gcp",
    [string]$Region = "us-central1",
    [string]$ServiceName = "tjsp-audiencias",
    [string]$DbInstanceName = "tjsp-audiencias-db"
)

Write-Host "🚀 Iniciando deploy no Google Cloud..." -ForegroundColor Green

# Verificar se o gcloud está instalado
try {
    $null = Get-Command gcloud -ErrorAction Stop
} catch {
    Write-Host "❌ Google Cloud SDK não encontrado. Instale em: https://cloud.google.com/sdk" -ForegroundColor Red
    exit 1
}

# Configurar projeto
Write-Host "⚙️  Configurando projeto: $ProjectId" -ForegroundColor Yellow
gcloud config set project $ProjectId

# Habilitar APIs necessárias
Write-Host "🔧 Habilitando APIs necessárias..." -ForegroundColor Yellow
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Verificar se a instância do Cloud SQL existe
Write-Host "🗄️  Verificando instância do banco de dados..." -ForegroundColor Yellow
$instanceExists = gcloud sql instances describe $DbInstanceName --quiet 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "📦 Criando instância PostgreSQL..." -ForegroundColor Yellow
    gcloud sql instances create $DbInstanceName `
        --database-version=POSTGRES_14 `
        --tier=db-f1-micro `
        --region=$Region `
        --storage-type=SSD `
        --storage-size=10GB `
        --backup-start-time=03:00
    
    # Gerar senha aleatória
    $password = [System.Web.Security.Membership]::GeneratePassword(16, 4)
    Write-Host "🔐 Definindo senha do usuário postgres..." -ForegroundColor Yellow
    gcloud sql users set-password postgres `
        --instance=$DbInstanceName `
        --password=$password
    
    Write-Host "🏗️  Criando banco de dados..." -ForegroundColor Yellow
    gcloud sql databases create tjsp_audiencias --instance=$DbInstanceName
    
    Write-Host "📝 Senha do banco: $password" -ForegroundColor Cyan
    Write-Host "⚠️  Anote esta senha! Você precisará dela para configurar as variáveis de ambiente." -ForegroundColor Red
}

# Build e deploy
Write-Host "🏗️  Iniciando build e deploy..." -ForegroundColor Yellow
gcloud builds submit --config cloudbuild.yaml

# Obter URL do serviço
$serviceUrl = gcloud run services describe $ServiceName --region=$Region --format="value(status.url)"

Write-Host ""
Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
Write-Host "🌐 URL da aplicação: $serviceUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Configure as variáveis de ambiente no Cloud Run:"
Write-Host "   - DATABASE_URL"
Write-Host "   - DATABASE_USERNAME" 
Write-Host "   - DATABASE_PASSWORD"
Write-Host "   - MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD"
Write-Host ""
Write-Host "2. Configure o domínio personalizado (opcional)"
Write-Host "3. Configure SSL/TLS (automático no Cloud Run)"
Write-Host ""
Write-Host "🔗 Acesse o console: https://console.cloud.google.com/run/detail/$Region/$ServiceName" -ForegroundColor Cyan