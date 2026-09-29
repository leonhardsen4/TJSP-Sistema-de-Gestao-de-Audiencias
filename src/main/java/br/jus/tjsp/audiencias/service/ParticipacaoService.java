package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.config.Database;
import br.jus.tjsp.audiencias.model.enums.StatusMandado;
import br.jus.tjsp.audiencias.model.enums.TipoParticipacao;
import br.jus.tjsp.audiencias.model.enums.TipoRepresentacao;
import br.jus.tjsp.audiencias.web.ApiException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Gerencia os participantes de uma audiência (partes, testemunhas etc.)
 * e as representações por advogado de cada participante (uma parte pode
 * ter vários advogados).
 *
 * <p>Atende às rotas aninhadas {@code /audiencias/{id}/participantes}
 * usadas pelo formulário de audiências do frontend.</p>
 */
public class ParticipacaoService {

    /**
     * Lista os participantes de uma audiência, incluindo os dados da pessoa
     * e as representações por advogado (na ordem em que foram gravadas).
     *
     * @param audienciaId id da audiência
     * @return participantes no formato {@code {id, tipo, intimado, observacoes,
     *         pessoa{...}, representacoes[{tipo, advogado{id, nome, oab, telefone, email}}]}}
     */
    public List<Map<String, Object>> listar(long audienciaId) {
        List<Map<String, Object>> participantes = Database.query("""
                        SELECT pa.id, pa.tipo, pa.intimado, pa.status_mandado, pa.folha_intimacao,
                               pa.preso, pa.local_prisao, pa.observacoes,
                               pe.id AS pessoa_id, pe.nome AS pessoa_nome, pe.cpf AS pessoa_cpf
                        FROM participacao_audiencia pa
                        JOIN pessoa pe ON pe.id = pa.pessoa_id
                        WHERE pa.audiencia_id = ?
                        ORDER BY pa.id
                        """,
                this::mapear, audienciaId);

        // Representações da audiência agrupadas por cliente (pessoa).
        Map<Long, List<Map<String, Object>>> porCliente = new LinkedHashMap<>();
        List<Map.Entry<Long, Map<String, Object>>> linhas = Database.query("""
                        SELECT ra.cliente_id, ra.tipo, ad.id, ad.nome, ad.oab, ad.telefone, ad.email
                        FROM representacao_advogado ra
                        JOIN advogado ad ON ad.id = ra.advogado_id
                        WHERE ra.audiencia_id = ?
                        ORDER BY ra.id
                        """,
                rs -> {
                    Map<String, Object> advogado = new LinkedHashMap<>();
                    advogado.put("id", rs.getLong("id"));
                    advogado.put("nome", rs.getString("nome"));
                    advogado.put("oab", rs.getString("oab"));
                    advogado.put("telefone", rs.getString("telefone"));
                    advogado.put("email", rs.getString("email"));
                    Map<String, Object> representacao = new LinkedHashMap<>();
                    representacao.put("tipo", rs.getString("tipo"));
                    representacao.put("advogado", advogado);
                    return Map.entry(rs.getLong("cliente_id"), representacao);
                },
                audienciaId);
        for (Map.Entry<Long, Map<String, Object>> linha : linhas) {
            porCliente.computeIfAbsent(linha.getKey(), k -> new ArrayList<>()).add(linha.getValue());
        }

        for (Map<String, Object> p : participantes) {
            long pessoaId = ((Number) ((Map<?, ?>) p.get("pessoa")).get("id")).longValue();
            p.put("representacoes", porCliente.getOrDefault(pessoaId, List.of()));
        }
        return participantes;
    }

