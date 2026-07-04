package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.config.Database;
import br.jus.tjsp.audiencias.util.Textos;
import br.jus.tjsp.audiencias.web.ApiException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Regras de negócio das pautas de audiências.
 *
 * <p>A pauta representa o dia de trabalho de uma vara: reúne as audiências
 * de uma data, com um mesmo juiz e um mesmo promotor — como se trabalha no
 * fórum. O vínculo é rígido: toda audiência pertence a exatamente uma
 * pauta e herda dela a data, a vara, o juiz e o promotor (exceções são
 * anotadas no campo de observações da pauta). Alterações no cabeçalho da
 * pauta são propagadas automaticamente às suas audiências.</p>
 */
public class PautaService {

    /** Locale brasileiro para o nome do dia da semana. */
    private static final Locale PT_BR = Locale.forLanguageTag("pt-BR");

    /** Consulta base com os nomes de vara/juiz/promotor e o total de audiências. */
    private static final String SELECT_BASE = """
            SELECT p.*, v.nome AS vara_nome, v.cor AS vara_cor,
                   j.nome AS juiz_nome, pr.nome AS promotor_nome,
                   (SELECT COUNT(*) FROM audiencia a WHERE a.pauta_id = p.id) AS total_audiencias
            FROM pauta p
            JOIN vara v ON v.id = p.vara_id
            JOIN juiz j ON j.id = p.juiz_id
            JOIN promotor pr ON pr.id = p.promotor_id
            """;

    /**
     * Lista as pautas aplicando os filtros informados (todos opcionais).
     *
     * @param dataInicio primeira data do período ({@code yyyy-MM-dd} ou {@code dd/MM/yyyy})
     * @param dataFim    última data do período
     * @param varaId     vara da pauta
     * @param texto      trecho do nome da vara, do juiz, do promotor ou das observações
     * @return pautas ordenadas por data e vara
     */
    public List<Map<String, Object>> listar(String dataInicio, String dataFim, String varaId, String texto) {
        StringBuilder sql = new StringBuilder(SELECT_BASE).append(" WHERE 1=1");
        List<Object> params = new ArrayList<>();

        if (naoVazio(dataInicio)) {
            sql.append(" AND p.data >= ?");
            params.add(AudienciaService.parseData(dataInicio).toString());
        }
        if (naoVazio(dataFim)) {
            sql.append(" AND p.data <= ?");
            params.add(AudienciaService.parseData(dataFim).toString());
        }
        if (naoVazio(varaId)) {
            sql.append(" AND p.vara_id = ?");
            params.add(Long.parseLong(varaId));
        }
        if (naoVazio(texto)) {
            // O UPPER() do SQLite só cobre ASCII; a conversão do termo é
            // feita no Java para que acentos também casem (ex.: "mutirão").
            sql.append(" AND (UPPER(v.nome) LIKE ? OR UPPER(j.nome) LIKE ?"
                    + " OR UPPER(pr.nome) LIKE ? OR UPPER(COALESCE(p.observacoes, '')) LIKE ?)");
            String termo = "%" + Textos.maiusculas(texto) + "%";
            params.add(termo);
            params.add(termo);
            params.add(termo);
            params.add(termo);
        }
        sql.append(" ORDER BY p.data, v.nome");
        return Database.query(sql.toString(), this::mapear, params.toArray());
    }

    /**
     * Busca uma pauta pelo id.
     *
     * @param id identificador da pauta
     * @return pauta com vara/juiz/promotor aninhados e total de audiências
     * @throws ApiException 404 se não existir
     */
    public Map<String, Object> buscarPorId(long id) {
        return Database.queryOne(SELECT_BASE + " WHERE p.id = ?", this::mapear, id)
                .orElseThrow(() -> ApiException.naoEncontrado("Pauta não encontrada com id " + id));
    }

