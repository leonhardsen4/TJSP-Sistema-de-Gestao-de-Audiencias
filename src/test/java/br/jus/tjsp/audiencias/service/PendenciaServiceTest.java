package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.TesteBase;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Testes do levantamento de pendências das audiências futuras.
 */
class PendenciaServiceTest extends TesteBase {

    /** Serviço em teste. */
    private final PendenciaService pendencias = new PendenciaService();

    /** Serviços de apoio para montar os cenários. */
    private final AudienciaService audiencias = new AudienciaService();
    private final ParticipacaoService participacoes = new ParticipacaoService();

    /**
     * Audiência futura sem réu/indiciado/averiguado/autor do fato deve
     * aparecer como pendência de parte principal.
     */
    @Test
    void audienciaSemPartePrincipalDeveGerarPendencia() {
        long varaId = criarVara("VARA");
        String dataFutura = LocalDate.now().plusDays(10).toString();
        audiencias.criar(corpoAudiencia(varaId, dataFutura, "10:00"));

        Map<String, Object> resultado = pendencias.listarPendencias();
        assertEquals(1, ((List<?>) resultado.get("audienciasSemParte")).size());
    }

    /**
     * A pendência de parte principal desaparece quando um réu é cadastrado,
     * mas o réu não intimado com mandado pendente gera as outras pendências.
     */
    @Test
    void reuNaoIntimadoDeveGerarPendenciasDeIntimacaoEMandado() {
        long varaId = criarVara("VARA");
        String dataFutura = LocalDate.now().plusDays(10).toString();
        long audienciaId = ((Number) audiencias.criar(corpoAudiencia(varaId, dataFutura, "10:00"))
                .get("id")).longValue();
        participacoes.adicionar(audienciaId, Map.of("pessoaId", criarPessoa("RÉU"), "tipo", "REU"));

        Map<String, Object> resultado = pendencias.listarPendencias();
        assertEquals(0, ((List<?>) resultado.get("audienciasSemParte")).size());
        assertEquals(1, ((List<?>) resultado.get("partesNaoIntimadas")).size());
        assertEquals(1, ((List<?>) resultado.get("mandadosComProblema")).size());
        assertEquals(2, ((Map<?, ?>) resultado.get("totais")).get("total"));
    }

    /**
     * Participante intimado com mandado positivo não deve gerar pendência.
     */
    @Test
    void participanteIntimadoNaoDeveGerarPendencia() {
        long varaId = criarVara("VARA");
        String dataFutura = LocalDate.now().plusDays(10).toString();
        long audienciaId = ((Number) audiencias.criar(corpoAudiencia(varaId, dataFutura, "10:00"))
                .get("id")).longValue();
        participacoes.adicionar(audienciaId, Map.of("pessoaId", criarPessoa("RÉU"), "tipo", "REU",
                "intimado", true, "statusMandado", "POSITIVO"));

        Map<String, Object> resultado = pendencias.listarPendencias();
        assertEquals(0, ((Map<?, ?>) resultado.get("totais")).get("total"));
    }

    /**
     * Audiências passadas ou canceladas não entram no levantamento.
     */
    @Test
    void audienciasPassadasOuCanceladasNaoContam() {
        long varaId = criarVara("VARA");
        // Audiência antiga ainda PENDENTE: não gera pendências de intimação,
        // mas entra em audienciasVencidas (status precisa ser atualizado).
        audiencias.criar(corpoAudiencia(varaId, "2020-01-10", "10:00"));
        // Audiência futura não realizada, sem participantes.
        Map<String, Object> cancelada = corpoAudiencia(varaId, LocalDate.now().plusDays(5).toString(), "11:00");
        cancelada.put("status", "NAO_REALIZADA");
        audiencias.criar(cancelada);

        Map<String, Object> resultado = pendencias.listarPendencias();
        assertEquals(0, ((List<?>) resultado.get("audienciasSemParte")).size());
        assertEquals(0, ((List<?>) resultado.get("partesNaoIntimadas")).size());
        assertEquals(1, ((List<?>) resultado.get("audienciasVencidas")).size());
        assertEquals(1, ((Map<?, ?>) resultado.get("totais")).get("total"));
    }

    /**
     * Audiência passada com status Pendente deve aparecer como vencida;
     * ao ser marcada como Realizada, a pendência some.
     */
    @Test
    void audienciaVencidaSomeQuandoStatusAtualizado() {
        long varaId = criarVara("VARA");
        long id = ((Number) audiencias.criar(corpoAudiencia(varaId, "2024-05-10", "10:00"))
                .get("id")).longValue();
        assertEquals(1, ((List<?>) pendencias.listarPendencias().get("audienciasVencidas")).size());

        Map<String, Object> corpo = corpoAudiencia(varaId, "2024-05-10", "10:00");
        corpo.put("status", "REALIZADA");
        audiencias.atualizar(id, corpo);
        assertEquals(0, ((List<?>) pendencias.listarPendencias().get("audienciasVencidas")).size());
    }
}
