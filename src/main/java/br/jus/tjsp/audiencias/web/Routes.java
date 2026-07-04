package br.jus.tjsp.audiencias.web;

import br.jus.tjsp.audiencias.dao.CrudDao;
import br.jus.tjsp.audiencias.service.AudienciaService;
import br.jus.tjsp.audiencias.service.EstatisticasService;
import br.jus.tjsp.audiencias.service.BackupService;
import br.jus.tjsp.audiencias.service.ExportacaoService;
import br.jus.tjsp.audiencias.service.MandadoService;
import br.jus.tjsp.audiencias.service.ParticipacaoService;
import br.jus.tjsp.audiencias.service.PautaPdfService;
import br.jus.tjsp.audiencias.service.PautaService;
import br.jus.tjsp.audiencias.service.PendenciaService;
import br.jus.tjsp.audiencias.service.UsuarioService;
import io.javalin.Javalin;
import io.javalin.http.Context;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Registro de todas as rotas HTTP da API.
 *
 * <p>Toda a API é registrada sob o prefixo {@code /api}. Os demais caminhos
 * ficam reservados ao SPA (servido pelo {@code spaRoot}), para que abrir ou
 * recarregar uma página do frontend (ex.: {@code /pautas/8}) no navegador não
 * colida com uma rota de API de mesmo caminho. O tratamento de erros devolve
 * o mesmo formato JSON do antigo GlobalExceptionHandler do Spring.</p>
 */
public final class Routes {

    /** DAO das varas. */
    private static final CrudDao VARAS = new CrudDao("vara",
            List.of("nome", "comarca", "endereco", "telefone", "email", "cor", "observacoes"), List.of("nome"));

    /** DAO dos juízes. */
    private static final CrudDao JUIZES = new CrudDao("juiz",
            List.of("nome", "telefone", "email", "observacoes"), List.of("nome"));

    /** DAO dos promotores. */
    private static final CrudDao PROMOTORES = new CrudDao("promotor",
            List.of("nome", "telefone", "email", "observacoes"), List.of("nome"));

    /** DAO dos advogados. */
    private static final CrudDao ADVOGADOS = new CrudDao("advogado",
            List.of("nome", "oab", "telefone", "email", "observacoes"), List.of("nome", "oab"));

    /** DAO das pessoas. */
    private static final CrudDao PESSOAS = new CrudDao("pessoa",
            List.of("nome", "cpf", "telefone", "email", "observacoes"), List.of("nome"));

    private Routes() {
        // Classe utilitária: não instanciável.
    }

    /**
     * Registra todas as rotas e os tratadores de exceção na aplicação.
     *
     * @param app instância do Javalin
     */
    public static void registrar(Javalin app) {
        AudienciaService audiencias = new AudienciaService();
        ParticipacaoService participacoes = new ParticipacaoService();
        UsuarioService usuarios = new UsuarioService();
        EstatisticasService estatisticas = new EstatisticasService();
        PautaPdfService pautaPdf = new PautaPdfService(audiencias, participacoes);
        PautaService pautas = new PautaService();
        MandadoService mandados = new MandadoService();
        PendenciaService pendencias = new PendenciaService();
        ExportacaoService exportacao = new ExportacaoService();
        BackupService backup = new BackupService(audiencias, exportacao, "backups");

        // A API vive somente sob "/api". Todos os demais caminhos ficam livres
        // para o SPA (index.html via spaRoot), de modo que recarregar/abrir
        // direto uma página como /pautas/8 no navegador não colida com a API.
        for (String prefixo : new String[]{"/api"}) {
            registrarCrud(app, prefixo + "/varas", VARAS);
            registrarCrud(app, prefixo + "/juizes", JUIZES);
            registrarCrud(app, prefixo + "/promotores", PROMOTORES);
            registrarCrud(app, prefixo + "/advogados", ADVOGADOS);
            registrarCrud(app, prefixo + "/pessoas", PESSOAS);
            registrarBuscasEspecificas(app, prefixo);
            registrarPautas(app, prefixo, pautas, audiencias, pautaPdf);
            registrarAudiencias(app, prefixo, audiencias, participacoes, exportacao);
            registrarUsuarios(app, prefixo, usuarios);
            registrarMandadosEPendencias(app, prefixo, mandados, pendencias);

            app.get(prefixo + "/estatisticas/dashboard", ctx -> ctx.json(estatisticas.resumoDashboard()));

            // Backup: consulta a situação da pasta e dispara um backup manual.
            app.get(prefixo + "/backup", ctx -> ctx.json(backup.status()));
            app.post(prefixo + "/backup", ctx -> ctx.json(backup.executar()));

            app.get(prefixo + "/pauta/pdf", ctx -> {
                byte[] pdf;
                String data = ctx.queryParam("data");
                if (data != null && !data.isBlank()) {
                    // Forma antiga: relatório de um único dia.
                    pdf = pautaPdf.gerarPautaPdf(AudienciaService.parseData(data));
                } else {
                    // Relatório geral com os filtros da tela de listagem.
                    pdf = pautaPdf.gerarPautaPdf(ctx.queryParam("competencia"), ctx.queryParam("varaId"),
                            ctx.queryParam("dataInicio"), ctx.queryParam("dataFim"), ctx.queryParam("status"),
                            ctx.queryParam("tipoAudiencia"), ctx.queryParam("q"));
                }
                ctx.contentType("application/pdf");
                ctx.header("Content-Disposition", "inline; filename=pauta.pdf");
                ctx.result(pdf);
            });
        }

        registrarTratamentoDeErros(app);
    }

