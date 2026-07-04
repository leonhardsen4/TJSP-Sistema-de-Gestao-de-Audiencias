package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.TesteBase;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Testes da geração do PDF da pauta de audiências.
 */
class PautaPdfServiceTest extends TesteBase {

    /**
     * Mesmo sem audiências, a pauta deve ser um PDF válido.
     */
    @Test
    void pautaSemAudienciasDeveGerarPdfValido() {
        PautaPdfService servico = new PautaPdfService(new AudienciaService(), new ParticipacaoService());
        byte[] pdf = servico.gerarPautaPdf(LocalDate.parse("2026-07-06"));
        assertTrue(pdf.length > 0);
        assertTrue(new String(pdf, 0, 5, StandardCharsets.US_ASCII).startsWith("%PDF-"));
    }

    /**
     * Com audiência e participante, o PDF deve ser gerado e ficar maior
     * que a versão vazia (conteúdo adicional).
     */
    @Test
    void pautaComAudienciaDeveIncluirConteudo() {
        AudienciaService audiencias = new AudienciaService();
        ParticipacaoService participacoes = new ParticipacaoService();
        PautaPdfService servico = new PautaPdfService(audiencias, participacoes);

        byte[] pdfVazio = servico.gerarPautaPdf(LocalDate.parse("2026-07-06"));

        long varaId = criarVara("1ª Vara Criminal");
        long audienciaId = ((Number) audiencias
                .criar(corpoAudiencia(varaId, "2026-07-06", "10:00")).get("id")).longValue();
        long pessoaId = criarPessoa("Carlos");
        long advogadoId = criarAdvogado("Ana");
        participacoes.adicionar(audienciaId,
                Map.of("pessoaId", pessoaId, "tipo", "REU", "advogadoId", advogadoId, "intimado", true));

        byte[] pdfCheio = servico.gerarPautaPdf(LocalDate.parse("2026-07-06"));
        assertTrue(new String(pdfCheio, 0, 5, StandardCharsets.US_ASCII).startsWith("%PDF-"));
        assertTrue(pdfCheio.length > pdfVazio.length,
                "o PDF com audiência deve ter mais conteúdo que o vazio");
    }
}
