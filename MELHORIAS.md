# Melhorias de usabilidade — julho/2026

Registro do trabalho de revisão de usabilidade e das melhorias implementadas.
Análise feita em 02/07/2026 sobre o estado do aplicativo após a migração para Javalin + SQLite.

## Diagnóstico (o que foi encontrado)

### Estava correto
- **Lógica dos cadastros**: pessoas têm CPF (opcional), advogados têm OAB (obrigatória),
  juízes e promotores têm somente nome (+ telefone/e-mail/observações opcionais).
- **Conflito de horário consultivo**: o formulário avisa e deixa continuar (decisão registrada na migração).
- **Ordenação nas tabelas**: já existia via `PaginatedTable`/`SortableTable`.

### Problemas encontrados (e corrigidos)
1. **Sem máscaras de entrada**: CPF, telefone e nº de processo aceitavam qualquer texto.
   `utils/validation.ts` tinha schemas Yup e formatadores **que nenhuma tela usava**.
2. **Sem transformação em maiúsculas** nos campos de texto.
3. **Campo "Sala" fantasma** no formulário de audiências: era exibido, mas **não era enviado
   nem existe no banco** — o que o usuário digitava era perdido em silêncio. Removido por ser
   fonte de perda de dados (se a sala for necessária como cadastro real, é fácil criar depois).
4. **Erro com CPF nulo**: o filtro de pessoas no formulário de audiências chamava
   `pessoa.cpf.includes(...)` e quebrava a tela quando existia pessoa sem CPF
   (o mesmo problema existia na busca da lista de pessoas).
5. **Bug na edição de participantes**: ao editar uma audiência e remover *todos* os
   participantes, nada era apagado no banco (o bloco só rodava com a lista não vazia).
6. **Busca de horários livres**: a comparação estrita (`isBefore`/`isAfter`) fazia o
   intervalo de segurança de 30 min virar ~60 min na prática, escondendo horários válidos;
   eram sugeridos horários já passados; e audiências "encostadas" (uma termina quando a
   outra começa) eram apontadas como conflito.
7. **Filtros limitados** na lista de audiências (sem vara, sem período, sem tipo) e ausentes
   nas demais listas; tabelas sem ocultar/reexibir nem redimensionar colunas.
8. **Pauta em PDF** só por dia único e sem tabela de participantes.
9. **Sem controle de mandados/pendências**: não havia situação do mandado, folha de
   intimação, nem alertas de audiência sem parte principal ou parte não intimada.
10. **`AudienciasApplication.java` não compilava**: a linha da declaração da classe estava
    corrompida (`pAudienciasApplication {`). Corrigido.

## Melhorias implementadas (02/07/2026)

### Backend (Javalin + SQLite)
- [x] **Migração do banco** (`Database.executarMigracoes`, idempotente via PRAGMA):
      colunas `status_mandado` (padrão `PENDENTE`) e `folha_intimacao` em
      `participacao_audiencia`. `schema.sql` atualizado para bancos novos.
- [x] **Enums**: novo `StatusMandado` (PENDENTE, POSITIVO, NEGATIVO, DISPENSADO);
      `TipoParticipacao` ganhou INDICIADO, AVERIGUADO e AUTOR_DO_FATO e o método
      `partesPrincipais()` (réu/indiciado/averiguado/autor do fato).
- [x] **`MandadoService`** + rotas `GET /mandados` (filtros: vara, período, situação,
      intimado, texto) e `PUT /mandados/{id}` (atualização parcial de situação/intimado/folha).
- [x] **`PendenciaService`** + rota `GET /pendencias`: audiências futuras sem parte
      principal; partes não intimadas (mandado não dispensado); mandados pendentes ou
      negativos de partes ainda não intimadas.
- [x] **Filtros na listagem** `GET /audiencias`: `competencia`, `varaId`, `dataInicio`,
      `dataFim`, `status`, `tipoAudiencia`, `q` (processo/artigo/observações).
- [x] **Algoritmos corrigidos**: sobreposição real em `verificarConflitos`; intervalo de
      segurança de exatos 30 min em `buscarHorariosLivres`; sem sugestões no passado.
