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
 * Testes da entidade Pauta: CRUD, herança rígida (audiência recebe data,
 * vara, juiz e promotor da pauta), propagação de alterações e exclusão em
 * cascata.
 */
class PautaServiceTest extends TesteBase {

    /** Serviço em teste. */
    private final PautaService pautas = new PautaService();

    /** Serviço de audiências, usado nos testes de herança. */
    private final AudienciaService audiencias = new AudienciaService();

    /** Ids do cenário criado antes de cada teste. */
    private long varaId;
    private long juizId;
    private long promotorId;

    /**
     * Cria vara, juiz e promotor para as pautas dos testes.
     */
    @BeforeEach
    void montarCenario() {
        varaId = criarVara("1ª VARA CRIMINAL");
        juizId = criarJuiz("DR. JUIZ");
        promotorId = criarPromotor("DR. PROMOTOR");
    }

    /** Monta o corpo mínimo válido de uma pauta. */
    private Map<String, Object> corpoPauta(String data) {
        return new java.util.LinkedHashMap<>(Map.of(
                "data", data,
                "varaId", varaId,
                "juizId", juizId,
                "promotorId", promotorId,
                "observacoes", "pauta do júri"));
    }

    /**
     * Criar deve gravar a pauta com observações em MAIÚSCULAS e devolver
     * vara/juiz/promotor aninhados.
     */
    @Test
    void criarDeveGravarEDevolverAninhados() {
        Map<String, Object> criada = pautas.criar(corpoPauta("2026-08-10"));
        assertEquals("2026-08-10", criada.get("data"));
        assertEquals("PAUTA DO JÚRI", criada.get("observacoes"));
        assertEquals("1ª VARA CRIMINAL", ((Map<?, ?>) criada.get("vara")).get("nome"));
        assertEquals("DR. JUIZ", ((Map<?, ?>) criada.get("juiz")).get("nome"));
        assertEquals("DR. PROMOTOR", ((Map<?, ?>) criada.get("promotor")).get("nome"));
        assertEquals(0, criada.get("totalAudiencias"));
    }

    /**
     * Vara, juiz, promotor e data são obrigatórios.
     */
    @Test
    void criarSemCamposObrigatoriosDeveFalhar() {
        ApiException erro = assertThrows(ApiException.class, () -> pautas.criar(Map.of()));
        assertEquals(400, erro.getStatus());
        assertTrue(erro.getErros().containsKey("data"));
        assertTrue(erro.getErros().containsKey("varaId"));
        assertTrue(erro.getErros().containsKey("juizId"));
        assertTrue(erro.getErros().containsKey("promotorId"));
    }

    /**
     * A audiência criada na pauta herda data, vara, juiz e promotor —
     * mesmo que o corpo tente enviar outros valores (vínculo rígido).
     */
    @Test
    void audienciaCriadaNaPautaDeveHerdarCabecalho() {
        long pautaId = ((Number) pautas.criar(corpoPauta("2026-08-10")).get("id")).longValue();
        long outraVara = criarVara("VARA INTRUSA");

        Map<String, Object> corpo = corpoAudiencia(outraVara, "2030-01-01", "14:00");
        Map<String, Object> audiencia = audiencias.criarNaPauta(pautaId, corpo);

        assertEquals("2026-08-10", audiencia.get("dataAudiencia"));
        assertEquals(varaId, ((Number) audiencia.get("varaId")).longValue());
        assertEquals(juizId, ((Number) audiencia.get("juizId")).longValue());
        assertEquals(promotorId, ((Number) audiencia.get("promotorId")).longValue());
        assertEquals(pautaId, ((Number) audiencia.get("pautaId")).longValue());
        assertEquals(1, pautas.buscarPorId(pautaId).get("totalAudiencias"));
    }

