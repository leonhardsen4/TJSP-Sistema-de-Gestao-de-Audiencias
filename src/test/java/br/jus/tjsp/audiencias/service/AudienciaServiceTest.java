package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.TesteBase;
import br.jus.tjsp.audiencias.web.ApiException;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Testes das regras de negócio de audiências: validação, campos
 * calculados, filtros, conflitos de horário e horários livres.
 */
class AudienciaServiceTest extends TesteBase {

    /** Serviço sob teste. */
    private final AudienciaService servico = new AudienciaService();

    /**
     * Criar deve calcular {@code horarioFim} e {@code diaSemana} e devolver
     * a vara aninhada.
     */
    @Test
    void criarDeveCalcularCamposDerivados() {
        long varaId = criarVara("1ª Vara");
        // 2026-07-06 é uma segunda-feira
        Map<String, Object> criada = servico.criar(corpoAudiencia(varaId, "2026-07-06", "10:00"));
        assertEquals("11:00", criada.get("horarioFim"));
        assertEquals("segunda-feira", criada.get("diaSemana"));
        assertEquals("1ª Vara", ((Map<?, ?>) criada.get("vara")).get("nome"));
    }

    /**
     * A data da audiência também pode chegar no formato brasileiro.
     */
    @Test
    void criarDeveAceitarDataBrasileira() {
        long varaId = criarVara("Vara");
        Map<String, Object> criada = servico.criar(corpoAudiencia(varaId, "06/07/2026", "09:00"));
        assertEquals("2026-07-06", criada.get("dataAudiencia"));
    }

    /**
     * Número de processo fora do padrão CNJ deve ser rejeitado.
     */
    @Test
    void criarComProcessoInvalidoDeveFalhar() {
        long varaId = criarVara("Vara");
        Map<String, Object> corpo = corpoAudiencia(varaId, "2026-07-06", "10:00");
        corpo.put("numeroProcesso", "123");
        ApiException erro = assertThrows(ApiException.class, () -> servico.criar(corpo));
        assertEquals(400, erro.getStatus());
        assertTrue(erro.getErros().containsKey("numeroProcesso"));
    }

    /**
     * Valores desconhecidos de enum devem ser rejeitados com erro por campo.
     */
    @Test
    void criarComEnumInvalidoDeveFalhar() {
        long varaId = criarVara("Vara");
        Map<String, Object> corpo = corpoAudiencia(varaId, "2026-07-06", "10:00");
        corpo.put("status", "INEXISTENTE");
        ApiException erro = assertThrows(ApiException.class, () -> servico.criar(corpo));
        assertTrue(erro.getErros().containsKey("status"));
    }

    /**
     * Vara inexistente deve impedir a criação.
     */
    @Test
    void criarComVaraInexistenteDeveFalhar() {
        ApiException erro = assertThrows(ApiException.class,
                () -> servico.criar(corpoAudiencia(999, "2026-07-06", "10:00")));
        assertTrue(erro.getErros().containsKey("varaId"));
    }

    /**
     * O filtro por competência deve devolver só as audiências daquela
     * competência; sem filtro, devolve todas.
     */
    @Test
    void listarDeveFiltrarPorCompetencia() {
        long varaId = criarVara("Vara");
        servico.criar(corpoAudiencia(varaId, "2026-07-06", "09:00"));
        Map<String, Object> outra = corpoAudiencia(varaId, "2026-07-06", "14:00");
        outra.put("competencia", "VIOLENCIA_DOMESTICA");
        servico.criar(outra);

        assertEquals(2, servico.listar(null).size());
        assertEquals(1, servico.listar("VIOLENCIA_DOMESTICA").size());
    }

    /**
     * Atualizar deve regravar os campos e recalcular os derivados.
     */
    @Test
    void atualizarDeveRecalcularDerivados() {
        long varaId = criarVara("Vara");
        long id = ((Number) servico.criar(corpoAudiencia(varaId, "2026-07-06", "10:00")).get("id")).longValue();
        Map<String, Object> corpo = corpoAudiencia(varaId, "2026-07-07", "15:30");
        corpo.put("duracao", 90);
        Map<String, Object> atualizada = servico.atualizar(id, corpo);
        assertEquals("17:00", atualizada.get("horarioFim"));
        assertEquals("terça-feira", atualizada.get("diaSemana"));
    }

    /**
     * Horários sobrepostos na mesma vara e data devem ser apontados como
     * conflito; horários disjuntos, não.
     */
    @Test
    void verificarConflitosDeveDetectarSobreposicao() {
        long varaId = criarVara("Vara");
        servico.criar(corpoAudiencia(varaId, "2026-07-06", "10:00"));

        Map<String, Object> comConflito = servico.verificarConflitos(
                LocalDate.parse("2026-07-06"), "10:30", 60, varaId, null);
        assertEquals(true, comConflito.get("temConflito"));
        assertEquals(1, ((List<?>) comConflito.get("conflitos")).size());

        Map<String, Object> semConflito = servico.verificarConflitos(
                LocalDate.parse("2026-07-06"), "14:00", 60, varaId, null);
        assertEquals(false, semConflito.get("temConflito"));
    }

