package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.config.Database;
import br.jus.tjsp.audiencias.model.enums.Competencia;
import br.jus.tjsp.audiencias.model.enums.FormatoAudiencia;
import br.jus.tjsp.audiencias.model.enums.StatusAudiencia;
import br.jus.tjsp.audiencias.model.enums.TipoAudiencia;
import br.jus.tjsp.audiencias.util.Textos;
import br.jus.tjsp.audiencias.web.ApiException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Regras de negócio das audiências: validação, persistência, verificação
 * consultiva de conflitos de horário e busca de horários livres.
 *
 * <p>As audiências são lidas com JOIN nas tabelas de vara, juiz e promotor
 * e devolvidas no formato JSON esperado pelo frontend, com os objetos
 * aninhados {@code vara}, {@code juiz} e {@code promotor}.</p>
 */
public class AudienciaService {

    /** Padrão CNJ do número de processo: NNNNNNN-DD.AAAA.J.TR.OOOO. */
    private static final Pattern PADRAO_PROCESSO =
            Pattern.compile("\\d{7}-\\d{2}\\.\\d{4}\\.\\d\\.\\d{2}\\.\\d{4}");

    /** Formato brasileiro de data, aceito como alternativa na entrada. */
    private static final DateTimeFormatter FORMATO_BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /** Formato de exibição/persistência dos horários. */
    private static final DateTimeFormatter FORMATO_HORA = DateTimeFormatter.ofPattern("HH:mm");

    /** Locale brasileiro para o nome do dia da semana. */
    private static final Locale PT_BR = Locale.forLanguageTag("pt-BR");

    /** Consulta base com os JOINs necessários para montar a resposta. */
    private static final String SELECT_BASE = """
            SELECT a.*, v.nome AS vara_nome, j.nome AS juiz_nome, p.nome AS promotor_nome
            FROM audiencia a
            JOIN vara v ON v.id = a.vara_id
            LEFT JOIN juiz j ON j.id = a.juiz_id
            LEFT JOIN promotor p ON p.id = a.promotor_id
            """;

    /**
     * Interpreta uma data aceitando {@code yyyy-MM-dd} (padrão da API) ou
     * {@code dd/MM/yyyy} (formato usado em algumas telas do frontend).
     *
     * @param texto data em texto
     * @return data interpretada
     * @throws ApiException 400 se o texto não for uma data válida
     */
    public static LocalDate parseData(String texto) {
        if (texto == null || texto.isBlank()) {
            throw ApiException.validacao(Map.of("data", "Data é obrigatória"));
        }
        try {
            return LocalDate.parse(texto.strip());
        } catch (Exception ignorada) {
            try {
                return LocalDate.parse(texto.strip(), FORMATO_BR);
            } catch (Exception e) {
                throw ApiException.validacao(Map.of("data", "Data inválida: " + texto));
            }
        }
    }

    /**
     * Lista todas as audiências, opcionalmente filtradas por competência.
     *
     * @param competencia competência a filtrar, ou {@code null}/vazio para todas
     * @return audiências ordenadas por data e horário
     */
    public List<Map<String, Object>> listar(String competencia) {
        return listar(competencia, null, null, null, null, null, null);
    }