    /**
     * Editar uma audiência de pauta não pode desviá-la do cabeçalho:
     * data/vara/juiz/promotor continuam os da pauta.
     */
    @Test
    void atualizarAudienciaDePautaMantemVinculoRigido() {
        long pautaId = ((Number) pautas.criar(corpoPauta("2026-08-10")).get("id")).longValue();
        long audienciaId = ((Number) audiencias
                .criarNaPauta(pautaId, corpoAudiencia(varaId, "2026-08-10", "14:00")).get("id")).longValue();

        long outraVara = criarVara("VARA INTRUSA");
        Map<String, Object> corpo = corpoAudiencia(outraVara, "2031-12-25", "16:00");
        Map<String, Object> atualizada = audiencias.atualizar(audienciaId, corpo);

        assertEquals("16:00", atualizada.get("horarioInicio"));
        assertEquals("2026-08-10", atualizada.get("dataAudiencia"));
        assertEquals(varaId, ((Number) atualizada.get("varaId")).longValue());
    }

    /**
     * Alterar o cabeçalho da pauta deve propagar data, vara, juiz e
     * promotor para as audiências vinculadas (com dia da semana recalculado).
     */
    @Test
    void atualizarPautaDevePropagareParaAudiencias() {
        long pautaId = ((Number) pautas.criar(corpoPauta("2026-08-10")).get("id")).longValue();
        long audienciaId = ((Number) audiencias
                .criarNaPauta(pautaId, corpoAudiencia(varaId, "2026-08-10", "14:00")).get("id")).longValue();

        long novoJuiz = criarJuiz("DR. SUBSTITUTO");
        Map<String, Object> corpo = corpoPauta("2026-08-11"); // terça-feira
        corpo.put("juizId", novoJuiz);
        pautas.atualizar(pautaId, corpo);

        Map<String, Object> audiencia = audiencias.buscarPorId(audienciaId);
        assertEquals("2026-08-11", audiencia.get("dataAudiencia"));
        assertEquals("terça-feira", audiencia.get("diaSemana"));
        assertEquals(novoJuiz, ((Number) audiencia.get("juizId")).longValue());
    }

    /**
     * Excluir a pauta deve excluir as audiências dela em cascata.
     */
    @Test
    void excluirPautaDeveExcluirAudienciasEmCascata() {
        long pautaId = ((Number) pautas.criar(corpoPauta("2026-08-10")).get("id")).longValue();
        long audienciaId = ((Number) audiencias
                .criarNaPauta(pautaId, corpoAudiencia(varaId, "2026-08-10", "14:00")).get("id")).longValue();

        pautas.excluir(pautaId);
        assertThrows(ApiException.class, () -> audiencias.buscarPorId(audienciaId));
        assertThrows(ApiException.class, () -> pautas.buscarPorId(pautaId));
    }

    /**
     * Os filtros da listagem (período, vara e texto) devem restringir o resultado.
     */
    @Test
    void listarComFiltrosDeveRestringir() {
        pautas.criar(corpoPauta("2026-08-10"));
        Map<String, Object> outra = corpoPauta("2026-09-15");
        outra.put("observacoes", "mutirão");
        pautas.criar(outra);

        assertEquals(2, pautas.listar(null, null, null, null).size());
        assertEquals(1, pautas.listar("2026-09-01", "2026-09-30", null, null).size());
        assertEquals(2, pautas.listar(null, null, String.valueOf(varaId), null).size());
        assertEquals(1, pautas.listar(null, null, null, "mutirão").size());
        assertEquals(0, pautas.listar(null, null, null, "inexistente").size());
    }

    /**
     * Criar audiência em pauta inexistente deve devolver 404.
     */
    @Test
    void criarAudienciaEmPautaInexistenteDeveDar404() {
        ApiException erro = assertThrows(ApiException.class,
                () -> audiencias.criarNaPauta(999, corpoAudiencia(varaId, "2026-08-10", "10:00")));
        assertEquals(404, erro.getStatus());
    }
}