    /**
     * Em edição, a própria audiência não deve contar como conflito.
     */
    @Test
    void verificarConflitosDeveIgnorarAPropriaAudiencia() {
        long varaId = criarVara("Vara");
        long id = ((Number) servico.criar(corpoAudiencia(varaId, "2026-07-06", "10:00")).get("id")).longValue();
        Map<String, Object> resultado = servico.verificarConflitos(
                LocalDate.parse("2026-07-06"), "10:00", 60, varaId, id);
        assertEquals(false, resultado.get("temConflito"));
    }

    /**
     * Audiências canceladas não devem gerar conflito.
     */
    @Test
    void verificarConflitosDeveIgnorarCanceladas() {
        long varaId = criarVara("Vara");
        Map<String, Object> cancelada = corpoAudiencia(varaId, "2026-07-06", "10:00");
        cancelada.put("status", "NAO_REALIZADA");
        servico.criar(cancelada);
        Map<String, Object> resultado = servico.verificarConflitos(
                LocalDate.parse("2026-07-06"), "10:00", 60, varaId, null);
        assertEquals(false, resultado.get("temConflito"));
    }

    /**
     * A busca de horários livres deve pular fins de semana e os horários
     * ocupados (incluindo o intervalo de segurança de 30 minutos).
     */
    @Test
    void horariosLivresDevePularFimDeSemanaEOcupados() {
        long varaId = criarVara("Vara");
        servico.criar(corpoAudiencia(varaId, "2026-07-06", "10:00")); // segunda, 10:00-11:00

        // Sábado 04/07 e domingo 05/07 não devem aparecer
        List<Map<String, Object>> livres = servico.buscarHorariosLivres(
                varaId, LocalDate.parse("2026-07-04"), LocalDate.parse("2026-07-06"),
                60, "10:00", "13:00");
        assertFalse(livres.isEmpty());
        assertTrue(livres.stream().allMatch(h -> h.get("data").equals("2026-07-06")));
        // 10:00 ocupado; 11:00 e 11:30 bloqueados pelo intervalo de segurança
        assertTrue(livres.stream().noneMatch(h -> h.get("horarioInicio").equals("10:00")));
        assertTrue(livres.stream().anyMatch(h -> h.get("horarioInicio").equals("12:00")));
    }

    /**
     * Excluir a audiência deve levar junto participações e representações
     * (cascata do banco).
     */
    @Test
    void excluirDeveRemoverParticipacoesEmCascata() {
        long varaId = criarVara("Vara");
        long id = ((Number) servico.criar(corpoAudiencia(varaId, "2026-07-06", "10:00")).get("id")).longValue();
        long pessoaId = criarPessoa("Réu");
        ParticipacaoService participacoes = new ParticipacaoService();
        participacoes.adicionar(id, Map.of("pessoaId", pessoaId, "tipo", "REU"));

        servico.excluir(id);
        assertTrue(participacoes.listar(id).isEmpty());
        assertThrows(ApiException.class, () -> servico.buscarPorId(id));
    }

    /**
     * Os filtros combinados da listagem (vara, período, status e texto)
     * devem restringir o resultado.
     */
    @Test
    void listarComFiltrosDeveRestringirResultado() {
        long varaA = criarVara("Vara A");
        long varaB = criarVara("Vara B");
        servico.criar(corpoAudiencia(varaA, "2026-07-06", "09:00"));
        Map<String, Object> outra = corpoAudiencia(varaB, "2026-08-10", "14:00");
        outra.put("status", "REALIZADA");
        outra.put("observacoes", "réu confesso");
        servico.criar(outra);

        assertEquals(1, servico.listar(null, String.valueOf(varaA), null, null, null, null, null).size());
        assertEquals(1, servico.listar(null, null, "2026-08-01", "2026-08-31", null, null, null).size());
        assertEquals(1, servico.listar(null, null, null, null, "REALIZADA", null, null).size());
        assertEquals(1, servico.listar(null, null, null, null, null, null, "confesso").size());
        assertEquals(0, servico.listar(null, String.valueOf(varaA), null, null, "REALIZADA", null, null).size());
        assertEquals(2, servico.listar(null, null, null, null, null, null, null).size());
    }

