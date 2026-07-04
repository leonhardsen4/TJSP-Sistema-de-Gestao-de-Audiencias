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
 * Testes do controle de mandados de intimação: listagem consolidada com
 * filtros e atualização rápida da situação.
 */
class MandadoServiceTest extends TesteBase {

    /** Serviço em teste. */
    private final MandadoService mandados = new MandadoService();

    /** Serviços de apoio para montar o cenário. */
    private final AudienciaService audiencias = new AudienciaService();
    private final ParticipacaoService participacoes = new ParticipacaoService();

    /** Ids do cenário criado antes de cada teste. */
    private long varaId;
    private long audienciaId;
    private long participacaoId;

    /**
     * Cria vara, audiência e um participante réu não intimado.
     */
    @BeforeEach
    void montarCenario() {
        varaId = criarVara("1ª VARA CRIMINAL");
        audienciaId = ((Number) audiencias.criar(corpoAudiencia(varaId, "2027-03-10", "10:00")).get("id")).longValue();
        long pessoaId = criarPessoa("JOÃO RÉU");
        Map<String, Object> participante = participacoes.adicionar(audienciaId, Map.of(
                "pessoaId", pessoaId, "tipo", "REU", "folhaIntimacao", "fls. 123"));
        participacaoId = ((Number) participante.get("id")).longValue();
    }

    /**
     * A listagem sem filtros deve trazer o mandado com os dados da
     * audiência, da pessoa e da vara, com situação padrão PENDENTE.
     */
    @Test
    void listarDeveConsolidarDados() {
        List<Map<String, Object>> lista = mandados.listar(null, null, null, null, null, null);
        assertEquals(1, lista.size());
        Map<String, Object> mandado = lista.get(0);
        assertEquals("PENDENTE", mandado.get("statusMandado"));
        assertEquals("fls. 123", mandado.get("folhaIntimacao"));
        assertEquals("JOÃO RÉU", ((Map<?, ?>) mandado.get("pessoa")).get("nome"));
        assertEquals("1234567-89.2026.8.26.0001",
                ((Map<?, ?>) mandado.get("audiencia")).get("numeroProcesso"));
    }

    /**
     * Os filtros de vara, situação, intimação e texto devem restringir a lista.
     */
    @Test
    void filtrosDevemRestringirALista() {
        assertEquals(1, mandados.listar(String.valueOf(varaId), null, null, "PENDENTE", "false", "JOÃO").size());
        assertEquals(0, mandados.listar(null, null, null, "POSITIVO", null, null).size());
        assertEquals(0, mandados.listar(null, null, null, null, "true", null).size());
        assertEquals(0, mandados.listar(null, null, null, null, null, "INEXISTENTE").size());
        assertEquals(1, mandados.listar(null, "2027-03-01", "2027-03-31", null, null, null).size());
        assertEquals(0, mandados.listar(null, "2027-04-01", null, null, null, null).size());
    }

    /**
     * A atualização parcial deve alterar situação, intimação e folha,
     * preservando o restante.
     */
    @Test
    void atualizarDeveAlterarSomenteOsCamposEnviados() {
        Map<String, Object> atualizado = mandados.atualizar(participacaoId, Map.of(
                "statusMandado", "POSITIVO", "intimado", true));
        assertEquals("POSITIVO", atualizado.get("statusMandado"));
        assertEquals(Boolean.TRUE, atualizado.get("intimado"));
        assertEquals("fls. 123", atualizado.get("folhaIntimacao"));
    }

    /**
     * Situação de mandado desconhecida deve falhar com 400; id inexistente, com 404.
     */
    @Test
    void errosDevemSerSinalizados() {
        ApiException invalido = assertThrows(ApiException.class,
                () -> mandados.atualizar(participacaoId, Map.of("statusMandado", "XYZ")));
        assertEquals(400, invalido.getStatus());

        ApiException naoEncontrado = assertThrows(ApiException.class,
                () -> mandados.atualizar(9999, Map.of("statusMandado", "POSITIVO")));
        assertEquals(404, naoEncontrado.getStatus());
    }

    /**
     * O texto da busca deve encontrar também pelo número do processo.
     */
    @Test
    void buscaTextualDeveAcharPorProcesso() {
        assertTrue(mandados.listar(null, null, null, null, null, "1234567").size() > 0);
    }
}
