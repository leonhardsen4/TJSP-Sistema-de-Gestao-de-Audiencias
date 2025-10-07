# 🚀 Guia de Deploy - Google Cloud

Este guia te ajudará a fazer o deploy completo da aplicação TJSP Sistema de Gestão de Audiências no Google Cloud Platform.

## 📋 Pré-requisitos

### 1. Conta Google Cloud
- Crie uma conta em [cloud.google.com](https://cloud.google.com)
- Ative o período de teste gratuito (US$ 300 em créditos)

### 2. Instalar Google Cloud SDK
- **Windows**: Baixe em [cloud.google.com/sdk](https://cloud.google.com/sdk)
- **Linux/Mac**: 
  ```bash
  curl https://sdk.cloud.google.com | bash
  exec -l $SHELL
  ```

### 3. Configurar Projeto
```bash
# Fazer login
gcloud auth login

# Criar projeto (substitua 'seu-projeto-tjsp' por um nome único)
gcloud projects create seu-projeto-tjsp --name="TJSP Audiências"

# Configurar projeto ativo
gcloud config set project seu-projeto-tjsp

# Habilitar faturamento (necessário para usar recursos)
# Acesse: https://console.cloud.google.com/billing
```

## 🛠️ Deploy Automático

### Opção 1: Script PowerShell (Windows)
```powershell
# Edite o arquivo deploy-gcloud.ps1 e ajuste as variáveis:
# - ProjectId: seu ID do projeto
# - Region: região desejada (us-central1, southamerica-east1, etc.)

# Execute o script
.\deploy-gcloud.ps1 -ProjectId "seu-projeto-tjsp"
```

### Opção 2: Script Bash (Linux/Mac)
```bash
# Edite o arquivo deploy-gcloud.sh e ajuste as variáveis
chmod +x deploy-gcloud.sh
./deploy-gcloud.sh
```

## 🔧 Deploy Manual

### 1. Habilitar APIs
```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 2. Criar Banco PostgreSQL
```bash
# Criar instância
gcloud sql instances create tjsp-audiencias-db \
    --database-version=POSTGRES_14 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --storage-type=SSD \
    --storage-size=10GB

# Definir senha do postgres
gcloud sql users set-password postgres \
    --instance=tjsp-audiencias-db \
    --password=SuaSenhaSegura123

# Criar banco de dados
gcloud sql databases create tjsp_audiencias --instance=tjsp-audiencias-db
```

### 3. Build e Deploy
```bash
# Build da aplicação
gcloud builds submit --config cloudbuild.yaml

# Ou deploy direto no Cloud Run
gcloud run deploy tjsp-audiencias \
    --source . \
    --region=us-central1 \
    --allow-unauthenticated \
    --port=8080 \
    --memory=1Gi \
    --set-env-vars="SPRING_PROFILES_ACTIVE=prod"
```

### 4. Configurar Variáveis de Ambiente
```bash
# Obter string de conexão do banco
CONNECTION_NAME=$(gcloud sql instances describe tjsp-audiencias-db --format="value(connectionName)")

# Configurar variáveis no Cloud Run
gcloud run services update tjsp-audiencias \
    --region=us-central1 \
    --set-env-vars="DATABASE_URL=jdbc:postgresql://google/tjsp_audiencias?cloudSqlInstance=$CONNECTION_NAME&socketFactory=com.google.cloud.sql.postgres.SocketFactory" \
    --set-env-vars="DATABASE_USERNAME=postgres" \
    --set-env-vars="DATABASE_PASSWORD=SuaSenhaSegura123" \
    --set-env-vars="MAIL_HOST=smtp.gmail.com" \
    --set-env-vars="MAIL_USERNAME=seu-email@gmail.com" \
    --set-env-vars="MAIL_PASSWORD=sua-senha-app"
```

## 🌐 Configurar Domínio (Opcional)

### 1. Mapear Domínio Personalizado
```bash
# Mapear domínio
gcloud run domain-mappings create \
    --service=tjsp-audiencias \
    --domain=audiencias.seudominio.com.br \
    --region=us-central1
```

### 2. Configurar DNS
- Adicione os registros DNS fornecidos pelo Google Cloud
- SSL será configurado automaticamente

## 📊 Monitoramento

### 1. Logs
```bash
# Ver logs em tempo real
gcloud run services logs tail tjsp-audiencias --region=us-central1

# Ver logs específicos
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=tjsp-audiencias"
```

### 2. Métricas
- Acesse: [Cloud Console - Cloud Run](https://console.cloud.google.com/run)
- Monitore CPU, memória, latência e erros

### 3. Health Check
- Endpoint: `https://sua-url/actuator/health`
- Verifica conectividade com banco e status da aplicação

## 💰 Custos Estimados

### Tier Gratuito (Desenvolvimento/Teste)
- **Cloud Run**: 2 milhões de requisições/mês grátis
- **Cloud SQL**: db-f1-micro com 10GB = ~US$ 7/mês
- **Container Registry**: 0.5GB grátis

### Produção (Estimativa)
- **Cloud Run**: ~US$ 10-50/mês (dependendo do tráfego)
- **Cloud SQL**: db-g1-small = ~US$ 25/mês
- **Total**: ~US$ 35-75/mês

## 🔒 Segurança

### 1. Configurações Recomendadas
```bash
# Restringir acesso por IP (opcional)
gcloud run services update tjsp-audiencias \
    --region=us-central1 \
    --ingress=internal-and-cloud-load-balancing

# Configurar IAM
gcloud run services add-iam-policy-binding tjsp-audiencias \
    --region=us-central1 \
    --member="user:admin@seudominio.com.br" \
    --role="roles/run.invoker"
```

### 2. Backup do Banco
```bash
# Backup automático (já configurado na criação)
# Backup manual
gcloud sql export sql tjsp-audiencias-db gs://seu-bucket/backup-$(date +%Y%m%d).sql \
    --database=tjsp_audiencias
```

## 🆘 Troubleshooting

### Problemas Comuns

1. **Erro de Build**
   ```bash
   # Verificar logs do build
   gcloud builds log [BUILD_ID]
   ```

2. **Erro de Conexão com Banco**
   ```bash
   # Verificar instância do Cloud SQL
   gcloud sql instances describe tjsp-audiencias-db
   
   # Testar conectividade
   gcloud sql connect tjsp-audiencias-db --user=postgres
   ```

3. **Aplicação não Responde**
   ```bash
   # Verificar logs do Cloud Run
   gcloud run services logs tail tjsp-audiencias --region=us-central1
   
   # Verificar health check
   curl https://sua-url/actuator/health
   ```

### Comandos Úteis

```bash
# Listar serviços
gcloud run services list

# Descrever serviço
gcloud run services describe tjsp-audiencias --region=us-central1

# Atualizar configurações
gcloud run services update tjsp-audiencias --region=us-central1 [opções]

# Deletar serviço
gcloud run services delete tjsp-audiencias --region=us-central1
```

## 📞 Suporte

- **Documentação**: [cloud.google.com/run/docs](https://cloud.google.com/run/docs)
- **Suporte Google Cloud**: [cloud.google.com/support](https://cloud.google.com/support)
- **Comunidade**: [stackoverflow.com/questions/tagged/google-cloud-run](https://stackoverflow.com/questions/tagged/google-cloud-run)

---

✅ **Parabéns!** Sua aplicação está rodando no Google Cloud com PostgreSQL e pronta para produção!