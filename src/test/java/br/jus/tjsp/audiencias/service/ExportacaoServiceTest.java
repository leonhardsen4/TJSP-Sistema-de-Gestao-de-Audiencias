package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.TesteBase;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Testes da exportação da lista de audiências em planilha CSV e PDF
 * paisagem.
 */
class ExportacaoServiceTest extends TesteBase {

    /** Serviço em teste. */
    private final ExportacaoService exportacao = new ExportacaoService();

    /** Monta uma audiência de exemplo via serviço (garante o formato da API). */
    private List<Map<String, Object>> audienciasDeExemplo() {
        AudienciaService audiencias = new AudienciaService();
        long varaId = criarVara("1ª VARA; CRIMINAL");
        Map<String, Object> corpo = corpoAudiencia(varaId, "2026-07-06", "13:00");
        corpo.put("artigo", "ART. 157 DO CP");
        audiencias.criar(corpo);
        return audiencias.listar(null);
    }

    /**
     * O CSV deve ter BOM, cabeçalho, data em formato brasileiro e o campo
     * com {@code ;} protegido por aspas.
     */
    @Test
    void csvDeveTerCabecalhoDatasEEscapes() {
        String csv = new String(exportacao.gerarCsv(audienciasDeExemplo()), StandardCharsets.UTF_8);
        assertTrue(csv.startsWith("﻿"), "deve começar com BOM UTF-8");
        assertTrue(csv.contains("Data;Horário;Número do Processo;Vara;Competência;Artigo/Assunto"));
        assertTrue(csv.contains("06/07/2026;13:00;1234567-89.2026.8.26.0001"));
        // O nome da vara contém ';', então precisa vir entre aspas.
        assertTrue(csv.contains("\"1ª VARA; CRIMINAL\""));
        assertTrue(csv.contains("ART. 157 DO CP"));
    }

    /**
     * O PDF paisagem deve ser gerado válido, com e sem audiências.
     */
    @Test
    void pdfPaisagemDeveSerValido() {
        byte[] vazio = exportacao.gerarPdfPaisagem(List.of());
        assertTrue(new String(vazio, 0, 5, StandardCharsets.US_ASCII).startsWith("%PDF-"));

        byte[] cheio = exportacao.gerarPdfPaisagem(audienciasDeExemplo());
        assertTrue(new String(cheio, 0, 5, StandardCharsets.US_ASCII).startsWith("%PDF-"));
        assertTrue(cheio.length > vazio.length, "o PDF com audiências deve ter mais conteúdo");
    }
}
