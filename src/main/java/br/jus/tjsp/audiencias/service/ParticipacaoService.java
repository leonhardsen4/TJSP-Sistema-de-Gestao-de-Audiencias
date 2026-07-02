package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.config.Database;
import br.jus.tjsp.audiencias.model.enums.TipoParticipacao;
import br.jus.tjsp.audiencias.model.enums.TipoRepresentacao;
import br.jus.tjsp.audiencias.web.ApiException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Gerencia os participantes de uma audiência (partes, testemunhas etc.)
 * e a representação por advogado associada a cada participante.
 *
 * <p>Atende às rotas aninhadas {@code /audiencias/{id}/participantes}
 * usadas pelo formulário de audiências do frontend.</p>
 */
public class ParticipacaoService {

    /**
     * Lista os participantes de uma audiência, incluindo os dados da pessoa
     * e, quando houver, a representação de advogado correspondente.
     *
     * @param audienciaId id da audiência
     * @return participantes no formato {@code {id, tipo, intimado, observacoes,
     *         pessoa{...}, representacao{tipo, advogado{...}}}}
     */
    public List<Map<String, Object>> listar(long audienciaId) {
        return Database.query("""
                        SELECT pa.id, pa.tipo, pa.intimado, pa.observacoes,
                               pe.id AS pessoa_id, pe.nome AS pessoa_nome, pe.cpf AS pessoa_cpf,
                               ra.tipo AS repr_tipo,
                               ad.id AS adv_id, ad.nome AS adv_nome, ad.oab AS adv_oab
                        FROM participacao_audiencia pa
                        JOIN pessoa pe ON pe.id = pa.pessoa_id
                        LEFT JOIN representacao_advogado ra
                               ON ra.audiencia_id = pa.audiencia_id AND ra.cliente_id = pa.pessoa_id
                        LEFT JOIN advogado ad ON ad.id = ra.advogado_id
                        WHERE pa.audiencia_id = ?
                        ORDER BY pa.id
                        """,
                this::mapear, audienciaId);
    }

    /**
     * Adiciona um participante à audiência e, se um advogado for informado,
     * registra também a representação (tipo padrão {@code DEFESA}).
     *
     * @param audienciaId id da audiência
     * @param dados       corpo com {@code pessoaId}, {@code tipo}, {@code intimado},
     *                    {@code observacoes} e opcionalmente {@code advogadoId} e
     *                    {@code tipoRepresentacao}
     * @return participante criado, no mesmo formato de {@link #listar(long)}
     * @throws ApiException 400 se os dados forem inválidos; 404 se audiência,
     *                      pessoa ou advogado não existirem
     */
    public Map<String, Object> adicionar(long audienciaId, Map<String, Object> dados) {
        exigirExistencia("audiencia", audienciaId);

        Map<String, String> erros = new LinkedHashMap<>();
        Long pessoaId = lerId(dados, "pessoaId");
        if (pessoaId == null) {
            erros.put("pessoaId", "Pessoa é obrigatória");
        }
        String tipo = null;
        Object tipoValor = dados == null ? null : dados.get("tipo");
        if (tipoValor == null) {
            erros.put("tipo", "Tipo de participação é obrigatório");
        } else {
            try {
                tipo = TipoParticipacao.valueOf(tipoValor.toString()).name();
            } catch (IllegalArgumentException e) {
                erros.put("tipo", "Tipo de participação inválido: " + tipoValor);
            }
        }
        if (!erros.isEmpty()) {
            throw ApiException.validacao(erros);
        }
        exigirExistencia("pessoa", pessoaId);

        boolean intimado = Boolean.parseBoolean(String.valueOf(dados.getOrDefault("intimado", "false")));
        Object observacoes = dados.get("observacoes");
        long id = Database.insert(
                "INSERT INTO participacao_audiencia (audiencia_id, pessoa_id, tipo, intimado, observacoes) "
                        + "VALUES (?, ?, ?, ?, ?)",
                audienciaId, pessoaId, tipo, intimado, observacoes == null ? null : observacoes.toString());

        Long advogadoId = lerId(dados, "advogadoId");
        if (advogadoId != null) {
            exigirExistencia("advogado", advogadoId);
            String tipoRepresentacao = TipoRepresentacao.DEFESA.name();
            Object tipoReprValor = dados.get("tipoRepresentacao");
            if (tipoReprValor != null && !tipoReprValor.toString().isBlank()) {
                try {
                    tipoRepresentacao = TipoRepresentacao.valueOf(tipoReprValor.toString()).name();
                } catch (IllegalArgumentException e) {
                    throw ApiException.validacao(
                            Map.of("tipoRepresentacao", "Tipo de representação inválido: " + tipoReprValor));
                }
            }
            Database.insert(
                    "INSERT INTO representacao_advogado (audiencia_id, advogado_id, cliente_id, tipo) "
                            + "VALUES (?, ?, ?, ?)",
                    audienciaId, advogadoId, pessoaId, tipoRepresentacao);
        }

        return listar(audienciaId).stream()
                .filter(p -> ((Number) p.get("id")).longValue() == id)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Participante recém-criado não encontrado"));
    }

