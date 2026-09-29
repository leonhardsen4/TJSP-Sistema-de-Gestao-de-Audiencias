package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.TesteBase;
import br.jus.tjsp.audiencias.web.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Testes dos participantes de audiência e das representações por advogado.
 */
class ParticipacaoServiceTest extends TesteBase {

    /** Serviço sob teste. */
    private final ParticipacaoService servico = new ParticipacaoService();

    /** Id da audiência criada para cada teste. */
    private long audienciaId;

    /** Id da pessoa participante criada para cada teste. */
    private long pessoaId;

    /**
     * Prepara uma audiência e uma pessoa para os testes.
     */
    @BeforeEach
    void prepararDados() {
        long varaId = criarVara("Vara");
        audienciaId = ((Number) new AudienciaService()
                .criar(corpoAudiencia(varaId, "2026-07-06", "10:00")).get("id")).longValue();
        pessoaId = criarPessoa("Carlos");
    }

    /**
     * Participante sem advogado deve ser criado com a lista
     * {@code representacoes} vazia.
     */
    @Test
    void adicionarSemAdvogadoDeveTerRepresentacoesVazias() {
        Map<String, Object> criado = servico.adicionar(audienciaId,
                Map.of("pessoaId", pessoaId, "tipo", "TESTEMUNHA_DEFESA", "intimado", true));
        assertEquals("TESTEMUNHA_DEFESA", criado.get("tipo"));
        assertEquals(true, criado.get("intimado"));
        assertEquals("Carlos", ((Map<?, ?>) criado.get("pessoa")).get("nome"));
        assertTrue(((List<?>) criado.get("representacoes")).isEmpty());
    }

    /**
     * Quando um advogado é informado, a representação deve ser criada e
     * devolvida aninhada, com o tipo informado.
     */
    @Test
    void adicionarComAdvogadoDeveCriarRepresentacao() {
        long advogadoId = criarAdvogado("Ana");
        Map<String, Object> criado = servico.adicionar(audienciaId, Map.of(
                "pessoaId", pessoaId, "tipo", "REU",
                "advogadoId", advogadoId, "tipoRepresentacao", "CONSTITUIDO"));
        Map<?, ?> representacao = primeiraRepresentacao(criado);
        assertEquals("CONSTITUIDO", representacao.get("tipo"));
        assertEquals("Ana", ((Map<?, ?>) representacao.get("advogado")).get("nome"));
    }

    /**
     * Sem tipo de representação explícito, o padrão é {@code DEFESA}.
     */
    @Test
    void tipoDeRepresentacaoPadraoDeveSerDefesa() {
        long advogadoId = criarAdvogado("Ana");
        Map<String, Object> criado = servico.adicionar(audienciaId,
                Map.of("pessoaId", pessoaId, "tipo", "REU", "advogadoId", advogadoId));
        assertEquals("DEFESA", primeiraRepresentacao(criado).get("tipo"));
    }

    /**
     * Uma parte pode ter vários advogados (lista {@code advogados}), cada um
     * com seu tipo de representação e com telefone/e-mail na resposta; o
     * mesmo advogado repetido é gravado uma só vez.
     */
    @Test
    void adicionarComVariosAdvogadosDeveGravarTodos() {
        long ana = criarAdvogado("Ana");
        long bruno = criarAdvogado("Bruno");
        Map<String, Object> criado = servico.adicionar(audienciaId, Map.of(
                "pessoaId", pessoaId, "tipo", "REU",
                "advogados", List.of(
                        Map.of("advogadoId", ana, "tipoRepresentacao", "CONSTITUIDO"),
                        Map.of("advogadoId", bruno, "tipoRepresentacao", "DATIVO"),
                        Map.of("advogadoId", ana))));
        List<?> representacoes = (List<?>) criado.get("representacoes");
        assertEquals(2, representacoes.size());
        Map<?, ?> segunda = (Map<?, ?>) representacoes.get(1);
        assertEquals("DATIVO", segunda.get("tipo"));
        Map<?, ?> advogado = (Map<?, ?>) segunda.get("advogado");
        assertEquals("Bruno", advogado.get("nome"));
        assertTrue(advogado.containsKey("telefone"));
        assertTrue(advogado.containsKey("email"));
        // A listagem não deve duplicar a parte por ter vários advogados.
        assertEquals(1, servico.listar(audienciaId).size());
    }

