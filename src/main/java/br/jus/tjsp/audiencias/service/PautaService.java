package br.jus.tjsp.audiencias.service;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * Gera o PDF da pauta de audiências de um dia, usando OpenPDF.
 *
 * <p>Cada audiência é apresentada em um bloco com número do processo,
 * horário, competência, tipo, formato, vara, juiz, promotor, observações
 * e a lista de participantes com seus advogados.</p>
 */
public class PautaService {

    /** Datas exibidas no PDF sempre em formato brasileiro. */
    private static final DateTimeFormatter FORMATO_BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /** Serviço usado para listar as audiências do dia. */
    private final AudienciaService audienciaService;

    /** Serviço usado para listar os participantes de cada audiência. */
    private final ParticipacaoService participacaoService;

    /**
     * Cria o serviço de pauta.
     *
     * @param audienciaService    fonte das audiências do dia
     * @param participacaoService fonte dos participantes de cada audiência
     */
    public PautaService(AudienciaService audienciaService, ParticipacaoService participacaoService) {
        this.audienciaService = audienciaService;
        this.participacaoService = participacaoService;
    }

    /**
     * Gera o PDF da pauta do dia.
     *
     * @param data data da pauta
     * @return bytes do documento PDF
     */
    public byte[] gerarPautaPdf(LocalDate data) {
        List<Map<String, Object>> audiencias = audienciaService.listarPorData(data);

        ByteArrayOutputStream saida = new ByteArrayOutputStream();
        Document documento = new Document(PageSize.A4);
        PdfWriter.getInstance(documento, saida);
        documento.open();

        Font fonteTitulo = new Font(Font.HELVETICA, 18, Font.BOLD);
        Paragraph titulo = new Paragraph("TRIBUNAL DE JUSTIÇA DO ESTADO DE SÃO PAULO", fonteTitulo);
        titulo.setAlignment(Element.ALIGN_CENTER);
        documento.add(titulo);

        Font fonteSubtitulo = new Font(Font.HELVETICA, 14, Font.BOLD);
        Paragraph subtitulo = new Paragraph("PAUTA DE AUDIÊNCIAS", fonteSubtitulo);
        subtitulo.setAlignment(Element.ALIGN_CENTER);
        subtitulo.setSpacingBefore(10);
        documento.add(subtitulo);

        Font fonteData = new Font(Font.HELVETICA, 12, Font.NORMAL);
        Paragraph paragrafoData = new Paragraph("Data: " + data.format(FORMATO_BR), fonteData);
        paragrafoData.setAlignment(Element.ALIGN_CENTER);
        paragrafoData.setSpacingBefore(10);
        paragrafoData.setSpacingAfter(20);
        documento.add(paragrafoData);

        if (audiencias.isEmpty()) {
            Paragraph vazio = new Paragraph("Nenhuma audiência agendada para esta data.", fonteData);
            vazio.setAlignment(Element.ALIGN_CENTER);
            vazio.setSpacingBefore(50);
            documento.add(vazio);
        } else {
            for (int i = 0; i < audiencias.size(); i++) {
                adicionarBlocoProcesso(documento, audiencias.get(i));
                if (i < audiencias.size() - 1) {
                    documento.add(new Paragraph(" ", new Font(Font.HELVETICA, 8, Font.NORMAL)));
                }
            }
        }

        documento.close();
        return saida.toByteArray();
    }

    /**
     * Adiciona ao documento o bloco de uma audiência, com moldura e
     * fundo suave, contendo os dados do processo e os participantes.
     *
     * @param documento documento em construção
     * @param audiencia audiência no formato de resposta da API
     */
    private void adicionarBlocoProcesso(Document documento, Map<String, Object> audiencia) {
        PdfPTable tabela = new PdfPTable(1);
        tabela.setWidthPercentage(100);
        tabela.setSpacingBefore(10);
        tabela.setSpacingAfter(5);

        PdfPCell celula = new PdfPCell();
        celula.setBorder(Rectangle.BOX);
        celula.setPadding(10);
        celula.setBackgroundColor(new Color(248, 249, 250));

        Font fonteCabecalho = new Font(Font.HELVETICA, 14, Font.BOLD);
        Font fonteHorario = new Font(Font.HELVETICA, 12, Font.BOLD);
        Font fonteRotulo = new Font(Font.HELVETICA, 10, Font.BOLD);
        Font fonteValor = new Font(Font.HELVETICA, 10, Font.NORMAL);

        Paragraph cabecalho = new Paragraph();
        cabecalho.add(new Chunk("PROCESSO Nº " + valor(audiencia, "numeroProcesso"), fonteCabecalho));
        cabecalho.add(new Chunk("     HORÁRIO: " + valor(audiencia, "horarioInicio"), fonteHorario));
        cabecalho.setSpacingAfter(8);
        celula.addElement(cabecalho);

        Paragraph competencia = new Paragraph();
        competencia.add(new Chunk("COMPETÊNCIA: ", fonteRotulo));
        competencia.add(new Chunk(valor(audiencia, "competencia"), fonteValor));
        competencia.setSpacingAfter(5);
        celula.addElement(competencia);

        Paragraph info = new Paragraph();
        info.add(new Chunk("Tipo: ", fonteRotulo));
        info.add(new Chunk(valor(audiencia, "tipoAudiencia"), fonteValor));
        info.add(new Chunk("     Formato: ", fonteRotulo));
        info.add(new Chunk(valor(audiencia, "formato"), fonteValor));
        info.setSpacingAfter(5);
        celula.addElement(info);

        Paragraph varaJuiz = new Paragraph();
        varaJuiz.add(new Chunk("Vara: ", fonteRotulo));
        varaJuiz.add(new Chunk(nomeAninhado(audiencia, "vara"), fonteValor));
        varaJuiz.add(new Chunk("     Juiz: ", fonteRotulo));
        varaJuiz.add(new Chunk(nomeAninhado(audiencia, "juiz"), fonteValor));
        varaJuiz.setSpacingAfter(5);
        celula.addElement(varaJuiz);

        Paragraph promotor = new Paragraph();
        promotor.add(new Chunk("Promotor: ", fonteRotulo));
        promotor.add(new Chunk(nomeAninhado(audiencia, "promotor"), fonteValor));
        promotor.setSpacingAfter(5);
        celula.addElement(promotor);

        Object observacoes = audiencia.get("observacoes");
        if (observacoes != null && !observacoes.toString().isBlank()) {
            Paragraph obs = new Paragraph();
            obs.add(new Chunk("Observações: ", fonteRotulo));
            obs.add(new Chunk(observacoes.toString(), fonteValor));
            obs.setSpacingAfter(8);
            celula.addElement(obs);
        }

        Paragraph tituloParticipantes = new Paragraph();
        tituloParticipantes.add(new Chunk("PARTICIPANTES:", fonteRotulo));
        tituloParticipantes.setSpacingAfter(3);
        celula.addElement(tituloParticipantes);

        List<Map<String, Object>> participantes =
                participacaoService.listar(((Number) audiencia.get("id")).longValue());
        if (participantes.isEmpty()) {
            Paragraph nenhum = new Paragraph("Nenhum participante cadastrado.", fonteValor);
            nenhum.setIndentationLeft(10);
            celula.addElement(nenhum);
        } else {
            for (Map<String, Object> participante : participantes) {
                celula.addElement(linhaParticipante(participante, fonteValor));
            }
        }

        tabela.addCell(celula);
        documento.add(tabela);
    }