    /**
     * Audiências encostadas (uma termina quando a outra começa) não devem
     * ser apontadas como conflito.
     */
    @Test
    void verificarConflitosNaoDeveAcusarAudienciasEncostadas() {
        long varaId = criarVara("Vara");
        servico.criar(corpoAudiencia(varaId, "2026-07-06", "10:00")); // 10:00-11:00

        Map<String, Object> encostada = servico.verificarConflitos(
                LocalDate.parse("2026-07-06"), "11:00", 60, varaId, null);
        assertEquals(false, encostada.get("temConflito"));
    }

    /**
     * O intervalo de segurança deve ser de exatos 30 minutos: um slot que
     * começa 30 minutos após o fim da audiência ocupada é válido.
     */
    @Test
    void horariosLivresDeveRespeitarIntervaloDeSegurancaExato() {
        long varaId = criarVara("Vara");
        servico.criar(corpoAudiencia(varaId, "2026-07-06", "10:00")); // 10:00-11:00

        List<Map<String, Object>> livres = servico.buscarHorariosLivres(
                varaId, LocalDate.parse("2026-07-06"), LocalDate.parse("2026-07-06"),
                60, "08:00", "13:00");
        // 11:30 = fim da ocupada (11:00) + 30 minutos: deve estar livre.
        assertTrue(livres.stream().anyMatch(h -> h.get("horarioInicio").equals("11:30")));
        // 08:30-09:30 termina exatamente 30 minutos antes das 10:00: deve estar livre.
        assertTrue(livres.stream().anyMatch(h -> h.get("horarioInicio").equals("08:30")));
        // 09:00-10:00 encosta na ocupada sem folga: deve estar bloqueado.
        assertTrue(livres.stream().noneMatch(h -> h.get("horarioInicio").equals("09:00")));
        // 11:00 encosta no fim da ocupada sem folga: deve estar bloqueado.
        assertTrue(livres.stream().noneMatch(h -> h.get("horarioInicio").equals("11:00")));
    }

    /**
     * Dias já passados não devem receber sugestões de horários livres.
     */
    @Test
    void horariosLivresNaoDeveSugerirDiasPassados() {
        long varaId = criarVara("Vara");
        List<Map<String, Object>> livres = servico.buscarHorariosLivres(
                varaId, LocalDate.now().minusDays(7), LocalDate.now().minusDays(5),
                60, "10:00", "13:00");
        assertTrue(livres.isEmpty());
    }

    /**
     * As peças do processo (defesa prévia, FA/CDC e laudo) devem ser
     * gravadas com a folha; a folha só vale quando a peça está marcada.
     */
    @Test
    void pecasDoProcessoDevemSerGravadasComFolha() {
        long varaId = criarVara("Vara");
        Map<String, Object> corpo = corpoAudiencia(varaId, "2026-07-06", "10:00");
        corpo.put("defesaPrevia", true);
        corpo.put("defesaPreviaFolha", "fls. 30");
        corpo.put("laudo", false);
        corpo.put("laudoFolha", "fls. 99"); // ignorada: peça desmarcada

        Map<String, Object> criada = servico.criar(corpo);
        assertEquals(true, criada.get("defesaPrevia"));
        assertEquals("FLS. 30", criada.get("defesaPreviaFolha"));
        assertEquals(false, criada.get("laudo"));
        assertEquals(null, criada.get("laudoFolha"));
    }

    /**
     * O marcador RP (réu preso) deve ser derivado automaticamente dos
     * participantes: liga ao adicionar um participante preso e desliga
     * quando ele é removido.
     */
    @Test
    void reuPresoDeveSerDerivadoDosParticipantes() {
        long varaId = criarVara("Vara");
        long id = ((Number) servico.criar(corpoAudiencia(varaId, "2026-07-06", "10:00")).get("id")).longValue();
        assertEquals(false, servico.buscarPorId(id).get("reuPreso"));

        ParticipacaoService participacoes = new ParticipacaoService();
        Map<String, Object> participante = participacoes.adicionar(id, Map.of(
                "pessoaId", criarPessoa("Réu"), "tipo", "REU",
                "preso", true, "localPrisao", "CDP DE CAIEIRAS"));
        assertEquals(true, servico.buscarPorId(id).get("reuPreso"));
        assertEquals("CDP DE CAIEIRAS", participante.get("localPrisao"));

        participacoes.remover(id, ((Number) participante.get("id")).longValue());
        assertEquals(false, servico.buscarPorId(id).get("reuPreso"));
    }

    /**
     * parseData deve aceitar os dois formatos e rejeitar entradas inválidas.
     */
    @Test
    void parseDataDeveAceitarDoisFormatos() {
        assertEquals(LocalDate.of(2026, 7, 6), AudienciaService.parseData("2026-07-06"));
        assertEquals(LocalDate.of(2026, 7, 6), AudienciaService.parseData("06/07/2026"));
        assertThrows(ApiException.class, () -> AudienciaService.parseData("06-07-2026"));
        assertThrows(ApiException.class, () -> AudienciaService.parseData(null));
    }
}
