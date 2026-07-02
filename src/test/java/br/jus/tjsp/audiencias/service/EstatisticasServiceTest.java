package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.TesteBase;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Testes das métricas do dashboard.
 */
class EstatisticasServiceTest extends TesteBase {

    /** Serviço sob teste. */
    private final EstatisticasService servico = new EstatisticasService();

    /**
     * Com o banco vazio, todos os contadores devem ser zero.
     */
    @Test
    void bancoVazioDeveTerContadoresZerados() {
        Map<String, Object> resumo = servico.resumoDashboard();
        assertEquals(0L, resumo.get("totalAudiencias"));
        assertEquals(0L, resumo.get("audienciasHoje"));
        assertEquals(0L, resumo.get("totalVaras"));
    }

    /**
     * Os contadores devem refletir os registros criados, e
     * {@code audienciasHoje} deve contar apenas as audiências de hoje.
     */
    @Test
    void contadoresDevemRefletirOsRegistros() {
        long varaId = criarVara("Vara");
        criarJuiz("Juiz");
        criarPessoa("Pessoa");
        criarAdvogado("Advogada");

        AudienciaService audiencias = new AudienciaService();
        audiencias.criar(corpoAudiencia(varaId, LocalDate.now().toString(), "10:00"));
        audiencias.criar(corpoAudiencia(varaId, "2030-01-07", "10:00"));

        Map<String, Object> resumo = servico.resumoDashboard();
        assertEquals(2L, resumo.get("totalAudiencias"));
        assertEquals(1L, resumo.get("audienciasHoje"));
        assertEquals(1L, resumo.get("totalVaras"));
        assertEquals(1L, resumo.get("totalJuizes"));
        assertEquals(0L, resumo.get("totalPromotores"));
        assertEquals(1L, resumo.get("totalAdvogados"));
        assertEquals(1L, resumo.get("totalPessoas"));
    }
}