    /**
     * Monta a linha de um participante: nome, papel na audiência,
     * advogado (se houver) e indicação de intimação.
     *
     * @param participante participante no formato da API
     * @param fonteValor   fonte base do texto
     * @return parágrafo pronto para inclusão no bloco do processo
     */
    private Paragraph linhaParticipante(Map<String, Object> participante, Font fonteValor) {
        Paragraph linha = new Paragraph();
        linha.setIndentationLeft(10);
        linha.add(new Chunk("• ", fonteValor));
        linha.add(new Chunk(nomeAninhado(participante, "pessoa"), fonteValor));
        linha.add(new Chunk(" - ", fonteValor));
        linha.add(new Chunk(descricaoTipoParticipacao(String.valueOf(participante.get("tipo"))),
                new Font(Font.HELVETICA, 9, Font.ITALIC)));

        Object representacao = participante.get("representacao");
        if (representacao instanceof Map<?, ?> repr) {
            Object advogado = repr.get("advogado");
            if (advogado instanceof Map<?, ?> adv) {
                linha.add(new Chunk(" | Advogado: ", new Font(Font.HELVETICA, 8, Font.BOLD)));
                linha.add(new Chunk(String.valueOf(adv.get("nome")), new Font(Font.HELVETICA, 8, Font.NORMAL)));
                linha.add(new Chunk(" (OAB: " + adv.get("oab") + ")",
                        new Font(Font.HELVETICA, 8, Font.NORMAL, Color.BLUE)));
            }
        }
        if (Boolean.TRUE.equals(participante.get("intimado"))) {
            linha.add(new Chunk(" (Intimado)", new Font(Font.HELVETICA, 8, Font.BOLD, Color.GREEN)));
        }
        linha.setSpacingAfter(2);
        return linha;
    }

    /**
     * Lê um campo textual da audiência com {@code N/A} como padrão.
     *
     * @param mapa  audiência ou participante
     * @param campo nome do campo
     * @return valor do campo, ou {@code N/A} se ausente
     */
    private static String valor(Map<String, Object> mapa, String campo) {
        Object v = mapa.get(campo);
        return v == null ? "N/A" : v.toString();
    }

    /**
     * Lê o nome de um objeto aninhado ({@code vara}, {@code juiz},
     * {@code promotor} ou {@code pessoa}).
     *
     * @param mapa  mapa que contém o objeto aninhado
     * @param campo nome do objeto aninhado
     * @return nome encontrado, ou {@code N/A}
     */
    private static String nomeAninhado(Map<String, Object> mapa, String campo) {
        Object aninhado = mapa.get(campo);
        if (aninhado instanceof Map<?, ?> m && m.get("nome") != null) {
            return m.get("nome").toString();
        }
        return "N/A";
    }

    /**
     * Traduz o código do tipo de participação para a descrição exibida
     * no PDF.
     *
     * @param tipo nome do enum {@code TipoParticipacao}
     * @return descrição em português
     */
    private static String descricaoTipoParticipacao(String tipo) {
        return switch (tipo) {
            case "AUTOR" -> "Autor";
            case "REU" -> "Réu";
            case "VITIMA" -> "Vítima";
            case "VITIMA_FATAL" -> "Vítima Fatal";
            case "REPRESENTANTE_LEGAL" -> "Representante Legal";
            case "TESTEMUNHA_COMUM" -> "Testemunha Comum";
            case "TESTEMUNHA_ACUSACAO" -> "Testemunha de Acusação";
            case "TESTEMUNHA_DEFESA" -> "Testemunha de Defesa";
            case "ASSISTENTE_ACUSACAO" -> "Assistente de Acusação";
            case "PERITO" -> "Perito";
            case "TERCEIRO" -> "Terceiro";
            case "OUTROS" -> "Outros";
            default -> tipo;
        };
    }
}