- [x] **Validação/normalização** (`util/Textos`): CPF com dígitos verificadores no
      `CrudDao`; textos gravados em MAIÚSCULAS; CPF/telefone/nº CNJ gravados sempre com a
      máscara padrão (aceitam entrada sem máscara).
- [x] **Pauta em PDF reformulada** (`PautaService`): aceita os filtros da tela, agrupa por
      dia, cabeçalho com período/filtros/total, bloco completo por audiência (tipo, formato,
      competência, status, vara, juiz, promotor, artigo, marcadores RÉU PRESO/TEAMS/etc.) e
      **tabela de participantes** (papel, advogado, intimado, situação do mandado, fls.).
      A rota antiga `?data=` continua funcionando.

### Frontend (React)
- [x] **`utils/masks.ts`**: máscaras progressivas de CPF (11 numerais), processo CNJ
      (20 numerais), telefone e OAB; validação de CPF; `toUpper` aplicado a nomes,
      observações, comarca, endereço etc. em **todos** os formulários (e-mail preservado).
- [x] **`DataTable`** (substitui `PaginatedTable`/`SortableTable` em todas as telas):
      ordenação asc/desc em todas as colunas (com caminho aninhado tipo `vara.nome`),
      paginação, busca textual integrada, **ocultar/reexibir colunas** (menu "Colunas") e
      **redimensionar largura por arraste**, com preferências lembradas no navegador.
      Os componentes antigos ficaram sem uso (remoção a decidir).
- [x] **Listas de varas/juízes/promotores/advogados/pessoas** reescritas com o DataTable,
      busca textual e ações padronizadas (`tableActions.tsx`).
- [x] **Lista de audiências**: filtros por vara, data exata, período, tipo, status,
      competência e busca textual; contador de resultados; "Limpar filtros";
      **pauta gerada com os filtros aplicados**.
- [x] **Calendário de audiências** (`CalendarioAudiencias`, na tela de audiências):
      visualizações de **mês, semana (útil) e dia**; clique em dia/horário vago cria
      audiência pré-preenchida; clique em audiência abre painel com Detalhes/Editar/Excluir;
      **horários livres exibidos na grade** (blocos verdes clicáveis) quando uma vara está
      filtrada, com duração configurável.
- [x] **Formulário de audiências reorganizado** em seções (Processo, Data e Horário,
      Classificação, Vara e Autoridades, Características, Participantes): máscara CNJ,
      campo Artigo/Assunto, remoção do campo "Sala" fantasma, correção do crash com CPF
      nulo e do bug de edição de participantes; participante com **situação do mandado,
      folha (fls.) e intimado editáveis na própria lista**; destaque visual da parte
      principal e **aviso ao salvar sem réu/indiciado/averiguado/autor do fato**.
- [x] **Tela Controle de Mandados** (`/mandados`, no menu): resumo (pendentes, negativos,
      não intimados), filtros no servidor (vara, período, situação, intimado, busca) e
      **edição direto na tabela** (situação, intimado, fls.) sem abrir a audiência.
- [x] **Dashboard com painel de pendências**: alertas de audiências sem parte principal,
      partes não intimadas e mandados pendentes/negativos, com links diretos para resolver.
- [x] **Detalhes da audiência** atualizado: advogado, folha e situação do mandado por
      participante; badge "Não intimado".

### Qualidade
- [x] **68 testes JUnit passando** (`mvn test`): novos testes para `Textos`,
      `MandadoService`, `PendenciaService`, filtros e limites dos algoritmos de horário,
      rotas de mandados/pendências e pauta por filtros.
- [x] **Frontend compila sem avisos** (`CI=true npm run build`).
- [x] Javadoc em português em todo o código novo do backend; comentários de documentação
      nos componentes novos do frontend.

## Pautas de audiências e horários livres por pauta (03/07/2026)

Refinamento definido com o usuário após o primeiro teste, refletindo o fluxo real do fórum.

