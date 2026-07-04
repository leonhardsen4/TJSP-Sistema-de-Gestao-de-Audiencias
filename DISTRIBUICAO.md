# Distribuição do Sistema (arquivo para levar a outra máquina)

Este documento explica como o sistema é empacotado para rodar em outro
computador **sem instalar nada** e o que esperar da rede do TJSP.

## Por que uma distribuição com Java embutido?

O sistema é escrito em Java e usa a stack **Javalin 6 + Jetty**, que exige
**Java 17 ou superior**. As estações do TJSP têm, no máximo, **JRE 1.8
(Java 8)** — incompatível. Como não dá para instalar um Java novo numa
máquina restrita, a distribuição **traz o próprio Java 17 embutido** (JRE
portátil da Eclipse Temurin), que roda a partir da pasta do programa, sem
instalação e sem direitos de administrador.

> O JAR sozinho (`target/audiencias-1.0.0.jar`) é multiplataforma, mas
> precisa de um Java 17+ na máquina. A distribuição resolve isso embutindo o
> Java. **O Java embutido é por sistema operacional**: o pacote Windows traz
> `java.exe` (só roda no Windows) e o pacote Linux traz o Java de Linux.

## Como gerar os pacotes

Na máquina de desenvolvimento (com Maven, Node e internet):

```bash
./empacotar-distribuivel.sh
```

O script compila o frontend, empacota o JAR (embutindo o frontend em
`/public`), baixa uma vez o JRE Temurin 17 (cache em `dist/cache/`) e monta:

- `dist/TJSP-Audiencias-Windows.zip` — para Windows 64 bits
- `dist/TJSP-Audiencias-Linux.tar.gz` — para Linux 64 bits

(A pasta `dist/` é ignorada pelo Git por conter binários grandes.)

## Como usar na máquina de destino

1. Copie o pacote do seu SO e extraia numa pasta (ex.: no Desktop).
2. Inicie:
   - **Windows**: dê dois cliques em `Iniciar-Sistema.bat`
   - **Linux**: `./iniciar-sistema.sh`
3. O navegador abre em `http://localhost:8080`. Deixe a janela aberta; para
   encerrar, feche-a (Windows) ou `Ctrl+C` (Linux).

Os dados ficam na subpasta `data/` e os backups em `backups/`. Para levar o
sistema com os dados para outra máquina, copie a pasta inteira.

## Uso em rede (vários computadores)

O sistema é cliente-servidor: **só a máquina que roda o servidor precisa do
pacote/Java**; as demais acessam pelo navegador em
`http://IP-DO-SERVIDOR:8080`.

Pontos de atenção na rede restrita do TJSP:

- **Firewall do Windows**: por padrão bloqueia conexões de entrada na porta
  8080. Liberar exige, em geral, direitos de administrador.
- **Isolamento de rede**: redes de tribunal costumam isolar as estações entre
  si (client isolation) e podem simplesmente não permitir que uma máquina
  acesse um serviço aberto por outra.
- **Antivírus/AppLocker**: podem bloquear a execução de programas não
  homologados ou a abertura de porta de rede.
- **Uso numa máquina só** (servidor e navegador no mesmo PC, via
  `localhost`): normalmente funciona sem depender da rede.

Ou seja: numa máquina isolada é tranquilo; em rede, depende de permissões que
talvez precisem passar pela área de TI do tribunal.

## Trocar a porta

Se a 8080 estiver ocupada ou bloqueada, defina a variável `PORT` antes de
iniciar (ex.: `set PORT=9090` no Windows, `PORT=9090 ./iniciar-sistema.sh` no
Linux).
