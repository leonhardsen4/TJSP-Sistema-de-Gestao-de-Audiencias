#!/usr/bin/env bash
# Sobe o backend Javalin na porta 8080 usando o Maven local de ~/tools.
set -e
cd "$(dirname "$0")"
exec "$HOME/tools/apache-maven-3.9.9/bin/mvn" -q compile exec:java