### Modelo
- **Nova entidade `Pauta`**: data + vara + juiz + promotor + observações. Uma pauta tem
  1..N audiências; **toda audiência pertence a exatamente uma pauta** (não existe mais o
  cadastro avulso — o botão e a rota `POST /audiencias` foram removidos).
- **Vínculo rígido**: a audiência herda data/vara/juiz/promotor da pauta e não pode
  sobrescrevê-los (exceções são anotadas nas observações da pauta). Alterar o cabeçalho
  da pauta propaga para todas as audiências dela; excluir a pauta exclui as audiências
  em cascata (com aviso forte na interface).
- **Migração**: coluna `audiencia.pauta_id` (FK com ON DELETE CASCADE) criada de forma
  idempotente; na primeira execução, as audiências antigas (dados de teste, conforme
  autorização do usuário) foram apagadas. O índice `idx_audiencia_pauta` é criado na
  migração, após a coluna existir.

### Backend
- `PautaService` (entidade): CRUD com filtros (período, vara, texto com acentos — o
  `UPPER()` do SQLite é ASCII, então o termo é convertido no Java; correção aplicada
  também às buscas de audiências e mandados), propagação rígida e validações.
- `AudienciaService.criarNaPauta` / `listarPorPauta`; `atualizar` força os dados da pauta.
- O gerador de PDF virou `PautaPdfService`, com o novo `gerarPdfDaPauta`:
  **impressão simplificada** — cabeçalho único (vara/juiz/promotor/data/observações) e
  blocos enxutos por audiência com a tabela de participantes. O relatório por filtros
  (`/pauta/pdf`) continua disponível na tela de audiências como "Relatório PDF".
- Rotas: `GET/POST /pautas`, `GET/PUT/DELETE /pautas/{id}`, `GET/POST
  /pautas/{id}/audiencias`, `GET /pautas/{id}/pdf`.

### Frontend
- **Telas novas**: lista de pautas (`/pautas`, com filtros), formulário da pauta e a
  **tela de trabalho da pauta** (`/pautas/{id}`): cabeçalho, janela de trabalho
  configurável e linha do tempo do dia intercalando audiências e **blocos livres crus**
  (sem intervalo de segurança, decisão do usuário) clicáveis para agendar.
- **Formulário de audiência** sem data/vara/juiz/promotor: cabeçalho fixo da pauta +
  campos próprios da audiência. Criação somente via `/pautas/{id}/audiencias/nova`.
- **Calendário orientado a pautas**: pautas aparecem como cartões nos dias; blocos
  livres **por pauta**, apenas em dias com pauta cadastrada e dentro da janela de
  horário (campos "das/às"); dias sem pauta mostram "sem pauta cadastrada" com botão
  de criar; clique no dia abre painel com as pautas do dia + "Nova Pauta".
- Menu ganhou "Pautas"; Dashboard aponta para "Nova Pauta"; a tela Horários Livres
  agenda dentro da pauta existente (ou leva à criação de uma).
- Correção à parte: `frontend/.env.production` apontava para a URL morta do deploy
  antigo na nuvem — agora usa URL relativa (funciona em qualquer máquina da rede).

### Verificação
- 76 testes JUnit passando (novos: entidade Pauta, herança rígida, propagação, cascata).
- Build do frontend sem avisos; smoke test no banco real: migração limpa audiências de
  teste, cria pauta, herda cabeçalho, bloqueia POST avulso (404), imprime PDF, cascata ok.

## Melhorias de 03/07/2026 (segunda rodada de avaliação)

1. **Tela "Horários Livres" removida** (menu, rota e arquivo) — o calendário com blocos
   livres por pauta cumpre o papel. Autorizado pelo usuário.
2. **Exportação da lista de audiências** (novo `ExportacaoService` + rotas
   `/audiencias/exportar/csv|pdf`), respeitando os filtros aplicados:
   planilha CSV (BOM UTF-8 + separador `;`, abre no Excel/Excel Online/Planilhas
   Google) e PDF em paisagem. Colunas: Data, Horário, Nº do Processo, Vara,
   Competência, Artigo/Assunto. Botões "Exportar Planilha" e "Exportar PDF" na tela.
