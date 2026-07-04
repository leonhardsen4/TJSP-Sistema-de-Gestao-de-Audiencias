#!/usr/bin/env bash
# Inicia o Sistema de Gestão de Audiências usando o Java portátil embutido
# (não depende do Java instalado na máquina). Deixe este terminal aberto
# enquanto usar o sistema; para encerrar, pressione Ctrl+C ou feche-o.
cd "$(dirname "$0")"

echo "============================================================"
echo "  Sistema de Gestão de Audiências - TJSP - Comarca de Cotia"
echo "============================================================"
echo
echo "Iniciando o servidor... o navegador abrirá em http://localhost:8080"
echo

# Abre o navegador depois de alguns segundos, sem travar o servidor.
( sleep 6; xdg-open http://localhost:8080 >/dev/null 2>&1 || true ) &

./jre/bin/java -jar audiencias-1.0.0.jar
