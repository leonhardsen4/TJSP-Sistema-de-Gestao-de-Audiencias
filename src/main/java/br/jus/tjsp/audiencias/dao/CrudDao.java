package br.jus.tjsp.audiencias.dao;

import br.jus.tjsp.audiencias.config.Database;
import br.jus.tjsp.audiencias.web.ApiException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * DAO genérico para as entidades simples do sistema (vara, juiz, promotor,
 * advogado e pessoa), cujas colunas são todas textuais e têm o mesmo nome
 * no banco e no JSON da API.
 *
 * <p>Substitui os antigos repositories Spring Data com JDBC puro,
 * trabalhando com {@link Map} para leitura e escrita.</p>
 */
public class CrudDao {

    /** Nome da tabela no banco. */
    private final String tabela;

    /** Colunas editáveis da tabela (sem o id). */
    private final List<String> colunas;

    /** Colunas de preenchimento obrigatório. */
    private final List<String> obrigatorias;

    /**
     * Cria um DAO para uma tabela.
     *
     * @param tabela       nome da tabela
     * @param colunas      colunas editáveis, na ordem
     * @param obrigatorias subconjunto de {@code colunas} que não pode ficar vazio
     */
    public CrudDao(String tabela, List<String> colunas, List<String> obrigatorias) {
        this.tabela = tabela;
        this.colunas = colunas;
        this.obrigatorias = obrigatorias;
    }

    /**
     * Lista todos os registros da tabela ordenados por nome.
     *
     * @return lista de registros como mapas {@code coluna → valor}
     */
    public List<Map<String, Object>> listar() {
        return Database.query("SELECT * FROM " + tabela + " ORDER BY nome", this::mapear);
    }

    /**
     * Busca um registro pelo id.
     *
     * @param id identificador do registro
     * @return registro encontrado
     * @throws ApiException 404 se o id não existir
     */
    public Map<String, Object> buscarPorId(long id) {
        return Database.queryOne("SELECT * FROM " + tabela + " WHERE id = ?", this::mapear, id)
                .orElseThrow(() -> ApiException.naoEncontrado(
                        "Registro não encontrado em " + tabela + " com id " + id));
    }

    /**
     * Busca registros cujo valor de uma coluna contenha o termo informado
     * (comparação sem diferenciar maiúsculas).
     *
     * @param coluna coluna a pesquisar (deve pertencer à tabela)
     * @param termo  trecho a procurar
     * @return registros que casam com o filtro
     */
    public List<Map<String, Object>> buscarPorColuna(String coluna, String termo) {
        if (!colunas.contains(coluna)) {
            throw ApiException.validacao(Map.of(coluna, "Campo de busca inválido"));
        }
        return Database.query(
                "SELECT * FROM " + tabela + " WHERE " + coluna + " LIKE ? ORDER BY nome",
                this::mapear, "%" + (termo == null ? "" : termo) + "%");
    }

    /**
     * Insere um novo registro.
     *
     * @param dados mapa {@code coluna → valor} vindo do corpo da requisição
     * @return registro completo recém-criado, incluindo o id gerado
     * @throws ApiException 400 se algum campo obrigatório estiver vazio
     */
    public Map<String, Object> criar(Map<String, Object> dados) {
        validar(dados);
        String marcadores = String.join(", ", colunas.stream().map(c -> "?").toList());
        String sql = "INSERT INTO " + tabela + " (" + String.join(", ", colunas) + ") VALUES (" + marcadores + ")";
        long id = Database.insert(sql, valores(dados));
        return buscarPorId(id);
    }

    /**
     * Atualiza um registro existente.
     *
     * @param id    identificador do registro
     * @param dados novos valores {@code coluna → valor}
     * @return registro completo já atualizado
     * @throws ApiException 404 se o id não existir; 400 se a validação falhar
     */
    public Map<String, Object> atualizar(long id, Map<String, Object> dados) {
        buscarPorId(id);
        validar(dados);
        String atribuicoes = String.join(", ", colunas.stream().map(c -> c + " = ?").toList());
        Object[] params = new Object[colunas.size() + 1];
        System.arraycopy(valores(dados), 0, params, 0, colunas.size());
        params[colunas.size()] = id;
        Database.update("UPDATE " + tabela + " SET " + atribuicoes + " WHERE id = ?", params);
        return buscarPorId(id);
    }

    /**
     * Exclui um registro.
     *
     * @param id identificador do registro
     * @throws ApiException 404 se o id não existir; 409 se o registro estiver
     *                      em uso por uma audiência (violação de chave estrangeira)
     */
    public void excluir(long id) {
        buscarPorId(id);
        try {
            Database.update("DELETE FROM " + tabela + " WHERE id = ?", id);
        } catch (IllegalStateException e) {
            throw ApiException.conflito(
                    "Não é possível excluir: o registro está vinculado a uma audiência.");
        }
    }

    /**
     * Conta os registros da tabela.
     *
     * @return total de registros
     */
    public long contar() {
        return Database.count("SELECT COUNT(*) FROM " + tabela);
    }

    /**
     * Converte uma linha do banco em mapa {@code coluna → valor}.
     *
     * @param rs result set posicionado na linha
     * @return mapa com id e demais colunas
     * @throws SQLException se a leitura falhar
     */
    private Map<String, Object> mapear(ResultSet rs) throws SQLException {
        Map<String, Object> linha = new LinkedHashMap<>();
        linha.put("id", rs.getLong("id"));
        for (String coluna : colunas) {
            linha.put(coluna, rs.getString(coluna));
        }
        return linha;
    }

    /**
     * Valida os campos obrigatórios do registro.
     *
     * @param dados valores recebidos
     * @throws ApiException 400 com o detalhe dos campos inválidos
     */
    private void validar(Map<String, Object> dados) {
        Map<String, String> erros = new LinkedHashMap<>();
        for (String campo : obrigatorias) {
            Object valor = dados == null ? null : dados.get(campo);
            if (valor == null || valor.toString().isBlank()) {
                erros.put(campo, "Campo obrigatório");
            }
        }
        if (!erros.isEmpty()) {
            throw ApiException.validacao(erros);
        }
    }

    /**
     * Extrai os valores das colunas editáveis na ordem esperada pelos SQLs.
     *
     * @param dados mapa recebido da API
     * @return vetor de valores alinhado com {@code colunas}
     */
    private Object[] valores(Map<String, Object> dados) {
        return colunas.stream()
                .map(c -> {
                    Object v = dados.get(c);
                    return v == null ? null : v.toString();
                })
                .toArray();
    }
}