    /**
     * Adiciona um participante à audiência e registra as representações por
     * advogado informadas (tipo padrão {@code DEFESA}). Advogado repetido
     * na mesma parte é gravado uma única vez.
     *
     * @param audienciaId id da audiência
     * @param dados       corpo com {@code pessoaId}, {@code tipo}, {@code intimado},
     *                    {@code observacoes} e opcionalmente a lista {@code advogados}
     *                    ({@code [{advogadoId, tipoRepresentacao}]}); o formato antigo,
     *                    com um só {@code advogadoId}/{@code tipoRepresentacao}, continua aceito
     * @return participante criado, no mesmo formato de {@link #listar(long)}
     * @throws ApiException 400 se os dados forem inválidos ou a pessoa já
     *                      participar da audiência; 404 se audiência, pessoa ou
     *                      advogado não existirem
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
        if (Database.count("SELECT COUNT(*) FROM participacao_audiencia WHERE audiencia_id = ? AND pessoa_id = ?",
                audienciaId, pessoaId) > 0) {
            throw ApiException.validacao(Map.of("pessoaId", "Esta pessoa já é parte desta audiência"));
        }
        List<Map<String, Object>> representacoes = lerRepresentacoes(dados);

        boolean intimado = Boolean.parseBoolean(String.valueOf(dados.getOrDefault("intimado", "false")));
        String statusMandado = validarStatusMandado(dados.get("statusMandado"));
        Object folhaIntimacao = dados.get("folhaIntimacao");
        boolean preso = Boolean.parseBoolean(String.valueOf(dados.getOrDefault("preso", "false")));
        Object localPrisao = dados.get("localPrisao");
        Object observacoes = dados.get("observacoes");
        final String tipoFinal = tipo;
        final Long pessoaIdFinal = pessoaId;
        // Atômico: a participação, o recálculo do réu preso e a eventual
        // representação de advogado são gravados juntos (ou nada é gravado).
        long id = Database.executarEmTransacao(() -> {
            long novoId = Database.insert(
                    "INSERT INTO participacao_audiencia (audiencia_id, pessoa_id, tipo, intimado, "
                            + "status_mandado, folha_intimacao, preso, local_prisao, observacoes) "
                            + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    audienciaId, pessoaIdFinal, tipoFinal, intimado, statusMandado,
                    folhaIntimacao == null ? null : folhaIntimacao.toString(),
                    preso, !preso || localPrisao == null ? null : localPrisao.toString(),
                    observacoes == null ? null : observacoes.toString());
            atualizarReuPreso(audienciaId);

            Set<Long> gravados = new LinkedHashSet<>();
            for (Map<String, Object> representacao : representacoes) {
                Long advogadoId = lerId(representacao, "advogadoId");
                if (advogadoId == null || !gravados.add(advogadoId)) {
                    continue;
                }
                exigirExistencia("advogado", advogadoId);
                Database.insert(
                        "INSERT INTO representacao_advogado (audiencia_id, advogado_id, cliente_id, tipo) "
                                + "VALUES (?, ?, ?, ?)",
                        audienciaId, advogadoId, pessoaIdFinal,
                        validarTipoRepresentacao(representacao.get("tipoRepresentacao")));
            }
            return novoId;
        });

        return listar(audienciaId).stream()
                .filter(p -> ((Number) p.get("id")).longValue() == id)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Participante recém-criado não encontrado"));
    }

    /**
     * Extrai as representações do corpo da requisição: a lista
     * {@code advogados} ou, no formato antigo, o par
     * {@code advogadoId}/{@code tipoRepresentacao}.
     *
     * @param dados corpo da requisição
     * @return representações informadas (possivelmente vazia)
     * @throws ApiException 400 se {@code advogados} não for uma lista de objetos
     */
    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> lerRepresentacoes(Map<String, Object> dados) {
        Object lista = dados.get("advogados");
        if (lista instanceof List<?> itens) {
            List<Map<String, Object>> resultado = new ArrayList<>();
            for (Object item : itens) {
                if (!(item instanceof Map<?, ?>)) {
                    throw ApiException.validacao(Map.of("advogados", "Lista de advogados inválida"));
                }
                resultado.add((Map<String, Object>) item);
            }
            return resultado;
        }
        if (lista != null) {
            throw ApiException.validacao(Map.of("advogados", "Lista de advogados inválida"));
        }
        Map<String, Object> unica = new LinkedHashMap<>();
        unica.put("advogadoId", dados.get("advogadoId"));
        unica.put("tipoRepresentacao", dados.get("tipoRepresentacao"));
        return List.of(unica);
    }

