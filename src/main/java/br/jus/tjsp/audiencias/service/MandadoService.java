package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.config.Database;
import br.jus.tjsp.audiencias.util.Textos;
import br.jus.tjsp.audiencias.web.ApiException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Controle dos mandados de intimação dos participantes das audiências.
 *
 * <p>Oferece a listagem consolidada (participante + audiência + vara) com
 * filtros diversos, usada pela tela de Controle de Mandados, e a
 * atualização rápida da situação do mandado sem precisar reabrir o
 * formulário da audiência.</p>
 */
public class MandadoService {

    /** Consulta base com os JOINs da listagem de mandados. */
    private static final String SELECT_BASE = """
            SELECT pa.id, pa.tipo, pa.intimado, pa.status_mandado, pa.folha_intimacao, pa.observacoes,
                   pe.id AS pessoa_id, pe.nome AS pessoa_nome, pe.cpf AS pessoa_cpf,
                   a.id AS audiencia_id, a.numero_processo, a.data_audiencia, a.horario_inicio,
                   a.status AS audiencia_status,
                   v.id AS vara_id, v.nome AS vara_nome
            FROM participacao_audiencia pa
            JOIN audiencia a ON a.id = pa.audiencia_id
            JOIN pessoa pe ON pe.id = pa.pessoa_id
            JOIN vara v ON v.id = a.vara_id
            """;

    /**
     * Lista os mandados aplicando os filtros informados (todos opcionais).
     *
     * @param varaId        vara da audiência
     * @param dataInicio    primeira data da audiência ({@code yyyy-MM-dd} ou {@code dd/MM/yyyy})
     * @param dataFim       última data da audiência
     * @param statusMandado situação do mandado (nome do enum {@code StatusMandado})
     * @param intimado      {@code "true"}/{@code "false"} para filtrar pela intimação
     * @param texto         trecho do nome da pessoa ou do número do processo
     * @return mandados ordenados por data e horário da audiência
     */
    public List<Map<String, Object>> listar(String varaId, String dataInicio, String dataFim,
                                            String statusMandado, String intimado, String texto) {
        StringBuilder sql = new StringBuilder(SELECT_BASE).append(" WHERE 1=1");
        List<Object> params = new ArrayList<>();

        if (naoVazio(varaId)) {
            sql.append(" AND a.vara_id = ?");
            params.add(Long.parseLong(varaId));
        }
        if (naoVazio(dataInicio)) {
            sql.append(" AND a.data_audiencia >= ?");
            params.add(AudienciaService.parseData(dataInicio).toString());
        }
        if (naoVazio(dataFim)) {
            sql.append(" AND a.data_audiencia <= ?");
            params.add(AudienciaService.parseData(dataFim).toString());
        }
        if (naoVazio(statusMandado)) {
            sql.append(" AND pa.status_mandado = ?");
            params.add(ParticipacaoService.validarStatusMandado(statusMandado));
        }
        if (naoVazio(intimado)) {
            sql.append(" AND pa.intimado = ?");
            params.add(Boolean.parseBoolean(intimado) ? 1 : 0);
        }
        if (naoVazio(texto)) {
            // O UPPER() do SQLite só cobre ASCII; a conversão do termo é
            // feita no Java para que acentos também casem.
            sql.append(" AND (UPPER(pe.nome) LIKE ? OR a.numero_processo LIKE ?)");
            params.add("%" + Textos.maiusculas(texto) + "%");
            params.add("%" + texto.strip() + "%");
        }
        sql.append(" ORDER BY a.data_audiencia, a.horario_inicio, pe.nome");
        return Database.query(sql.toString(), this::mapear, params.toArray());
    }

    /**
     * Atualiza a situação do mandado de um participante. Somente os campos
     * presentes no corpo são alterados ({@code statusMandado},
     * {@code intimado} e {@code folhaIntimacao}).
     *
     * @param participacaoId id da participação (linha da tela de mandados)
     * @param dados          campos a atualizar
     * @return mandado atualizado, no formato da listagem
     * @throws ApiException 404 se a participação não existir; 400 se a situação for inválida
     */
    public Map<String, Object> atualizar(long participacaoId, Map<String, Object> dados) {
        buscarPorId(participacaoId);

        List<String> atribuicoes = new ArrayList<>();
        List<Object> params = new ArrayList<>();
        if (dados.containsKey("statusMandado")) {
            atribuicoes.add("status_mandado = ?");
            params.add(ParticipacaoService.validarStatusMandado(dados.get("statusMandado")));
        }
        if (dados.containsKey("intimado")) {
            atribuicoes.add("intimado = ?");
            params.add(Boolean.parseBoolean(String.valueOf(dados.get("intimado"))) ? 1 : 0);
        }
        if (dados.containsKey("folhaIntimacao")) {
            atribuicoes.add("folha_intimacao = ?");
            Object folha = dados.get("folhaIntimacao");
            params.add(folha == null || folha.toString().isBlank() ? null : folha.toString().strip());
        }
        if (!atribuicoes.isEmpty()) {
            params.add(participacaoId);
            Database.update("UPDATE participacao_audiencia SET " + String.join(", ", atribuicoes)
                    + " WHERE id = ?", params.toArray());
        }
        return buscarPorId(participacaoId);
    }

    /**
     * Busca um mandado (participação) pelo id, no formato da listagem.
     *
     * @param participacaoId id da participação
     * @return mandado encontrado
     * @throws ApiException 404 se não existir
     */
    public Map<String, Object> buscarPorId(long participacaoId) {
        return Database.queryOne(SELECT_BASE + " WHERE pa.id = ?", this::mapear, participacaoId)
                .orElseThrow(() -> ApiException.naoEncontrado(
                        "Mandado não encontrado com id " + participacaoId));
    }

    /**
     * Converte uma linha da consulta no formato JSON da tela de mandados.
     *
     * @param rs result set posicionado na linha
     * @return mandado como mapa pronto para serialização
     * @throws SQLException se a leitura falhar
     */
    private Map<String, Object> mapear(ResultSet rs) throws SQLException {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", rs.getLong("id"));
        m.put("tipo", rs.getString("tipo"));
        m.put("intimado", rs.getInt("intimado") != 0);
        m.put("statusMandado", rs.getString("status_mandado"));
        m.put("folhaIntimacao", rs.getString("folha_intimacao"));
        m.put("observacoes", rs.getString("observacoes"));
        m.put("pessoa", Map.of(
                "id", rs.getLong("pessoa_id"),
                "nome", rs.getString("pessoa_nome"),
                "cpf", rs.getString("pessoa_cpf") == null ? "" : rs.getString("pessoa_cpf")));
        Map<String, Object> audiencia = new LinkedHashMap<>();
        audiencia.put("id", rs.getLong("audiencia_id"));
        audiencia.put("numeroProcesso", rs.getString("numero_processo"));
        audiencia.put("dataAudiencia", rs.getString("data_audiencia"));
        audiencia.put("horarioInicio", rs.getString("horario_inicio"));
        audiencia.put("status", rs.getString("audiencia_status"));
        audiencia.put("vara", Map.of("id", rs.getLong("vara_id"), "nome", rs.getString("vara_nome")));
        m.put("audiencia", audiencia);
        return m;
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
}
