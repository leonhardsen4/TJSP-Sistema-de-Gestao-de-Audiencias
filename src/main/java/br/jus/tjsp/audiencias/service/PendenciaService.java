package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.config.Database;
import br.jus.tjsp.audiencias.model.enums.TipoParticipacao;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Levantamento das pendências das audiências futuras, exibido como
 * alertas no Dashboard.
 *
 * <p>Para as audiências futuras ainda pendentes (status {@code PENDENTE},
 * data igual ou posterior a hoje) são apurados três tipos de pendência:</p>
 *
 * <ul>
 *   <li><b>Audiência sem parte principal</b>: nenhum participante com papel
 *       de réu, indiciado, averiguado, autor do fato ou querelado;</li>
 *   <li><b>Parte não intimada</b>: participante com {@code intimado = false}
 *       e mandado não dispensado;</li>
 *   <li><b>Mandado com problema</b>: mandado pendente de cumprimento ou
 *       devolvido negativo, de parte ainda não intimada (quem já foi
 *       intimado por outro meio não gera alerta).</li>
 * </ul>
 *
 * <p>Além disso, audiências {@code PENDENTE} com data <em>anterior</em> a
 * hoje entram em {@code audienciasVencidas}: o status delas precisa ser
 * atualizado obrigatoriamente para Realizada ou Não Realizada.</p>
 */
public class PendenciaService {

    /** Status de audiência que ainda dependem de providências. */
    private static final String STATUS_ABERTOS = "('PENDENTE')";

    /**
     * Apura todas as pendências das audiências futuras.
     *
     * @return mapa com {@code audienciasSemParte}, {@code partesNaoIntimadas},
     *         {@code mandadosComProblema} e o resumo {@code totais}
     */
    public Map<String, Object> listarPendencias() {
        String hoje = LocalDate.now().toString();
        String partesPrincipais = TipoParticipacao.partesPrincipais().stream()
                .map(t -> "'" + t.name() + "'")
                .collect(Collectors.joining(", ", "(", ")"));

        List<Map<String, Object>> semParte = Database.query("""
                        SELECT a.id, a.numero_processo, a.data_audiencia, a.horario_inicio,
                               a.status, v.nome AS vara_nome
                        FROM audiencia a
                        JOIN vara v ON v.id = a.vara_id
                        WHERE a.data_audiencia >= ? AND a.status IN %s
                          AND NOT EXISTS (SELECT 1 FROM participacao_audiencia pa
                                          WHERE pa.audiencia_id = a.id AND pa.tipo IN %s)
                        ORDER BY a.data_audiencia, a.horario_inicio
                        """.formatted(STATUS_ABERTOS, partesPrincipais),
                this::mapearAudiencia, hoje);

        List<Map<String, Object>> naoIntimadas = Database.query("""
                        SELECT pa.id, pa.tipo, pa.status_mandado, pa.folha_intimacao,
                               pe.nome AS pessoa_nome,
                               a.id AS audiencia_id, a.numero_processo, a.data_audiencia,
                               a.horario_inicio, v.nome AS vara_nome
                        FROM participacao_audiencia pa
                        JOIN audiencia a ON a.id = pa.audiencia_id
                        JOIN pessoa pe ON pe.id = pa.pessoa_id
                        JOIN vara v ON v.id = a.vara_id
                        WHERE a.data_audiencia >= ? AND a.status IN %s
                          AND pa.intimado = 0 AND pa.status_mandado != 'DISPENSADO'
                        ORDER BY a.data_audiencia, a.horario_inicio
                        """.formatted(STATUS_ABERTOS),
                this::mapearParticipacao, hoje);

        List<Map<String, Object>> mandados = Database.query("""
                        SELECT pa.id, pa.tipo, pa.status_mandado, pa.folha_intimacao,
                               pe.nome AS pessoa_nome,
                               a.id AS audiencia_id, a.numero_processo, a.data_audiencia,
                               a.horario_inicio, v.nome AS vara_nome
                        FROM participacao_audiencia pa
                        JOIN audiencia a ON a.id = pa.audiencia_id
                        JOIN pessoa pe ON pe.id = pa.pessoa_id
                        JOIN vara v ON v.id = a.vara_id
                        WHERE a.data_audiencia >= ? AND a.status IN %s
                          AND pa.status_mandado IN ('PENDENTE', 'NEGATIVO')
                          AND pa.intimado = 0
                        ORDER BY a.data_audiencia, a.horario_inicio
                        """.formatted(STATUS_ABERTOS),
                this::mapearParticipacao, hoje);

        // Audiências que já passaram e continuam com status Pendente: o
        // status precisa ser atualizado para Realizada ou Não Realizada.
        List<Map<String, Object>> vencidas = Database.query("""
                        SELECT a.id, a.numero_processo, a.data_audiencia, a.horario_inicio,
                               a.status, v.nome AS vara_nome
                        FROM audiencia a
                        JOIN vara v ON v.id = a.vara_id
                        WHERE a.data_audiencia < ? AND a.status = 'PENDENTE'
                        ORDER BY a.data_audiencia, a.horario_inicio
                        """,
                this::mapearAudiencia, hoje);

        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("audienciasSemParte", semParte);
        resposta.put("partesNaoIntimadas", naoIntimadas);
        resposta.put("mandadosComProblema", mandados);
        resposta.put("audienciasVencidas", vencidas);
        resposta.put("totais", Map.of(
                "audienciasSemParte", semParte.size(),
                "partesNaoIntimadas", naoIntimadas.size(),
                "mandadosComProblema", mandados.size(),
                "audienciasVencidas", vencidas.size(),
                "total", semParte.size() + naoIntimadas.size() + mandados.size() + vencidas.size()));
        return resposta;
    }

    /**
     * Converte uma linha de audiência pendente para o formato da API.
     *
     * @param rs result set posicionado na linha
     * @return audiência resumida
     * @throws SQLException se a leitura falhar
     */
    private Map<String, Object> mapearAudiencia(ResultSet rs) throws SQLException {
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("id", rs.getLong("id"));
        a.put("numeroProcesso", rs.getString("numero_processo"));
        a.put("dataAudiencia", rs.getString("data_audiencia"));
        a.put("horarioInicio", rs.getString("horario_inicio"));
        a.put("status", rs.getString("status"));
        a.put("varaNome", rs.getString("vara_nome"));
        return a;
    }

    /**
     * Converte uma linha de participação pendente para o formato da API.
     *
     * @param rs result set posicionado na linha
     * @return participação resumida com os dados da audiência
     * @throws SQLException se a leitura falhar
     */
    private Map<String, Object> mapearParticipacao(ResultSet rs) throws SQLException {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("id", rs.getLong("id"));
        p.put("tipo", rs.getString("tipo"));
        p.put("statusMandado", rs.getString("status_mandado"));
        p.put("folhaIntimacao", rs.getString("folha_intimacao"));
        p.put("pessoaNome", rs.getString("pessoa_nome"));
        p.put("audienciaId", rs.getLong("audiencia_id"));
        p.put("numeroProcesso", rs.getString("numero_processo"));
        p.put("dataAudiencia", rs.getString("data_audiencia"));
        p.put("horarioInicio", rs.getString("horario_inicio"));
        p.put("varaNome", rs.getString("vara_nome"));
        return p;
    }
}