    /**
     * Cria uma pauta.
     *
     * @param dados corpo com {@code data}, {@code varaId}, {@code juizId},
     *              {@code promotorId} e {@code observacoes} (opcional)
     * @return pauta criada, no formato de resposta da API
     * @throws ApiException 400 se a validação falhar
     */
    public Map<String, Object> criar(Map<String, Object> dados) {
        Valores v = validar(dados);
        String agora = LocalDateTime.now().toString();
        long id = Database.insert("""
                        INSERT INTO pauta (data, vara_id, juiz_id, promotor_id, observacoes, criacao, atualizacao)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                v.data.toString(), v.varaId, v.juizId, v.promotorId, v.observacoes, agora, agora);
        return buscarPorId(id);
    }

    /**
     * Atualiza o cabeçalho da pauta e propaga data, vara, juiz e promotor
     * para todas as audiências vinculadas (vínculo rígido).
     *
     * @param id    identificador da pauta
     * @param dados novos valores
     * @return pauta atualizada
     * @throws ApiException 404 se não existir; 400 se a validação falhar
     */
    public Map<String, Object> atualizar(long id, Map<String, Object> dados) {
        buscarPorId(id);
        Valores v = validar(dados);
        String diaSemana = v.data.getDayOfWeek().getDisplayName(TextStyle.FULL, PT_BR);
        // Atômico: o cabeçalho da pauta e a propagação para as audiências
        // acontecem juntos, ou nenhum dos dois.
        Database.executarEmTransacao(() -> {
            Database.update("""
                            UPDATE pauta SET data = ?, vara_id = ?, juiz_id = ?, promotor_id = ?,
                                observacoes = ?, atualizacao = ?
                            WHERE id = ?
                            """,
                    v.data.toString(), v.varaId, v.juizId, v.promotorId, v.observacoes,
                    LocalDateTime.now().toString(), id);

            // Propagação rígida: as audiências da pauta acompanham o cabeçalho.
            Database.update("""
                            UPDATE audiencia SET data_audiencia = ?, dia_semana = ?, vara_id = ?,
                                juiz_id = ?, promotor_id = ?, atualizacao = ?
                            WHERE pauta_id = ?
                            """,
                    v.data.toString(), diaSemana, v.varaId, v.juizId, v.promotorId,
                    LocalDateTime.now().toString(), id);
        });
        return buscarPorId(id);
    }

    /**
     * Exclui uma pauta e, por cascata, todas as suas audiências (com
     * participações e representações).
     *
     * @param id identificador da pauta
     * @throws ApiException 404 se não existir
     */
    public void excluir(long id) {
        buscarPorId(id);
        Database.update("DELETE FROM pauta WHERE id = ?", id);
    }

    /**
     * Converte uma linha do banco no formato JSON da API.
     *
     * @param rs result set posicionado na linha
     * @return pauta como mapa pronto para serialização
     * @throws SQLException se a leitura falhar
     */
    private Map<String, Object> mapear(ResultSet rs) throws SQLException {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("id", rs.getLong("id"));
        p.put("data", rs.getString("data"));
        p.put("observacoes", rs.getString("observacoes"));
        p.put("totalAudiencias", rs.getInt("total_audiencias"));
        Map<String, Object> vara = new LinkedHashMap<>();
        vara.put("id", rs.getLong("vara_id"));
        vara.put("nome", rs.getString("vara_nome"));
        vara.put("cor", rs.getString("vara_cor"));
        p.put("vara", vara);
        p.put("juiz", Map.of("id", rs.getLong("juiz_id"), "nome", rs.getString("juiz_nome")));
        p.put("promotor", Map.of("id", rs.getLong("promotor_id"), "nome", rs.getString("promotor_nome")));
        return p;
    }

    /** Valores já validados de uma pauta, prontos para persistência. */
    private static final class Valores {
        LocalDate data;
        long varaId;
        long juizId;
        long promotorId;
        String observacoes;
    }

    /**
     * Valida os campos da pauta: data, vara, juiz e promotor obrigatórios
     * e existentes; observações normalizadas em maiúsculas.
     *
     * @param dados corpo da requisição
     * @return valores convertidos e prontos para gravação
     * @throws ApiException 400 com o mapa de erros por campo
     */
    private Valores validar(Map<String, Object> dados) {
        Map<String, String> erros = new LinkedHashMap<>();
        Valores v = new Valores();

        Object dataTexto = dados == null ? null : dados.get("data");
        if (dataTexto == null || dataTexto.toString().isBlank()) {
            erros.put("data", "Data da pauta é obrigatória");
        } else {
            try {
                v.data = AudienciaService.parseData(dataTexto.toString());
            } catch (ApiException e) {
                erros.put("data", "Data inválida: " + dataTexto);
            }
        }

        v.varaId = exigirReferencia(dados, "varaId", "vara", "Vara", erros);
        v.juizId = exigirReferencia(dados, "juizId", "juiz", "Juiz", erros);
        v.promotorId = exigirReferencia(dados, "promotorId", "promotor", "Promotor", erros);

        if (!erros.isEmpty()) {
            throw ApiException.validacao(erros);
        }

        Object observacoes = dados.get("observacoes");
        v.observacoes = observacoes == null ? null : Textos.maiusculas(observacoes.toString());
        return v;
    }

    /**
     * Lê um id obrigatório e confere se o registro existe na tabela.
     *
     * @param dados  corpo da requisição
     * @param campo  nome do campo no JSON (ex.: {@code varaId})
     * @param tabela tabela do banco (ex.: {@code vara})
     * @param rotulo nome exibido na mensagem de erro
     * @param erros  mapa de erros a alimentar
     * @return id lido, ou {@code 0} se inválido (o erro já terá sido registrado)
     */
    private static long exigirReferencia(Map<String, Object> dados, String campo, String tabela,
                                         String rotulo, Map<String, String> erros) {
        Object valor = dados == null ? null : dados.get(campo);
        if (valor == null || valor.toString().isBlank() || "0".equals(valor.toString())) {
            erros.put(campo, rotulo + " é obrigatório(a)");
            return 0;
        }
        try {
            long id = Long.parseLong(valor.toString());
            if (Database.count("SELECT COUNT(*) FROM " + tabela + " WHERE id = ?", id) == 0) {
                erros.put(campo, rotulo + " não encontrado(a) com id " + id);
                return 0;
            }
            return id;
        } catch (NumberFormatException e) {
            erros.put(campo, "Valor inválido");
            return 0;
        }
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