    /**
     * Registra as cinco rotas CRUD padrão de uma entidade simples.
     *
     * @param app  instância do Javalin
     * @param base caminho base (ex.: {@code /varas})
     * @param dao  DAO da entidade
     */
    private static void registrarCrud(Javalin app, String base, CrudDao dao) {
        app.get(base, ctx -> ctx.json(dao.listar()));
        app.post(base, ctx -> ctx.status(201).json(dao.criar(corpo(ctx))));
        app.get(base + "/{id}", ctx -> ctx.json(dao.buscarPorId(idDaRota(ctx))));
        app.put(base + "/{id}", ctx -> ctx.json(dao.atualizar(idDaRota(ctx), corpo(ctx))));
        app.delete(base + "/{id}", ctx -> {
            dao.excluir(idDaRota(ctx));
            ctx.status(204);
        });
    }

    /**
     * Registra as rotas de busca específicas de cada entidade
     * (por nome, OAB ou CPF), preservadas do backend antigo.
     *
     * @param app     instância do Javalin
     * @param prefixo {@code ""} ou {@code "/api"}
     */
    private static void registrarBuscasEspecificas(Javalin app, String prefixo) {
        app.get(prefixo + "/varas/buscar",
                ctx -> ctx.json(VARAS.buscarPorColuna("nome", ctx.queryParam("nome"))));
        app.get(prefixo + "/juizes/buscar",
                ctx -> ctx.json(JUIZES.buscarPorColuna("nome", ctx.queryParam("nome"))));
        app.get(prefixo + "/promotores/buscar",
                ctx -> ctx.json(PROMOTORES.buscarPorColuna("nome", ctx.queryParam("nome"))));
        app.get(prefixo + "/advogados/buscar/nome",
                ctx -> ctx.json(ADVOGADOS.buscarPorColuna("nome", ctx.queryParam("nome"))));
        app.get(prefixo + "/advogados/buscar/oab",
                ctx -> ctx.json(ADVOGADOS.buscarPorColuna("oab", ctx.queryParam("oab"))));
        app.get(prefixo + "/pessoas/buscar/nome",
                ctx -> ctx.json(PESSOAS.buscarPorColuna("nome", ctx.queryParam("nome"))));
        app.get(prefixo + "/pessoas/buscar/cpf",
                ctx -> ctx.json(PESSOAS.buscarPorColuna("cpf", ctx.queryParam("cpf"))));
    }