3. **Contatos no formulário de audiência**: o cartão de cada participante mostra
   telefone e e-mail da pessoa (quando cadastrados), para acesso rápido.
4. **Badge "DE"** (roxo) para depoimento especial, ao lado do "RP" (réu preso), na
   lista de audiências, na tela da pauta e no painel do calendário.
5. **Tela de Pautas com calendário como visão padrão** (alternância Calendário/Tabela):
   o calendário mensal mostra apenas os cartões de pauta (vara + nº de audiências),
   sem processos individuais. **Cor por vara**: campo "Cor no calendário" no cadastro
   da vara (coluna `cor`, migração idempotente), usada nos cartões dos dois calendários,
   com contraste de texto automático. Amostra da cor na lista de varas.

## Melhorias de 04/07/2026 (terceira rodada)

1. **Papéis de participação**: adicionados Querelante, Querelado, Beneficiado 28-A CPP,
   Testemunha Protegida, Informante, Representante da Vítima, Vítima (Menor),
   Testemunha (Menor) e Genitor(a); removida "Vítima Fatal". Ordem: réu, vítima e
   testemunhas (acusação/comum/defesa) na frente; demais em ordem alfabética.
   Rótulos centralizados em `utils/participacao.ts`. **Querelado passou a contar como
   parte principal** (é o acusado na queixa-crime) — decisão do assistente, reversível.
2. **Peças do processo** na audiência: Defesa Prévia, FA/CDC e Laudo — checkbox + campo
   da folha (a folha só é gravada com a peça marcada); saem nos PDFs de pauta/relatório.
3. **Prisão por participante**: checkbox "Preso(a)" + campo "Local de Prisão" no
   participante; o **badge RP da audiência é derivado automaticamente** (recalculado
   pelo `ParticipacaoService` a cada mudança nos participantes) — o checkbox manual
   "Réu Preso" foi removido. Local de prisão sai na tabela de participantes dos PDFs.
4. **Agendamento Teams** movido para o fim do formulário: ao marcar, exibe o texto de
   agendamento gerado automaticamente ("dd/MM/yyyy HH:mmhs | VARA | PROC até o ano",
   mensagem padrão com tipo/formato/data por extenso/horário, e os nomes das partes
   principais com o local de prisão de quem estiver preso), com botão "Copiar texto".
5. **Cópia de audiência anterior**: ao completar o nº do processo numa audiência nova,
   o sistema busca a audiência mais recente do mesmo processo e oferece copiar tipo,
   formato, artigo, peças, observações e participantes (continuações de audiência).
6. **Status simplificados**: PENDENTE (antes Designada), REALIZADA e NAO_REALIZADA
   (antes Cancelada); removidos Redesignada e Parcialmente Realizada. Sem migração de
   dados (as audiências haviam sido zeradas a pedido do usuário em 04/07).
7. **Alerta de status vencido**: audiências PENDENTE com data passada entram em
   `audienciasVencidas` no `/pendencias` e ganham cartão próprio no Dashboard
   (obrigando a marcar Realizada/Não Realizada).
8. **Filtros por característica** na tela de audiências: Réu Preso, Depoimento
   Especial e Agendamento Teams (com/sem/todos).
9. **Atalhos**: ação "Pauta" nas linhas da tabela de audiências e seção "Pautas de
   Hoje" no Dashboard (cartões com a cor da vara).

## Correções de 04/07/2026 (verificação de bugs relatados)

Três bugs relatados pelo usuário tinham a **mesma causa raiz**: o servidor em
execução (`mvn exec:java`, iniciado em 03/07) mantinha em memória as classes
antigas, anteriores às mudanças da 3ª rodada. Recompilar no IntelliJ não troca
o processo no ar. Após reiniciar o servidor, os três voltaram a funcionar:

1. **"Réu preso não salvava"**: o `ParticipacaoService` velho não conhecia os
   campos `preso`/`local_prisao`. Validado após reinício (grava `preso=1` e o
   `reu_preso` derivado liga).
2. **"Cor da vara não salvava"**: o `CrudDao` velho não tinha `cor` na lista de
   colunas, então o PUT descartava o campo. Validado após reinício.
