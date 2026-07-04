#!/usr/bin/env bash
# Gera as distribuições autocontidas do sistema (com Java portátil embutido)
# para Windows e Linux, prontas para copiar e rodar em outra máquina SEM
# instalar Java.
#
# Produz em dist/:
#   - TJSP-Audiencias-Windows.zip      (JRE Windows x64 + app + Iniciar-Sistema.bat)
#   - TJSP-Audiencias-Linux.tar.gz     (JRE Linux x64  + app + iniciar-sistema.sh)
#
# Requisitos para GERAR o pacote (não para rodar): Maven, Node e internet
# (baixa o JRE Temurin 17 uma vez, com cache em dist/cache).
set -e
cd "$(dirname "$0")"
RAIZ="$(pwd)"

MVN="${MVN:-$HOME/tools/apache-maven-3.9.9/bin/mvn}"
export PATH="$HOME/tools/node-v22.17.0-linux-x64/bin:$PATH"

# Java 17 é a versão mínima da stack (Javalin 6). É essa que embutimos.
JRE_VERSAO=17
BASE_ADOPTIUM="https://api.adoptium.net/v3/binary/latest/${JRE_VERSAO}/ga"

echo ">> [1/5] Compilando o frontend..."
( cd frontend && [ -x node_modules/.bin/react-scripts ] || npm install; CI=true npm run build )

echo ">> [2/5] Empacotando o JAR (embute o frontend em /public)..."
"$MVN" -q clean package -DskipTests

JAR="$(ls target/audiencias-*.jar | grep -v original | head -1)"
echo "   JAR: $JAR"

mkdir -p dist/cache

# Monta uma distribuição para um SO: baixa o JRE, extrai, copia app + scripts.
# $1 = rótulo (windows|linux); $2 = os p/ Adoptium; $3 = extensão do pacote JRE
montar() {
  local rotulo="$1" os="$2" ext="$3"
  local cache="dist/cache/jre${JRE_VERSAO}-${rotulo}-x64.${ext}"
  local destino="dist/${rotulo}"

  echo ">> [.] Preparando distribuição ${rotulo}..."
  if [ ! -s "$cache" ]; then
    echo "   baixando JRE ${JRE_VERSAO} (${rotulo})..."
    curl -L -s -m 600 -o "$cache" \
      "${BASE_ADOPTIUM}/${os}/x64/jre/hotspot/normal/eclipse"
  else
    echo "   usando JRE em cache."
  fi

  rm -rf "$destino"; mkdir -p "$destino"
  local tmp="dist/cache/_extract_${rotulo}"; rm -rf "$tmp"; mkdir -p "$tmp"
  if [ "$ext" = "zip" ]; then unzip -q "$cache" -d "$tmp"; else tar -xzf "$cache" -C "$tmp"; fi
  mv "$(ls -d "$tmp"/*/ | head -1)" "$destino/jre"
  rm -rf "$tmp"

  cp "$JAR" "$destino/audiencias-1.0.0.jar"
  cp packaging/LEIA-ME.txt "$destino/"
}

echo ">> [3/5] Distribuição Windows..."
montar windows windows zip
cp packaging/Iniciar-Sistema.bat dist/windows/
( cd dist/windows && zip -q -r -9 "$RAIZ/dist/TJSP-Audiencias-Windows.zip" . )

echo ">> [4/5] Distribuição Linux..."
montar linux linux tar.gz
cp packaging/iniciar-sistema.sh dist/linux/
chmod +x dist/linux/iniciar-sistema.sh dist/linux/jre/bin/java
tar -czf "$RAIZ/dist/TJSP-Audiencias-Linux.tar.gz" -C dist/linux .

echo ">> [5/5] Pronto. Artefatos em dist/:"
ls -lh dist/TJSP-Audiencias-*.*