    /**
     * Registra as rotas de audiências e as rotas aninhadas de participantes.
     * As rotas com caminho fixo vêm antes de {@code /{id}} para terem
     * prioridade na resolução.
     *
     * @param app           instância do Javalin
     * @param prefixo       {@code ""} ou {@code "/api"}
     * @param audiencias    serviço de audiências
     * @param participacoes serviço de participantes
     * @param exportacao    serviço de exportação (planilha e PDF paisagem)
     */
    private static void registrarAudiencias(Javalin app, String prefixo, AudienciaService audiencias,
                                            ParticipacaoService participacoes, ExportacaoService exportacao) {
        String base = prefixo + "/audiencias";

        app.get(base, ctx -> ctx.json(audiencias.listar(ctx.queryParam("competencia"),
                ctx.queryParam("varaId"), ctx.queryParam("dataInicio"), ctx.queryParam("dataFim"),
                ctx.queryParam("status"), ctx.queryParam("tipoAudiencia"), ctx.queryParam("q"))));
        app.get(base + "/por-competencia", ctx -> ctx.json(audiencias.listar(ctx.queryParam("competencia"))));
        app.get(base + "/data", ctx ->
                ctx.json(audiencias.listarPorData(AudienciaService.parseData(ctx.queryParam("data")))));

        app.get(base + "/verificar-conflitos", ctx -> ctx.json(audiencias.verificarConflitos(
                AudienciaService.parseData(ctx.queryParam("data")),
                obrigatorio(ctx, "horarioInicio"),
                Integer.parseInt(obrigatorio(ctx, "duracao")),
                Long.parseLong(obrigatorio(ctx, "varaId")),
                ctx.queryParam("audienciaId") == null || ctx.queryParam("audienciaId").isBlank()
                        ? null : Long.parseLong(ctx.queryParam("audienciaId")))));

        app.get(base + "/buscar-horarios-livres", ctx -> ctx.json(audiencias.buscarHorariosLivres(
                Long.parseLong(obrigatorio(ctx, "varaId")),
                AudienciaService.parseData(obrigatorio(ctx, "dataInicio")),
                AudienciaService.parseData(obrigatorio(ctx, "dataFim")),
                Integer.parseInt(obrigatorio(ctx, "duracao")),
                obrigatorio(ctx, "horarioInicioMinimo"),
                obrigatorio(ctx, "horarioFimMaximo"))));

        // Exportações da lista (respeitam os mesmos filtros da listagem).
        app.get(base + "/exportar/csv", ctx -> {
            byte[] csv = exportacao.gerarCsv(audiencias.listar(ctx.queryParam("competencia"),
                    ctx.queryParam("varaId"), ctx.queryParam("dataInicio"), ctx.queryParam("dataFim"),
                    ctx.queryParam("status"), ctx.queryParam("tipoAudiencia"), ctx.queryParam("q")));
            ctx.contentType("text/csv; charset=UTF-8");
            ctx.header("Content-Disposition", "attachment; filename=audiencias.csv");
            ctx.result(csv);
        });
        app.get(base + "/exportar/pdf", ctx -> {
            byte[] pdf = exportacao.gerarPdfPaisagem(audiencias.listar(ctx.queryParam("competencia"),
                    ctx.queryParam("varaId"), ctx.queryParam("dataInicio"), ctx.queryParam("dataFim"),
                    ctx.queryParam("status"), ctx.queryParam("tipoAudiencia"), ctx.queryParam("q")));
            ctx.contentType("application/pdf");
            ctx.header("Content-Disposition", "inline; filename=audiencias.pdf");
            ctx.result(pdf);
        });

        // Não há POST /audiencias avulso: audiências nascem somente dentro de
        // uma pauta, via POST /pautas/{id}/audiencias (fluxo do fórum).
        app.get(base + "/{id}", ctx -> ctx.json(audiencias.buscarPorId(idDaRota(ctx))));
        app.put(base + "/{id}", ctx -> ctx.json(audiencias.atualizar(idDaRota(ctx), corpo(ctx))));
        app.delete(base + "/{id}", ctx -> {
            audiencias.excluir(idDaRota(ctx));
            ctx.status(204);
        });

        app.get(base + "/{id}/participantes", ctx -> ctx.json(participacoes.listar(idDaRota(ctx))));
        app.post(base + "/{id}/participantes",
                ctx -> ctx.status(201).json(participacoes.adicionar(idDaRota(ctx), corpo(ctx))));
        // Substitui toda a relação de partes de uma vez, em transação única.
        app.put(base + "/{id}/participantes",
                ctx -> ctx.json(participacoes.substituir(idDaRota(ctx), corpoLista(ctx))));
        app.delete(base + "/{id}/participantes", ctx -> {
            participacoes.removerTodos(idDaRota(ctx));
            ctx.status(204);
        });
        app.delete(base + "/{id}/participantes/{participanteId}", ctx -> {
            participacoes.remover(idDaRota(ctx), Long.parseLong(ctx.pathParam("participanteId")));
            ctx.status(204);
        });
    }

