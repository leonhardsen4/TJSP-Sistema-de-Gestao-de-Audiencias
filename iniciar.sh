#!/usr/bin/env bash
# Inicia o sistema completo com um único comando.
#
# O backend Javalin serve também o frontend compilado (frontend/build),
# então basta este script e acessar http://localhost:8080 no navegador.
# A build do frontend só é refeita quando algum arquivo-fonte mudou.
#
# Para DESENVOLVIMENTO com recarga automática do frontend, continue usando
# ./run-backend.sh e ./run-frontend.sh em terminais separados (porta 3000).
#
# IMPORTANTE — o servidor NÃO recarrega o código Java sozinho. O processo
# 'mvn exec:java' carrega as classes ao iniciar e mantém essa versão em
# memória enquanto estiver no ar. Depois de qualquer mudança no back-end
# (novo campo, enum, regra), PARE este processo (Ctrl+C) e rode o script de
# novo — só recompilar no IntelliJ não troca o que já está rodando. Sintoma
# clássico de servidor velho: um campo novo "não salva" ou um status novo
# dá erro, mesmo com o código já corrigido.
set -e
cd "$(dirname "$0")"

export PATH="$HOME/tools/node-v22.17.0-linux-x64/bin:$PATH"

# Recompila o frontend somente se a build estiver ausente ou desatualizada
# em relação aos fontes (src/, public/ e package.json).
if [ ! -f frontend/build/index.html ] \
   || [ -n "$(find frontend/src frontend/public frontend/package.json \
              -newer frontend/build/index.html -print -quit 2>/dev/null)" ]; then
  echo ">> Compilando o frontend (primeira vez ou fontes alterados)..."
  (cd frontend
   if [ ! -x node_modules/.bin/react-scripts ]; then
     npm install
   fi
   npm run build)
else
  echo ">> Frontend já compilado e atualizado."
fi

echo ">> Iniciando o sistema em http://localhost:8080"
exec "$HOME/tools/apache-maven-3.9.9/bin/mvn" -q compile exec:java
