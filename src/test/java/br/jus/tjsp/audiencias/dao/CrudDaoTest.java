package br.jus.tjsp.audiencias.dao;

import br.jus.tjsp.audiencias.TesteBase;
import br.jus.tjsp.audiencias.web.ApiException;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Testes do DAO genérico usando a tabela de varas como representante
 * das entidades simples.
 */
class CrudDaoTest extends TesteBase {

    /** DAO de varas idêntico ao usado nas rotas. */
    private final CrudDao varas = new CrudDao("vara",
            List.of("nome", "comarca", "endereco", "telefone", "email", "observacoes"), List.of("nome"));

    /**
     * Criar deve gerar id e devolver o registro completo.
     */
    @Test
    void criarDeveGerarIdEDevolverRegistro() {
        Map<String, Object> criada = varas.criar(Map.of("nome", "1ª Vara", "comarca", "São Paulo"));
        assertEquals(1L, criada.get("id"));
        assertEquals("1ª Vara", criada.get("nome"));
        assertEquals("São Paulo", criada.get("comarca"));
        assertNull(criada.get("telefone"));
    }

    /**
     * Criar sem o campo obrigatório deve falhar com erro 400 detalhado.
     */
    @Test
    void criarSemNomeDeveFalharComValidacao() {
        ApiException erro = assertThrows(ApiException.class, () -> varas.criar(Map.of("comarca", "X")));
        assertEquals(400, erro.getStatus());
        assertEquals("Campo obrigatório", erro.getErros().get("nome"));
    }

    /**
     * Listar deve devolver os registros ordenados por nome.
     */
    @Test
    void listarDeveOrdenarPorNome() {
        varas.criar(Map.of("nome", "Vara B"));
        varas.criar(Map.of("nome", "Vara A"));
        List<Map<String, Object>> lista = varas.listar();
        assertEquals(2, lista.size());
        assertEquals("Vara A", lista.get(0).get("nome"));
    }

    /**
     * Atualizar deve substituir os valores e manter o id.
     */
    @Test
    void atualizarDeveSubstituirValores() {
        long id = (long) varas.criar(Map.of("nome", "Antiga")).get("id");
        Map<String, Object> atualizada = varas.atualizar(id, Map.of("nome", "Nova", "email", "n@tjsp.jus.br"));
        assertEquals("Nova", atualizada.get("nome"));
        assertEquals("n@tjsp.jus.br", atualizada.get("email"));
        assertEquals(id, atualizada.get("id"));
    }

    /**
     * Buscar por id inexistente deve devolver 404.
     */
    @Test
    void buscarInexistenteDeveDar404() {
        ApiException erro = assertThrows(ApiException.class, () -> varas.buscarPorId(99));
        assertEquals(404, erro.getStatus());
    }

    /**
     * Excluir deve remover o registro.
     */
    @Test
    void excluirDeveRemoverRegistro() {
        long id = (long) varas.criar(Map.of("nome", "Descartável")).get("id");
        varas.excluir(id);
        assertTrue(varas.listar().isEmpty());
    }

    /**
     * A busca por coluna deve ser parcial e sem diferenciar maiúsculas.
     */
    @Test
    void buscaPorColunaDeveSerParcial() {
        varas.criar(Map.of("nome", "Vara Criminal Central"));
        varas.criar(Map.of("nome", "Vara Cível"));
        assertEquals(1, varas.buscarPorColuna("nome", "criminal").size());
    }

    /**
     * Campos que não pertencem à tabela não podem ser usados na busca.
     */
    @Test
    void buscaPorColunaInvalidaDeveFalhar() {
        HashMap<String, Object> dados = new HashMap<>();
        assertThrows(ApiException.class, () -> varas.buscarPorColuna("senha", "x"));
    }
}