    /**
     * Registra as rotas das pautas de audiências: CRUD, audiências da
     * pauta (listagem e criação com herança rígida de data/vara/juiz/
     * promotor) e impressão simplificada em PDF.
     *
     * @param app        instância do Javalin
     * @param prefixo    {@code ""} ou {@code "/api"}
     * @param pautas     serviço de pautas
     * @param audiencias serviço de audiências
     * @param pautaPdf   gerador de PDF
     */
    private static void registrarPautas(Javalin app, String prefixo, PautaService pautas,
                                        AudienciaService audiencias, PautaPdfService pautaPdf) {
        String base = prefixo + "/pautas";

        app.get(base, ctx -> ctx.json(pautas.listar(ctx.queryParam("dataInicio"), ctx.queryParam("dataFim"),
                ctx.queryParam("varaId"), ctx.queryParam("q"))));
        app.post(base, ctx -> ctx.status(201).json(pautas.criar(corpo(ctx))));
        app.get(base + "/{id}", ctx -> ctx.json(pautas.buscarPorId(idDaRota(ctx))));
        app.put(base + "/{id}", ctx -> ctx.json(pautas.atualizar(idDaRota(ctx), corpo(ctx))));
        app.delete(base + "/{id}", ctx -> {
            pautas.excluir(idDaRota(ctx));
            ctx.status(204);
        });

        app.get(base + "/{id}/audiencias", ctx -> ctx.json(audiencias.listarPorPauta(idDaRota(ctx))));
        app.post(base + "/{id}/audiencias",
                ctx -> ctx.status(201).json(audiencias.criarNaPauta(idDaRota(ctx), corpo(ctx))));

        app.get(base + "/{id}/pdf", ctx -> {
            long id = idDaRota(ctx);
            byte[] pdf = pautaPdf.gerarPdfDaPauta(pautas.buscarPorId(id), audiencias.listarPorPauta(id));
            ctx.contentType("application/pdf");
            ctx.header("Content-Disposition", "inline; filename=pauta_" + id + ".pdf");
            ctx.result(pdf);
        });
    }

    /**
     * Registra as rotas do controle de mandados de intimação e do
     * levantamento de pendências das audiências futuras.
     *
     * @param app        instância do Javalin
     * @param prefixo    {@code ""} ou {@code "/api"}
     * @param mandados   serviço de mandados
     * @param pendencias serviço de pendências
     */
    private static void registrarMandadosEPendencias(Javalin app, String prefixo,
                                                     MandadoService mandados, PendenciaService pendencias) {
        app.get(prefixo + "/mandados", ctx -> ctx.json(mandados.listar(
                ctx.queryParam("varaId"), ctx.queryParam("dataInicio"), ctx.queryParam("dataFim"),
                ctx.queryParam("statusMandado"), ctx.queryParam("intimado"), ctx.queryParam("q"))));
        app.put(prefixo + "/mandados/{id}", ctx -> ctx.json(mandados.atualizar(idDaRota(ctx), corpo(ctx))));
        app.get(prefixo + "/pendencias", ctx -> ctx.json(pendencias.listarPendencias()));
    }

    /**
     * Registra as rotas de usuários (login, cadastro, troca de senha e
     * consulta). As telas de autenticação esperam o campo {@code erro}
     * no corpo em caso de falha — ver {@link #registrarTratamentoDeErros}.
     *
     * @param app      instância do Javalin
     * @param prefixo  {@code ""} ou {@code "/api"}
     * @param usuarios serviço de usuários
     */
    private static void registrarUsuarios(Javalin app, String prefixo, UsuarioService usuarios) {
        String base = prefixo + "/usuarios";

        app.post(base + "/login", ctx -> {
            Map<String, Object> corpo = corpo(ctx);
            ctx.json(usuarios.autenticar(
                    texto(corpo, "login"), texto(corpo, "senha")));
        });
        app.post(base + "/cadastrar", ctx -> ctx.status(201).json(usuarios.cadastrar(corpo(ctx))));
        app.post(base + "/{id}/alterar-senha", ctx -> {
            Map<String, Object> corpo = corpo(ctx);
            usuarios.alterarSenha(idDaRota(ctx), texto(corpo, "senhaAtual"), texto(corpo, "novaSenha"));
            ctx.json(Map.of("mensagem", "Senha alterada com sucesso"));
        });
        app.put(base + "/{id}/perfil", ctx -> ctx.json(usuarios.atualizarPerfil(idDaRota(ctx), corpo(ctx))));
        app.get(base + "/{id}", ctx -> ctx.json(usuarios.buscarPorId(idDaRota(ctx))));
    }