    /**
     * A mesma pessoa não pode ser incluída duas vezes na mesma audiência.
     */
    @Test
    void pessoaRepetidaNaMesmaAudienciaDeveFalhar() {
        servico.adicionar(audienciaId, Map.of("pessoaId", pessoaId, "tipo", "REU"));
        ApiException erro = assertThrows(ApiException.class,
                () -> servico.adicionar(audienciaId, Map.of("pessoaId", pessoaId, "tipo", "VITIMA")));
        assertEquals(400, erro.getStatus());
    }

    /**
     * A substituição atômica deve aceitar a lista com vários advogados e,
     * se houver pessoa repetida, não alterar nada.
     */
    @Test
    void substituirComPessoaRepetidaNaoDeveAlterarNada() {
        servico.adicionar(audienciaId, Map.of("pessoaId", pessoaId, "tipo", "REU"));
        long outra = criarPessoa("Beatriz");
        assertThrows(ApiException.class, () -> servico.substituir(audienciaId, List.of(
                Map.of("pessoaId", outra, "tipo", "VITIMA"),
                Map.of("pessoaId", outra, "tipo", "TESTEMUNHA_DEFESA"))));
        List<Map<String, Object>> partes = servico.listar(audienciaId);
        assertEquals(1, partes.size());
        assertEquals("Carlos", ((Map<?, ?>) partes.get(0).get("pessoa")).get("nome"));
    }

    /**
     * Devolve a primeira representação de um participante.
     *
     * @param participante participante no formato da API
     * @return primeira representação da lista
     */
    private static Map<?, ?> primeiraRepresentacao(Map<String, Object> participante) {
        return (Map<?, ?>) ((List<?>) participante.get("representacoes")).get(0);
    }

    /**
     * A situação "ofício de requisição" deve ser aceita e gravada.
     */
    @Test
    void oficioDeRequisicaoDeveSerAceito() {
        Map<String, Object> criado = servico.adicionar(audienciaId, Map.of(
                "pessoaId", pessoaId, "tipo", "TESTEMUNHA_DEFESA", "statusMandado", "OFICIO_REQUISICAO"));
        assertEquals("OFICIO_REQUISICAO", criado.get("statusMandado"));
    }

    /**
     * Tipo de participação desconhecido deve ser rejeitado.
     */
    @Test
    void tipoInvalidoDeveFalhar() {
        ApiException erro = assertThrows(ApiException.class,
                () -> servico.adicionar(audienciaId, Map.of("pessoaId", pessoaId, "tipo", "ALIENIGENA")));
        assertEquals(400, erro.getStatus());
    }

    /**
     * Audiência inexistente deve dar 404.
     */
    @Test
    void audienciaInexistenteDeveDar404() {
        ApiException erro = assertThrows(ApiException.class,
                () -> servico.adicionar(999, Map.of("pessoaId", pessoaId, "tipo", "REU")));
        assertEquals(404, erro.getStatus());
    }

    /**
     * Remover todos deve limpar participações e representações da audiência.
     */
    @Test
    void removerTodosDeveLimparTudo() {
        long advogadoId = criarAdvogado("Ana");
        servico.adicionar(audienciaId,
                Map.of("pessoaId", pessoaId, "tipo", "REU", "advogadoId", advogadoId));
        servico.removerTodos(audienciaId);
        assertTrue(servico.listar(audienciaId).isEmpty());
    }

    /**
     * Remover um participante específico deve levar junto a representação
     * dele e manter os demais.
     */
    @Test
    void removerUmDeveManterOsDemais() {
        long advogadoId = criarAdvogado("Ana");
        long outraPessoa = criarPessoa("Beatriz");
        Map<String, Object> primeiro = servico.adicionar(audienciaId,
                Map.of("pessoaId", pessoaId, "tipo", "REU", "advogadoId", advogadoId));
        servico.adicionar(audienciaId, Map.of("pessoaId", outraPessoa, "tipo", "VITIMA"));

        servico.remover(audienciaId, ((Number) primeiro.get("id")).longValue());

        List<Map<String, Object>> restantes = servico.listar(audienciaId);
        assertEquals(1, restantes.size());
        assertEquals("Beatriz", ((Map<?, ?>) restantes.get(0).get("pessoa")).get("nome"));
    }
}