    /**
     * Valida o tipo de representação; vazio vira {@code DEFESA}.
     *
     * @param valor valor recebido
     * @return nome do enum validado
     * @throws ApiException 400 se o valor não for um {@link TipoRepresentacao}
     */
    private static String validarTipoRepresentacao(Object valor) {
        if (valor == null || valor.toString().isBlank()) {
            return TipoRepresentacao.DEFESA.name();
        }
        try {
            return TipoRepresentacao.valueOf(valor.toString()).name();
        } catch (IllegalArgumentException e) {
            throw ApiException.validacao(
                    Map.of("tipoRepresentacao", "Tipo de representação inválido: " + valor));
        }
    }

    /**
     * Remove todos os participantes e representações de uma audiência.
     * Usado pelo frontend antes de regravar a lista completa.
     *
     * @param audienciaId id da audiência
     */
    public void removerTodos(long audienciaId) {
        Database.executarEmTransacao(() -> {
            Database.update("DELETE FROM representacao_advogado WHERE audiencia_id = ?", audienciaId);
            Database.update("DELETE FROM participacao_audiencia WHERE audiencia_id = ?", audienciaId);
            atualizarReuPreso(audienciaId);
        });
    }

    /**
     * Substitui, de forma atômica, toda a relação de partes de uma audiência:
     * remove as existentes e grava a lista informada dentro de uma única
     * transação. Se qualquer parte da lista for inválida, nada é alterado.
     *
     * @param audienciaId  id da audiência
     * @param participantes lista de partes a gravar (pode ser vazia)
     * @return a nova relação de partes da audiência
     * @throws ApiException 404 se a audiência não existir; 400 se algum dado for inválido
     */
    public List<Map<String, Object>> substituir(long audienciaId, List<Map<String, Object>> participantes) {
        exigirExistencia("audiencia", audienciaId);
        Database.executarEmTransacao(() -> {
            removerTodos(audienciaId);
            if (participantes != null) {
                for (Map<String, Object> parte : participantes) {
                    adicionar(audienciaId, parte);
                }
            }
        });
        return listar(audienciaId);
    }

    /**
     * Remove um participante específico e as representações de advogado
     * associadas a ele nesta audiência.
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
        Database.executarEmTransacao(() -> {
            Database.update("DELETE FROM representacao_advogado WHERE audiencia_id = ? AND cliente_id = ?",
                    audienciaId, pessoaId);
            Database.update("DELETE FROM participacao_audiencia WHERE id = ?", participanteId);
            atualizarReuPreso(audienciaId);
        });
    }

    /**
     * Recalcula o marcador "réu preso" (RP) da audiência: fica ligado
     * quando ao menos um participante está marcado como preso. Chamado
     * após qualquer alteração nos participantes.
     *
     * @param audienciaId id da audiência
     */
    private void atualizarReuPreso(long audienciaId) {
        Database.update("""
                        UPDATE audiencia SET reu_preso =
                            EXISTS (SELECT 1 FROM participacao_audiencia
                                    WHERE audiencia_id = ? AND preso = 1)
                        WHERE id = ?
                        """, audienciaId, audienciaId);
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
        p.put("statusMandado", rs.getString("status_mandado"));
        p.put("folhaIntimacao", rs.getString("folha_intimacao"));
        p.put("preso", rs.getInt("preso") != 0);
        p.put("localPrisao", rs.getString("local_prisao"));
        p.put("observacoes", rs.getString("observacoes"));

        Map<String, Object> pessoa = new LinkedHashMap<>();
        pessoa.put("id", rs.getLong("pessoa_id"));
        pessoa.put("nome", rs.getString("pessoa_nome"));
        pessoa.put("cpf", rs.getString("pessoa_cpf"));
        p.put("pessoa", pessoa);

        return p;
    }

    /**
     * Valida a situação do mandado recebida da API.
     *
     * @param valor valor recebido no campo {@code statusMandado}
     * @return nome do enum validado; {@code PENDENTE} se o campo vier vazio
     * @throws ApiException 400 se o valor não for um {@link StatusMandado}
     */
    static String validarStatusMandado(Object valor) {
        if (valor == null || valor.toString().isBlank()) {
            return StatusMandado.PENDENTE.name();
        }
        try {
            return StatusMandado.valueOf(valor.toString()).name();
        } catch (IllegalArgumentException e) {
            throw ApiException.validacao(Map.of("statusMandado", "Situação de mandado inválida: " + valor));
        }
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