3. **"Status Pendente dava erro ao salvar"**: o enum velho não tinha `PENDENTE`.
   Validado após reinício (PUT com `status=PENDENTE` retorna 200).

Ações efetivas desta sessão:
- **Nota no `iniciar.sh`**: aviso de que o servidor não recarrega código Java
  sozinho — depois de mudar o back-end, parar (Ctrl+C) e rodar o script de novo.
  Sintoma clássico documentado ("campo novo não salva / status novo dá erro").
- **Marcador TEAMS retirado do PDF da pauta** (`PautaPdfService.marcadoresEspeciais`)
  a pedido do usuário — é controle interno. Mantidos RÉU PRESO, RECONHECIMENTO
  e DEPOIMENTO ESPECIAL. Validado com `pdftotext`.
- **Esclarecido o "observações automáticas"**: não havia geração automática — o
  campo Observações (da pauta e da audiência) só é impresso quando há texto
  digitado. O que aparecia era a observação **da pauta de teste** nº 8
  ("RÉU PRESO NA AUDIÊNCIA DAS 13H30"), semeada em rodada anterior; foi limpa.

## Observações para decisão futura
- `PaginatedTable.tsx` e `SortableTable.tsx` ficaram **sem uso** — podem ser removidos.
- `utils/validation.ts` (schemas Yup nunca usados) também ficou obsoleto — a validação
  agora está em `utils/masks.ts` + backend. Pode ser removido junto com a dependência Yup.
- A tela "Horários Livres" continua existindo; o calendário agora cobre o mesmo caso de
  uso de forma visual. Se preferir, ela pode ser removida do menu.
- O backup do banco anterior à migração ficou em `/tmp/backup_tjsp_audiencias.db`
  (a migração só adiciona colunas; nada foi alterado ou removido).

## Rodada de 04/07/2026 (robustez, distribuição e produção)
- **Transações atômicas**: `Database.executarEmTransacao` (ThreadLocal, reentrante);
  operações compostas (pauta, partes) agora "tudo ou nada". Novo `PUT
  /audiencias/{id}/participantes` substitui as partes numa transação só.
- **Configurações** (`/configuracoes`): editar nome/e-mail, trocar senha e **backup**
  (CSV das audiências + cópia `.db` via `VACUUM INTO` na pasta `backups/`; automático
  semanal + botão manual).
- **PDFs oficiais**: brasão do TJSP + "TRIBUNAL DE JUSTIÇA DE SÃO PAULO / COMARCA DE
  COTIA" (fonte serifada, filete azul) em todos os relatórios. Na pauta: nº do processo
  em destaque, só horário de início, Tipo/Competência (sem Formato/Status), rótulos com
  acento, partes ordenadas (réu, vítima, testemunhas...) e renomeadas para "Parte", com
  observação/prisão abaixo do nome.
- **Colisão SPA×API corrigida**: a API passou a viver **só sob `/api`**; os demais
  caminhos ficam para o SPA. Antes, recarregar/abrir direto uma página (ex.:
  `/pautas/8`) devolvia JSON no navegador. Frontend agora usa `baseURL=/api` e navegação
  client-side; `fetch` com `localhost:8080` cravado viraram relativos.
- **Limpeza**: removidos `PaginatedTable`, `SortableTable`, `utils/validation.ts` e
  `CalendarioAudiencias` (órfãos).
- **Nova peça "Denúncia"** nas Peças do Processo (coluna `denuncia`/`denuncia_folha`):
  aparece no cadastro/edição (peças empilhadas, com a folha ao lado), no detalhe e no
  PDF. As peças ficam na ordem: Denúncia, Defesa Prévia, FA/CDC, Laudo.
- **Distribuição autocontida** (ver `DISTRIBUICAO.md`): `mvn package` embute o frontend
  no JAR (`/public`); `empacotar-distribuivel.sh` gera pacotes Windows/Linux **com um
  Java 17 portátil embutido** — rodam sem instalar Java e sem admin. Necessário porque as
  estações do TJSP têm no máximo JRE 1.8, incompatível com a stack (Java 17).
