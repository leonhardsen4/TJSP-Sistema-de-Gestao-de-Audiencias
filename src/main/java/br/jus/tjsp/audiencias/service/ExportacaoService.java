package br.jus.tjsp.audiencias.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * Exportação da lista de audiências (com os filtros aplicados na tela)
 * em dois formatos:
 *
 * <ul>
 *   <li><b>Planilha CSV</b> — separador {@code ;} e BOM UTF-8, o formato
 *       que o Excel (inclusive Online) e o Planilhas Google abrem
 *       diretamente com acentuação correta;</li>
 *   <li><b>PDF em paisagem</b> — tabela enxuta para impressão.</li>
 * </ul>
 *
 * <p>Colunas exportadas: Data, Horário, Número do Processo, Vara,
 * Competência e Artigo/Assunto.</p>
 */
public class ExportacaoService {

    /** Datas exibidas sempre em formato brasileiro. */
    private static final DateTimeFormatter FORMATO_BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /** Data e hora de geração exibidas no cabeçalho do PDF. */
    private static final DateTimeFormatter FORMATO_BR_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy 'às' HH:mm");

    /** Títulos das colunas exportadas, na ordem. */
    private static final String[] COLUNAS =
            {"Data", "Horário", "Número do Processo", "Vara", "Competência", "Artigo/Assunto"};