    /**
     * Lista as audiências aplicando os filtros informados (todos opcionais).
     * É a consulta usada pela tela de listagem e pela pauta em PDF.
     *
     * @param competencia   competência da audiência
     * @param varaId        vara da audiência
     * @param dataInicio    primeira data do período ({@code yyyy-MM-dd} ou {@code dd/MM/yyyy})
     * @param dataFim       última data do período
     * @param status        status da audiência
     * @param tipoAudiencia tipo da audiência
     * @param texto         trecho do número do processo, artigo ou observações
     * @return audiências ordenadas por data e horário
     */
    public List<Map<String, Object>> listar(String competencia, String varaId, String dataInicio, String dataFim,
                                            String status, String tipoAudiencia, String texto) {
        StringBuilder sql = new StringBuilder(SELECT_BASE).append(" WHERE 1=1");
        List<Object> params = new ArrayList<>();

        if (naoVazio(competencia)) {
            sql.append(" AND a.competencia = ?");
            params.add(competencia);
        }
        if (naoVazio(varaId)) {
            sql.append(" AND a.vara_id = ?");
            params.add(Long.parseLong(varaId));
        }
        if (naoVazio(dataInicio)) {
            sql.append(" AND a.data_audiencia >= ?");
            params.add(parseData(dataInicio).toString());
        }
        if (naoVazio(dataFim)) {
            sql.append(" AND a.data_audiencia <= ?");
            params.add(parseData(dataFim).toString());
        }
        if (naoVazio(status)) {
            sql.append(" AND a.status = ?");
            params.add(status);
        }
        if (naoVazio(tipoAudiencia)) {
            sql.append(" AND a.tipo_audiencia = ?");
            params.add(tipoAudiencia);
        }
        if (naoVazio(texto)) {
            // O UPPER() do SQLite só cobre ASCII; a conversão do termo é
            // feita no Java para que acentos também casem.
            sql.append(" AND (a.numero_processo LIKE ? OR UPPER(COALESCE(a.artigo, '')) LIKE ?"
                    + " OR UPPER(COALESCE(a.observacoes, '')) LIKE ?)");
            params.add("%" + texto.strip() + "%");
            String termoMaiusculo = "%" + Textos.maiusculas(texto) + "%";
            params.add(termoMaiusculo);
            params.add(termoMaiusculo);
        }
        sql.append(" ORDER BY a.data_audiencia, a.horario_inicio");
        return Database.query(sql.toString(), this::mapear, params.toArray());
    }

    /**
     * Verifica se um parâmetro de filtro foi informado.
     *
     * @param valor valor do parâmetro
     * @return {@code true} se não for nulo nem vazio
     */
    private static boolean naoVazio(String valor) {
        return valor != null && !valor.isBlank();
    }

    /**
     * Lista as audiências de uma data específica, ordenadas pelo horário.
     *
     * @param data data das audiências
     * @return audiências do dia
     */
    public List<Map<String, Object>> listarPorData(LocalDate data) {
        return Database.query(SELECT_BASE + " WHERE a.data_audiencia = ? ORDER BY a.horario_inicio",
                this::mapear, data.toString());
    }

    /**
     * Lista as audiências de uma pauta, ordenadas pelo horário.
     *
     * @param pautaId id da pauta
     * @return audiências da pauta
     */
    public List<Map<String, Object>> listarPorPauta(long pautaId) {
        return Database.query(SELECT_BASE + " WHERE a.pauta_id = ? ORDER BY a.horario_inicio",
                this::mapear, pautaId);
    }

    /**
     * Busca uma audiência pelo id.
     *
     * @param id identificador da audiência
     * @return audiência com vara/juiz/promotor aninhados
     * @throws ApiException 404 se não existir
     */
    public Map<String, Object> buscarPorId(long id) {
        return Database.queryOne(SELECT_BASE + " WHERE a.id = ?", this::mapear, id)
                .orElseThrow(() -> ApiException.naoEncontrado("Audiência não encontrada com id " + id));
    }