    /**
     * Registra os tratadores de exceção, replicando o formato de resposta
     * do antigo GlobalExceptionHandler e acrescentando o campo {@code erro}
     * usado pelas telas de login/cadastro.
     *
     * @param app instância do Javalin
     */
    private static void registrarTratamentoDeErros(Javalin app) {
        app.exception(ApiException.class, (e, ctx) -> {
            // Com erros de validação, a mensagem lista os problemas por extenso,
            // pois é ela que o frontend exibe ao usuário.
            String mensagem = e.getErros() == null ? e.getMessage()
                    : String.join("; ", e.getErros().values());
            Map<String, Object> corpo = corpoDeErro(e.getStatus(), mensagem, ctx.path());
            if (e.getErros() != null) {
                corpo.put("errors", e.getErros());
            }
            ctx.status(e.getStatus()).json(corpo);
        });
        app.exception(NumberFormatException.class, (e, ctx) ->
                ctx.status(400).json(corpoDeErro(400, "Parâmetro numérico inválido: " + e.getMessage(), ctx.path())));
        app.exception(Exception.class, (e, ctx) -> {
            ctx.status(500).json(corpoDeErro(500, "Erro interno: " + e.getMessage(), ctx.path()));
        });
    }

    /**
     * Monta o corpo JSON padrão das respostas de erro.
     *
     * @param status   código HTTP
     * @param mensagem descrição do erro
     * @param caminho  rota requisitada
     * @return mapa pronto para serialização
     */
    private static Map<String, Object> corpoDeErro(int status, String mensagem, String caminho) {
        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("timestamp", LocalDateTime.now().toString());
        corpo.put("status", status);
        corpo.put("error", switch (status) {
            case 400 -> "Bad Request";
            case 401 -> "Unauthorized";
            case 404 -> "Not Found";
            case 409 -> "Conflict";
            default -> "Internal Server Error";
        });
        corpo.put("message", mensagem);
        corpo.put("erro", mensagem);
        corpo.put("path", caminho);
        return corpo;
    }

    /**
     * Lê o corpo JSON da requisição como mapa.
     *
     * @param ctx contexto da requisição
     * @return corpo desserializado (vazio se não houver corpo)
     */
    @SuppressWarnings("unchecked")
    private static Map<String, Object> corpo(Context ctx) {
        if (ctx.body().isBlank()) {
            return Map.of();
        }
        return ctx.bodyAsClass(Map.class);
    }

    /**
     * Lê o corpo JSON da requisição como lista de mapas.
     *
     * @param ctx contexto da requisição
     * @return corpo desserializado (lista vazia se não houver corpo)
     */
    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> corpoLista(Context ctx) {
        if (ctx.body().isBlank()) {
            return List.of();
        }
        return ctx.bodyAsClass(List.class);
    }

    /**
     * Lê o parâmetro de rota {@code id} como número.
     *
     * @param ctx contexto da requisição
     * @return id numérico
     */
    private static long idDaRota(Context ctx) {
        return Long.parseLong(ctx.pathParam("id"));
    }

    /**
     * Lê um parâmetro de consulta obrigatório.
     *
     * @param ctx  contexto da requisição
     * @param nome nome do parâmetro
     * @return valor do parâmetro
     * @throws ApiException 400 se o parâmetro estiver ausente
     */
    private static String obrigatorio(Context ctx, String nome) {
        String valor = ctx.queryParam(nome);
        if (valor == null || valor.isBlank()) {
            throw ApiException.validacao(Map.of(nome, "Parâmetro obrigatório"));
        }
        return valor;
    }

    /**
     * Lê um campo textual de um mapa.
     *
     * @param mapa  corpo da requisição
     * @param campo nome do campo
     * @return valor como texto, ou {@code null} se ausente
     */
    private static String texto(Map<String, Object> mapa, String campo) {
        Object valor = mapa.get(campo);
        return valor == null ? null : valor.toString();
    }
}