    /**
     * Remove todos os participantes e representações de uma audiência.
     * Usado pelo frontend antes de regravar a lista completa.
     *
     * @param audienciaId id da audiência
     */
    public void removerTodos(long audienciaId) {
        Database.update("DELETE FROM representacao_advogado WHERE audiencia_id = ?", audienciaId);
        Database.update("DELETE FROM participacao_audiencia WHERE audiencia_id = ?", audienciaId);
    }

    /**
     * Remove um participante específico e a representação de advogado
     * associada a ele nesta audiência.
     *
     * @param audienciaId    id da audiência
     * @param participanteId id da participação a remover
     * @throws ApiException 404 se a participação não existir
     */
    public void remover(long audienciaId, long participanteId) {
        Long pessoaId = Database.queryOne(
                        "SELECT pessoa_id FROM participacao_audiencia WHERE id = ? AND audiencia_id = ?",
                        rs -> rs.getLong(1), participanteId, audienciaId)
                .orElseThrow(() -> ApiException.naoEncontrado(
                        "Participante não encontrado com id " + participanteId));
        Database.update("DELETE FROM representacao_advogado WHERE audiencia_id = ? AND cliente_id = ?",
                audienciaId, pessoaId);
        Database.update("DELETE FROM participacao_audiencia WHERE id = ?", participanteId);
    }

    /**
     * Converte uma linha da consulta de participantes no formato JSON
     * esperado pelo frontend.
     *
     * @param rs result set posicionado na linha
     * @return participante como mapa pronto para serialização
     * @throws SQLException se a leitura falhar
     */
    private Map<String, Object> mapear(ResultSet rs) throws SQLException {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("id", rs.getLong("id"));
        p.put("tipo", rs.getString("tipo"));
        p.put("intimado", rs.getInt("intimado") != 0);
        p.put("observacoes", rs.getString("observacoes"));

        Map<String, Object> pessoa = new LinkedHashMap<>();
        pessoa.put("id", rs.getLong("pessoa_id"));
        pessoa.put("nome", rs.getString("pessoa_nome"));
        pessoa.put("cpf", rs.getString("pessoa_cpf"));
        p.put("pessoa", pessoa);

        long advId = rs.getLong("adv_id");
        if (!rs.wasNull()) {
            Map<String, Object> advogado = new LinkedHashMap<>();
            advogado.put("id", advId);
            advogado.put("nome", rs.getString("adv_nome"));
            advogado.put("oab", rs.getString("adv_oab"));
            Map<String, Object> representacao = new LinkedHashMap<>();
            representacao.put("tipo", rs.getString("repr_tipo"));
            representacao.put("advogado", advogado);
            p.put("representacao", representacao);
        } else {
            p.put("representacao", null);
        }
        return p;
    }

    /**
     * Garante que um registro exista em uma tabela, lançando 404 caso contrário.
     *
     * @param tabela nome da tabela
     * @param id     identificador esperado
     * @throws ApiException 404 se o registro não existir
     */
    private void exigirExistencia(String tabela, long id) {
        if (Database.count("SELECT COUNT(*) FROM " + tabela + " WHERE id = ?", id) == 0) {
            throw ApiException.naoEncontrado(
                    "Registro não encontrado em " + tabela + " com id " + id);
        }
    }

    /**
     * Lê um id numérico do corpo da requisição.
     *
     * @param dados corpo da requisição
     * @param campo nome do campo
     * @return id lido, ou {@code null} se ausente ou não numérico
     */
    private static Long lerId(Map<String, Object> dados, String campo) {
        Object valor = dados == null ? null : dados.get(campo);
        if (valor == null || valor.toString().isBlank()) {
            return null;
        }
        try {
            long id = Long.parseLong(valor.toString());
            return id == 0 ? null : id;
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