    /**
     * Cria uma audiência a partir do corpo da requisição.
     *
     * @param dados campos da audiência (com {@code varaId}, {@code juizId}, {@code promotorId})
     * @return audiência criada, no formato de resposta da API
     */
    public Map<String, Object> criar(Map<String, Object> dados) {
        Valores v = validar(dados);
        String agora = LocalDateTime.now().toString();
        long id = Database.insert("""
                        INSERT INTO audiencia (numero_processo, pauta_id, vara_id, data_audiencia, horario_inicio,
                            duracao, horario_fim, dia_semana, tipo_audiencia, formato, competencia, status, artigo,
                            observacoes, denuncia, denuncia_folha, defesa_previa, defesa_previa_folha, fa_cdc,
                            fa_cdc_folha, laudo, laudo_folha, reu_preso, agendamento_teams, reconhecimento,
                            depoimento_especial, juiz_id, promotor_id, criacao, atualizacao)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                v.numeroProcesso, v.pautaId, v.varaId, v.data.toString(), v.inicio.format(FORMATO_HORA), v.duracao,
                v.fim.format(FORMATO_HORA), v.diaSemana, v.tipo, v.formato, v.competencia, v.status, v.artigo,
                v.observacoes, v.denuncia, v.denunciaFolha,
                v.defesaPrevia, v.defesaPreviaFolha, v.faCdc, v.faCdcFolha, v.laudo, v.laudoFolha,
                // reu_preso é derivado dos participantes presos; nasce desmarcado.
                false, v.agendamentoTeams, v.reconhecimento, v.depoimentoEspecial,
                v.juizId, v.promotorId, agora, agora);
        return buscarPorId(id);
    }

    /**
     * Cria uma audiência dentro de uma pauta, herdando dela a data, a vara,
     * o juiz e o promotor (vínculo rígido: os valores eventualmente enviados
     * no corpo para esses campos são ignorados).
     *
     * @param pautaId id da pauta que receberá a audiência
     * @param dados   demais campos da audiência (processo, horário, tipo etc.)
     * @return audiência criada, no formato de resposta da API
     * @throws ApiException 404 se a pauta não existir; 400 se a validação falhar
     */
    public Map<String, Object> criarNaPauta(long pautaId, Map<String, Object> dados) {
        Map<String, Object> completos = new LinkedHashMap<>(dados == null ? Map.of() : dados);
        injetarDadosDaPauta(pautaId, completos);
        return criar(completos);
    }

    /**
     * Copia para o corpo da audiência os campos herdados da pauta
     * (data, vara, juiz, promotor) e o próprio {@code pautaId}.
     *
     * @param pautaId id da pauta
     * @param dados   corpo da audiência a completar (modificado no lugar)
     * @throws ApiException 404 se a pauta não existir
     */
    private void injetarDadosDaPauta(long pautaId, Map<String, Object> dados) {
        Map<String, Object> pauta = Database.queryOne(
                        "SELECT data, vara_id, juiz_id, promotor_id FROM pauta WHERE id = ?",
                        rs -> Map.<String, Object>of(
                                "data", rs.getString("data"),
                                "varaId", rs.getLong("vara_id"),
                                "juizId", rs.getLong("juiz_id"),
                                "promotorId", rs.getLong("promotor_id")),
                        pautaId)
                .orElseThrow(() -> ApiException.naoEncontrado("Pauta não encontrada com id " + pautaId));
        dados.put("pautaId", pautaId);
        dados.put("dataAudiencia", pauta.get("data"));
        dados.put("varaId", pauta.get("varaId"));
        dados.put("juizId", pauta.get("juizId"));
        dados.put("promotorId", pauta.get("promotorId"));
    }

    /**
     * Atualiza uma audiência existente.
     *
     * @param id    identificador da audiência
     * @param dados novos valores
     * @return audiência atualizada, no formato de resposta da API
     * @throws ApiException 404 se não existir; 400 se a validação falhar
     */
    public Map<String, Object> atualizar(long id, Map<String, Object> dados) {
        Map<String, Object> existente = buscarPorId(id);
        Map<String, Object> completos = new LinkedHashMap<>(dados == null ? Map.of() : dados);
        // Audiência de pauta mantém o vínculo rígido: data, vara, juiz e
        // promotor vêm sempre da pauta, mesmo que o corpo tente alterá-los.
        Object pautaId = existente.get("pautaId");
        if (pautaId != null) {
            injetarDadosDaPauta(((Number) pautaId).longValue(), completos);
        }
        Valores v = validar(completos);
        // reu_preso não entra no UPDATE: é derivado dos participantes presos
        // e mantido pelo ParticipacaoService.
        Database.update("""
                        UPDATE audiencia SET numero_processo = ?, vara_id = ?, data_audiencia = ?, horario_inicio = ?,
                            duracao = ?, horario_fim = ?, dia_semana = ?, tipo_audiencia = ?, formato = ?,
                            competencia = ?, status = ?, artigo = ?, observacoes = ?, denuncia = ?,
                            denuncia_folha = ?, defesa_previa = ?,
                            defesa_previa_folha = ?, fa_cdc = ?, fa_cdc_folha = ?, laudo = ?, laudo_folha = ?,
                            agendamento_teams = ?, reconhecimento = ?, depoimento_especial = ?, juiz_id = ?,
                            promotor_id = ?, atualizacao = ?
                        WHERE id = ?
                        """,
                v.numeroProcesso, v.varaId, v.data.toString(), v.inicio.format(FORMATO_HORA), v.duracao,
                v.fim.format(FORMATO_HORA), v.diaSemana, v.tipo, v.formato, v.competencia, v.status, v.artigo,
                v.observacoes, v.denuncia, v.denunciaFolha,
                v.defesaPrevia, v.defesaPreviaFolha, v.faCdc, v.faCdcFolha, v.laudo, v.laudoFolha,
                v.agendamentoTeams, v.reconhecimento, v.depoimentoEspecial,
                v.juizId, v.promotorId, LocalDateTime.now().toString(), id);
        return buscarPorId(id);
    }

    /**
     * Exclui uma audiência e, por cascata, suas participações e
     * representações de advogados.
     *
     * @param id identificador da audiência
     * @throws ApiException 404 se não existir
     */
    public void excluir(long id) {
        buscarPorId(id);
        Database.update("DELETE FROM audiencia WHERE id = ?", id);
    }

    /**
     * Verifica, de forma consultiva, se um horário proposto conflita com
     * audiências já marcadas na mesma vara e data. Audiências canceladas
     * são ignoradas; em edição, a própria audiência é excluída da checagem.
     *
     * @param data          data proposta
     * @param horarioInicio horário de início proposto ({@code HH:mm})
     * @param duracao       duração em minutos
     * @param varaId        vara da audiência
     * @param audienciaId   id da audiência em edição, ou {@code null} para nova
     * @return resposta {@code {temConflito, conflitos[]}} para o frontend
     */
    public Map<String, Object> verificarConflitos(LocalDate data, String horarioInicio, int duracao,
                                                  long varaId, Long audienciaId) {
        LocalTime inicio = LocalTime.parse(horarioInicio);
        LocalTime fim = inicio.plusMinutes(duracao);

        String sql = SELECT_BASE + " WHERE a.data_audiencia = ? AND a.vara_id = ? AND a.status != 'NAO_REALIZADA'";
        List<Object> params = new ArrayList<>(List.of(data.toString(), varaId));
        if (audienciaId != null) {
            sql += " AND a.id != ?";
            params.add(audienciaId);
        }

        List<Map<String, Object>> conflitos = new ArrayList<>();
        for (Map<String, Object> audiencia : Database.query(sql, this::mapear, params.toArray())) {
            LocalTime inicioExistente = LocalTime.parse((String) audiencia.get("horarioInicio"));
            LocalTime fimExistente = inicioExistente.plusMinutes(((Number) audiencia.get("duracao")).longValue());
            // Sobreposição real de intervalos: audiências encostadas (uma termina
            // exatamente quando a outra começa) não são conflito.
            boolean sobrepoe = inicio.isBefore(fimExistente) && fim.isAfter(inicioExistente);
            if (sobrepoe) {
                Map<String, Object> conflito = new LinkedHashMap<>();
                conflito.put("id", audiencia.get("id"));
                conflito.put("numeroProcesso", audiencia.get("numeroProcesso"));
                conflito.put("horarioInicio", inicioExistente.format(FORMATO_HORA));
                conflito.put("horarioFim", fimExistente.format(FORMATO_HORA));
                conflito.put("duracao", audiencia.get("duracao"));
                conflito.put("varaNome", ((Map<?, ?>) audiencia.get("vara")).get("nome"));
                Map<?, ?> juiz = (Map<?, ?>) audiencia.get("juiz");
                conflito.put("juizNome", juiz == null ? null : juiz.get("nome"));
                conflitos.add(conflito);
            }
        }
        return Map.of("temConflito", !conflitos.isEmpty(), "conflitos", conflitos);
    }

    /**
     * Procura horários livres para agendamento em uma vara dentro de um
     * período, pulando fins de semana e mantendo 30 minutos de intervalo
     * de segurança entre audiências.
     *
     * @param varaId        vara desejada
     * @param dataInicio    primeiro dia do período
     * @param dataFim       último dia do período
     * @param duracao       duração desejada em minutos
     * @param horarioMinimo não sugerir horários antes deste ({@code HH:mm})
     * @param horarioMaximo não sugerir términos depois deste ({@code HH:mm})
     * @return lista de sugestões {@code {data, horarioInicio, horarioFim, duracao, varaId, diaSemana}}
     */
    public List<Map<String, Object>> buscarHorariosLivres(long varaId, LocalDate dataInicio, LocalDate dataFim,
                                                          int duracao, String horarioMinimo, String horarioMaximo) {
        LocalTime minimo = LocalTime.parse(horarioMinimo);
        LocalTime maximo = LocalTime.parse(horarioMaximo);
        int intervaloSeguranca = 30;
        LocalDate hoje = LocalDate.now();
        LocalTime agora = LocalTime.now();

        List<Map<String, Object>> livres = new ArrayList<>();
        for (LocalDate dia = dataInicio; !dia.isAfter(dataFim); dia = dia.plusDays(1)) {
            if (dia.getDayOfWeek() == DayOfWeek.SATURDAY || dia.getDayOfWeek() == DayOfWeek.SUNDAY
                    || dia.isBefore(hoje)) {
                // Fins de semana e dias já passados não recebem sugestões.
                continue;
            }
            List<LocalTime[]> ocupados = Database.query(
                    "SELECT horario_inicio, duracao FROM audiencia " +
                            "WHERE data_audiencia = ? AND vara_id = ? AND status != 'NAO_REALIZADA'",
                    rs -> {
                        LocalTime ini = LocalTime.parse(rs.getString("horario_inicio"));
                        return new LocalTime[]{ini, ini.plusMinutes(rs.getInt("duracao"))};
                    },
                    dia.toString(), varaId);

            for (LocalTime slot = minimo; !slot.plusMinutes(duracao).isAfter(maximo); slot = slot.plusMinutes(30)) {
                if (dia.equals(hoje) && slot.isBefore(agora)) {
                    // Não sugerir horários que já passaram no dia de hoje.
                    continue;
                }
                LocalTime fimSlot = slot.plusMinutes(duracao);
                boolean conflita = false;
                for (LocalTime[] ocupado : ocupados) {
                    // O slot é válido quando termina 30 min (intervalo de segurança)
                    // antes da audiência ocupada OU começa 30 min depois dela.
                    if (fimSlot.plusMinutes(intervaloSeguranca).isAfter(ocupado[0])
                            && slot.isBefore(ocupado[1].plusMinutes(intervaloSeguranca))) {
                        conflita = true;
                        break;
                    }
                }
                if (!conflita) {
                    Map<String, Object> livre = new LinkedHashMap<>();
                    livre.put("data", dia.toString());
                    livre.put("horarioInicio", slot.format(FORMATO_HORA));
                    livre.put("horarioFim", fimSlot.format(FORMATO_HORA));
                    livre.put("duracao", duracao);
                    livre.put("varaId", varaId);
                    livre.put("diaSemana", dia.getDayOfWeek().getDisplayName(TextStyle.FULL, PT_BR));
                    livres.add(livre);
                }
            }
        }
        return livres;
    }

    /**
     * Conta o total de audiências cadastradas.
     *
     * @return quantidade de audiências
     */
    public long contar() {
        return Database.count("SELECT COUNT(*) FROM audiencia");
    }

    /**
     * Conta as audiências de uma data.
     *
     * @param data data de interesse
     * @return quantidade de audiências no dia
     */
    public long contarPorData(LocalDate data) {
        return Database.count("SELECT COUNT(*) FROM audiencia WHERE data_audiencia = ?", data.toString());
    }

    /**
     * Converte uma linha do banco (com os JOINs de {@link #SELECT_BASE})
     * no formato JSON da API, incluindo os objetos aninhados.
     *
     * @param rs result set posicionado na linha
     * @return audiência como mapa pronto para serialização
     * @throws SQLException se a leitura falhar
     */
    private Map<String, Object> mapear(ResultSet rs) throws SQLException {
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("id", rs.getLong("id"));
        a.put("numeroProcesso", rs.getString("numero_processo"));
        a.put("dataAudiencia", rs.getString("data_audiencia"));
        a.put("horarioInicio", rs.getString("horario_inicio"));
        a.put("duracao", rs.getInt("duracao"));
        a.put("horarioFim", rs.getString("horario_fim"));
        a.put("diaSemana", rs.getString("dia_semana"));
        a.put("tipoAudiencia", rs.getString("tipo_audiencia"));
        a.put("formato", rs.getString("formato"));
        a.put("competencia", rs.getString("competencia"));
        a.put("status", rs.getString("status"));
        a.put("artigo", rs.getString("artigo"));
        a.put("observacoes", rs.getString("observacoes"));
        a.put("denuncia", rs.getInt("denuncia") != 0);
        a.put("denunciaFolha", rs.getString("denuncia_folha"));
        a.put("defesaPrevia", rs.getInt("defesa_previa") != 0);
        a.put("defesaPreviaFolha", rs.getString("defesa_previa_folha"));
        a.put("faCdc", rs.getInt("fa_cdc") != 0);
        a.put("faCdcFolha", rs.getString("fa_cdc_folha"));
        a.put("laudo", rs.getInt("laudo") != 0);
        a.put("laudoFolha", rs.getString("laudo_folha"));
        a.put("reuPreso", rs.getInt("reu_preso") != 0);
        a.put("agendamentoTeams", rs.getInt("agendamento_teams") != 0);
        a.put("reconhecimento", rs.getInt("reconhecimento") != 0);
        a.put("depoimentoEspecial", rs.getInt("depoimento_especial") != 0);

        long pautaId = rs.getLong("pauta_id");
        if (!rs.wasNull()) {
            a.put("pautaId", pautaId);
        }

        long varaId = rs.getLong("vara_id");
        a.put("varaId", varaId);
        a.put("vara", Map.of("id", varaId, "nome", rs.getString("vara_nome")));

        long juizId = rs.getLong("juiz_id");
        if (!rs.wasNull()) {
            a.put("juizId", juizId);
            a.put("juiz", Map.of("id", juizId, "nome", rs.getString("juiz_nome")));
        }
        long promotorId = rs.getLong("promotor_id");
        if (!rs.wasNull()) {
            a.put("promotorId", promotorId);
            a.put("promotor", Map.of("id", promotorId, "nome", rs.getString("promotor_nome")));
        }
        return a;
    }

    /**
     * Valores já validados e convertidos de uma audiência, prontos para
     * persistência.
     */
    private static final class Valores {
        String numeroProcesso;
        Long pautaId;
        long varaId;
        Long juizId;
        Long promotorId;
        LocalDate data;
        LocalTime inicio;
        LocalTime fim;
        int duracao;
        String diaSemana;
        String tipo;
        String formato;
        String competencia;
        String status;
        String artigo;
        String observacoes;
        boolean denuncia;
        String denunciaFolha;
        boolean defesaPrevia;
        String defesaPreviaFolha;
        boolean faCdc;
        String faCdcFolha;
        boolean laudo;
        String laudoFolha;
        boolean agendamentoTeams;
        boolean reconhecimento;
        boolean depoimentoEspecial;
    }

    /**
     * Valida os campos recebidos da API e calcula os derivados
     * ({@code horarioFim} e {@code diaSemana}).
     *
     * @param dados corpo da requisição
     * @return valores convertidos e prontos para gravação
     * @throws ApiException 400 com o mapa de erros por campo
     */
    private Valores validar(Map<String, Object> dados) {
        Map<String, String> erros = new LinkedHashMap<>();
        Valores v = new Valores();

        v.numeroProcesso = texto(dados, "numeroProcesso");
        if (v.numeroProcesso == null) {
            erros.put("numeroProcesso", "Número do processo é obrigatório");
        } else {
            // Aceita o número com ou sem máscara: 20 dígitos são formatados no padrão CNJ.
            v.numeroProcesso = Textos.formatarProcessoCnj(v.numeroProcesso);
            if (!PADRAO_PROCESSO.matcher(v.numeroProcesso).matches()) {
                erros.put("numeroProcesso",
                        "Número do processo deve seguir o padrão CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO (20 dígitos)");
            }
        }

        String dataTexto = texto(dados, "dataAudiencia");
        if (dataTexto == null) {
            erros.put("dataAudiencia", "Data da audiência é obrigatória");
        } else {
            try {
                v.data = parseData(dataTexto);
            } catch (ApiException e) {
                erros.put("dataAudiencia", "Data inválida: " + dataTexto);
            }
        }

        String horaTexto = texto(dados, "horarioInicio");
        if (horaTexto == null) {
            erros.put("horarioInicio", "Horário de início é obrigatório");
        } else {
            try {
                v.inicio = LocalTime.parse(horaTexto);
            } catch (Exception e) {
                erros.put("horarioInicio", "Horário inválido: " + horaTexto);
            }
        }

        Object duracaoValor = dados.get("duracao");
        if (duracaoValor == null) {
            erros.put("duracao", "Duração é obrigatória");
        } else {
            try {
                v.duracao = Integer.parseInt(duracaoValor.toString());
                if (v.duracao <= 0) {
                    erros.put("duracao", "Duração deve ser maior que zero");
                }
            } catch (NumberFormatException e) {
                erros.put("duracao", "Duração inválida");
            }
        }

        v.tipo = validarEnum(dados, "tipoAudiencia", TipoAudiencia.class, erros);
        v.formato = validarEnum(dados, "formato", FormatoAudiencia.class, erros);
        v.competencia = validarEnum(dados, "competencia", Competencia.class, erros);
        v.status = validarEnum(dados, "status", StatusAudiencia.class, erros);

        Long varaId = idOpcional(dados, "varaId", erros);
        if (varaId == null) {
            erros.putIfAbsent("varaId", "Vara é obrigatória");
        } else if (Database.count("SELECT COUNT(*) FROM vara WHERE id = ?", varaId) == 0) {
            erros.put("varaId", "Vara não encontrada com id " + varaId);
        } else {
            v.varaId = varaId;
        }

        v.juizId = idOpcional(dados, "juizId", erros);
        if (v.juizId != null && Database.count("SELECT COUNT(*) FROM juiz WHERE id = ?", v.juizId) == 0) {
            erros.put("juizId", "Juiz não encontrado com id " + v.juizId);
        }
        v.promotorId = idOpcional(dados, "promotorId", erros);
        if (v.promotorId != null && Database.count("SELECT COUNT(*) FROM promotor WHERE id = ?", v.promotorId) == 0) {
            erros.put("promotorId", "Promotor não encontrado com id " + v.promotorId);
        }

        if (!erros.isEmpty()) {
            throw ApiException.validacao(erros);
        }

        v.pautaId = idOpcional(dados, "pautaId", erros);
        v.fim = v.inicio.plusMinutes(v.duracao);
        v.diaSemana = v.data.getDayOfWeek().getDisplayName(TextStyle.FULL, PT_BR);
        v.artigo = Textos.maiusculas(texto(dados, "artigo"));
        v.observacoes = Textos.maiusculas(texto(dados, "observacoes"));
        // Peças do processo: a folha só é gravada quando a peça está marcada.
        v.denuncia = booleano(dados, "denuncia");
        v.denunciaFolha = v.denuncia ? Textos.maiusculas(texto(dados, "denunciaFolha")) : null;
        v.defesaPrevia = booleano(dados, "defesaPrevia");
        v.defesaPreviaFolha = v.defesaPrevia ? Textos.maiusculas(texto(dados, "defesaPreviaFolha")) : null;
        v.faCdc = booleano(dados, "faCdc");
        v.faCdcFolha = v.faCdc ? Textos.maiusculas(texto(dados, "faCdcFolha")) : null;
        v.laudo = booleano(dados, "laudo");
        v.laudoFolha = v.laudo ? Textos.maiusculas(texto(dados, "laudoFolha")) : null;
        v.agendamentoTeams = booleano(dados, "agendamentoTeams");
        v.reconhecimento = booleano(dados, "reconhecimento");
        v.depoimentoEspecial = booleano(dados, "depoimentoEspecial");
        return v;
    }

    /**
     * Lê um campo textual do corpo da requisição.
     *
     * @param dados corpo da requisição
     * @param campo nome do campo
     * @return texto sem espaços nas pontas, ou {@code null} se vazio/ausente
     */
    private static String texto(Map<String, Object> dados, String campo) {
        Object valor = dados == null ? null : dados.get(campo);
        if (valor == null || valor.toString().isBlank()) {
            return null;
        }
        return valor.toString().strip();
    }

    /**
     * Lê um campo booleano do corpo da requisição.
     *
     * @param dados corpo da requisição
     * @param campo nome do campo
     * @return valor lido, ou {@code false} se ausente
     */
    private static boolean booleano(Map<String, Object> dados, String campo) {
        Object valor = dados.get(campo);
        return valor != null && Boolean.parseBoolean(valor.toString());
    }

    /**
     * Lê um id numérico opcional, registrando erro se o valor não for número.
     * Valores {@code 0} são tratados como ausentes (padrão do frontend para
     * "não selecionado").
     *
     * @param dados corpo da requisição
     * @param campo nome do campo
     * @param erros mapa de erros a alimentar
     * @return id lido, ou {@code null} se ausente/zero/inválido
     */
    private static Long idOpcional(Map<String, Object> dados, String campo, Map<String, String> erros) {
        Object valor = dados == null ? null : dados.get(campo);
        if (valor == null || valor.toString().isBlank()) {
            return null;
        }
        try {
            long id = Long.parseLong(valor.toString());
            return id == 0 ? null : id;
        } catch (NumberFormatException e) {
            erros.put(campo, "Valor inválido");
            return null;
        }
    }

    /**
     * Valida que um campo contém um valor válido de um enum.
     *
     * @param dados corpo da requisição
     * @param campo nome do campo
     * @param tipo  classe do enum
     * @param erros mapa de erros a alimentar
     * @param <E>   tipo do enum
     * @return nome do valor validado, ou {@code null} se inválido/ausente
     */
    private static <E extends Enum<E>> String validarEnum(Map<String, Object> dados, String campo,
                                                          Class<E> tipo, Map<String, String> erros) {
        String valor = texto(dados, campo);
        if (valor == null) {
            erros.put(campo, "Campo obrigatório");
            return null;
        }
        try {
            return Enum.valueOf(tipo, valor).name();
        } catch (IllegalArgumentException e) {
            erros.put(campo, "Valor inválido: " + valor);
            return null;
        }
    }
}