    /**
     * Gera a planilha CSV das audiências.
     *
     * @param audiencias audiências no formato de resposta da API
     * @return bytes do arquivo CSV (UTF-8 com BOM, separador {@code ;})
     */
    public byte[] gerarCsv(List<Map<String, Object>> audiencias) {
        // BOM UTF-8 para o Excel reconhecer a codificação automaticamente.
        StringBuilder csv = new StringBuilder("﻿");
        csv.append(String.join(";", COLUNAS)).append("\r\n");
        for (Map<String, Object> a : audiencias) {
            csv.append(String.join(";", new String[]{
                    campoCsv(dataBr(a)),
                    campoCsv(texto(a, "horarioInicio")),
                    campoCsv(texto(a, "numeroProcesso")),
                    campoCsv(nomeAninhado(a, "vara")),
                    campoCsv(legivel(texto(a, "competencia"))),
                    campoCsv(texto(a, "artigo"))
            })).append("\r\n");
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Gera o PDF em orientação paisagem com a tabela das audiências.
     *
     * @param audiencias audiências no formato de resposta da API
     * @return bytes do documento PDF
     */
    public byte[] gerarPdfPaisagem(List<Map<String, Object>> audiencias) {
        ByteArrayOutputStream saida = new ByteArrayOutputStream();
        Document documento = new Document(PageSize.A4.rotate(), 30, 30, 30, 30);
        PdfWriter.getInstance(documento, saida);
        documento.open();

        Paragraph titulo = new Paragraph("TRIBUNAL DE JUSTIÇA DO ESTADO DE SÃO PAULO — Comarca de Cotia",
                new Font(Font.HELVETICA, 13, Font.BOLD));
        titulo.setAlignment(Element.ALIGN_CENTER);
        documento.add(titulo);

        Paragraph subtitulo = new Paragraph("RELAÇÃO DE AUDIÊNCIAS", new Font(Font.HELVETICA, 11, Font.BOLD));
        subtitulo.setAlignment(Element.ALIGN_CENTER);
        subtitulo.setSpacingBefore(4);
        documento.add(subtitulo);

        Paragraph resumo = new Paragraph(audiencias.size() + " audiência(s)   |   Gerada em "
                + LocalDateTime.now().format(FORMATO_BR_HORA),
                new Font(Font.HELVETICA, 8, Font.ITALIC, Color.DARK_GRAY));
        resumo.setAlignment(Element.ALIGN_CENTER);
        resumo.setSpacingBefore(3);
        resumo.setSpacingAfter(10);
        documento.add(resumo);

        PdfPTable tabela = new PdfPTable(new float[]{9, 7, 22, 20, 14, 28});
        tabela.setWidthPercentage(100);
        tabela.setHeaderRows(1);

        Font fonteTitulo = new Font(Font.HELVETICA, 9, Font.BOLD);
        for (String coluna : COLUNAS) {
            PdfPCell celula = new PdfPCell(new Paragraph(coluna, fonteTitulo));
            celula.setBackgroundColor(new Color(230, 234, 240));
            celula.setPadding(5);
            tabela.addCell(celula);
        }

        Font fonteCelula = new Font(Font.HELVETICA, 9, Font.NORMAL);
        for (Map<String, Object> a : audiencias) {
            for (String valor : new String[]{
                    dataBr(a), texto(a, "horarioInicio"), texto(a, "numeroProcesso"),
                    nomeAninhado(a, "vara"), legivel(texto(a, "competencia")), texto(a, "artigo")}) {
                PdfPCell celula = new PdfPCell(new Paragraph(valor, fonteCelula));
                celula.setPadding(4);
                tabela.addCell(celula);
            }
        }

        if (audiencias.isEmpty()) {
            Paragraph vazio = new Paragraph("Nenhuma audiência encontrada para os filtros informados.",
                    new Font(Font.HELVETICA, 11, Font.NORMAL));
            vazio.setAlignment(Element.ALIGN_CENTER);
            vazio.setSpacingBefore(20);
            documento.add(vazio);
        } else {
            documento.add(tabela);
        }

        documento.close();
        return saida.toByteArray();
    }

    /**
     * Protege um campo do CSV: envolve em aspas quando contém separador,
     * aspas ou quebra de linha (regra do formato).
     *
     * @param valor valor do campo (pode ser vazio)
     * @return campo pronto para a linha CSV
     */
    private static String campoCsv(String valor) {
        if (valor.contains(";") || valor.contains("\"") || valor.contains("\n")) {
            return '"' + valor.replace("\"", "\"\"") + '"';
        }
        return valor;
    }

    /**
     * Lê a data da audiência já em formato brasileiro.
     *
     * @param audiencia audiência no formato da API
     * @return data em {@code dd/MM/yyyy}
     */
    private static String dataBr(Map<String, Object> audiencia) {
        String iso = texto(audiencia, "dataAudiencia");
        return iso.isEmpty() ? "" : LocalDate.parse(iso).format(FORMATO_BR);
    }

    /**
     * Lê um campo textual com vazio como padrão.
     *
     * @param mapa  audiência
     * @param campo nome do campo
     * @return valor do campo, ou {@code ""} se ausente
     */
    private static String texto(Map<String, Object> mapa, String campo) {
        Object v = mapa.get(campo);
        return v == null ? "" : v.toString();
    }

    /**
     * Lê o nome de um objeto aninhado ({@code vara}).
     *
     * @param mapa  audiência
     * @param campo nome do objeto aninhado
     * @return nome encontrado, ou {@code ""}
     */
    private static String nomeAninhado(Map<String, Object> mapa, String campo) {
        Object aninhado = mapa.get(campo);
        if (aninhado instanceof Map<?, ?> m && m.get("nome") != null) {
            return m.get("nome").toString();
        }
        return "";
    }

    /**
     * Converte um código de enum ({@code VIOLENCIA_DOMESTICA}) em texto
     * legível ({@code Violencia Domestica}).
     *
     * @param codigo nome do enum
     * @return texto com iniciais maiúsculas e espaços, ou {@code ""}
     */
    private static String legivel(String codigo) {
        if (codigo == null || codigo.isBlank()) {
            return "";
        }
        String[] palavras = codigo.toLowerCase().split("_");
        StringBuilder sb = new StringBuilder();
        for (String palavra : palavras) {
            if (!palavra.isEmpty()) {
                if (sb.length() > 0) {
                    sb.append(' ');
                }
                sb.append(Character.toUpperCase(palavra.charAt(0))).append(palavra.substring(1));
            }
        }
        return sb.toString();
    }
}
