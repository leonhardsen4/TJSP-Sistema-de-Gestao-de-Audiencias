package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.config.Database;
import br.jus.tjsp.audiencias.model.enums.StatusMandado;
import br.jus.tjsp.audiencias.model.enums.TipoParticipacao;
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
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Gera o PDF da pauta de audiências usando OpenPDF.
 *
 * <p>A pauta é montada a partir dos mesmos filtros da tela de listagem
 * (período, vara, competência, status, tipo e busca textual), agrupada
 * por dia. Cada audiência aparece em um bloco com todos os seus dados e
 * uma tabela de participantes (papel, advogado, intimação, situação do
 * mandado e folha).</p>
 */
public class PautaPdfService {

    /** Datas exibidas no PDF sempre em formato brasileiro. */
    private static final DateTimeFormatter FORMATO_BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /** Data e hora de geração exibidas no rodapé do cabeçalho. */
    private static final DateTimeFormatter FORMATO_BR_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy 'às' HH:mm");

    /** Cor de fundo dos cabeçalhos de dia e das tabelas. */
    private static final Color COR_CABECALHO = new Color(230, 234, 240);

    /** Cor de fundo dos blocos de audiência. */
    private static final Color COR_BLOCO = new Color(248, 249, 250);

    /** Serviço usado para listar as audiências filtradas. */
    private final AudienciaService audienciaService;

    /** Serviço usado para listar os participantes de cada audiência. */
    private final ParticipacaoService participacaoService;

    /**
     * Cria o serviço de pauta.
     *
     * @param audienciaService    fonte das audiências
     * @param participacaoService fonte dos participantes de cada audiência
     */
    public PautaPdfService(AudienciaService audienciaService, ParticipacaoService participacaoService) {
        this.audienciaService = audienciaService;
        this.participacaoService = participacaoService;
    }

    /**
     * Gera o PDF da pauta de um único dia (compatibilidade com a rota antiga).
     *
     * @param data data da pauta
     * @return bytes do documento PDF
     */
    public byte[] gerarPautaPdf(LocalDate data) {
        return gerarPautaPdf(null, null, data.toString(), data.toString(), null, null, null);
    }

    /**
     * Gera o PDF simplificado de uma pauta cadastrada: o cabeçalho traz a
     * vara, o juiz, o promotor, a data e as observações uma única vez, e
     * os blocos das audiências ficam mais enxutos (sem repetir esses dados).
     *
     * @param pauta      pauta no formato de resposta da API (com {@code vara},
     *                   {@code juiz} e {@code promotor} aninhados)
     * @param audiencias audiências da pauta, ordenadas por horário
     * @return bytes do documento PDF
     */
    public byte[] gerarPdfDaPauta(Map<String, Object> pauta, List<Map<String, Object>> audiencias) {
        ByteArrayOutputStream saida = new ByteArrayOutputStream();
        Document documento = new Document(PageSize.A4, 36, 36, 36, 36);
        PdfWriter.getInstance(documento, saida);
        documento.open();

        Paragraph titulo = new Paragraph("TRIBUNAL DE JUSTIÇA DO ESTADO DE SÃO PAULO",
                new Font(Font.HELVETICA, 16, Font.BOLD));
        titulo.setAlignment(Element.ALIGN_CENTER);
        documento.add(titulo);

        Paragraph comarca = new Paragraph("Comarca de Cotia", new Font(Font.HELVETICA, 11, Font.NORMAL));
        comarca.setAlignment(Element.ALIGN_CENTER);
        documento.add(comarca);

        LocalDate data = LocalDate.parse(String.valueOf(pauta.get("data")));
        Paragraph subtitulo = new Paragraph("PAUTA DE AUDIÊNCIAS — " + data.format(FORMATO_BR),
                new Font(Font.HELVETICA, 14, Font.BOLD));
        subtitulo.setAlignment(Element.ALIGN_CENTER);
        subtitulo.setSpacingBefore(8);
        documento.add(subtitulo);

        // Cabeçalho único da pauta: vara, juiz e promotor valem para todas
        // as audiências (vínculo rígido).
        PdfPTable cabecalho = new PdfPTable(1);
        cabecalho.setWidthPercentage(100);
        cabecalho.setSpacingBefore(10);
        PdfPCell celulaCabecalho = new PdfPCell();
        celulaCabecalho.setBackgroundColor(COR_CABECALHO);
        celulaCabecalho.setPadding(8);
        Font fonteRotulo = new Font(Font.HELVETICA, 10, Font.BOLD);
        Font fonteValor = new Font(Font.HELVETICA, 10, Font.NORMAL);
        celulaCabecalho.addElement(linhaRotulos(fonteRotulo, fonteValor,
                "Vara: ", nomeAninhado(pauta, "vara"),
                "Juiz: ", nomeAninhado(pauta, "juiz"),
                "Promotor: ", nomeAninhado(pauta, "promotor")));
        Object observacoesPauta = pauta.get("observacoes");
        if (observacoesPauta != null && !observacoesPauta.toString().isBlank()) {
            celulaCabecalho.addElement(linhaRotulos(fonteRotulo, fonteValor,
                    "Observações: ", observacoesPauta.toString()));
        }
        cabecalho.addCell(celulaCabecalho);
        documento.add(cabecalho);

        Paragraph resumo = new Paragraph(audiencias.size() + " audiência(s)   |   Gerada em "
                + LocalDateTime.now().format(FORMATO_BR_HORA),
                new Font(Font.HELVETICA, 9, Font.ITALIC, Color.DARK_GRAY));
        resumo.setAlignment(Element.ALIGN_CENTER);
        resumo.setSpacingBefore(4);
        resumo.setSpacingAfter(8);
        documento.add(resumo);

        if (audiencias.isEmpty()) {
            Paragraph vazio = new Paragraph("Nenhuma audiência cadastrada nesta pauta.",
                    new Font(Font.HELVETICA, 12, Font.NORMAL));
            vazio.setAlignment(Element.ALIGN_CENTER);
            vazio.setSpacingBefore(30);
            documento.add(vazio);
        } else {
            for (Map<String, Object> audiencia : audiencias) {
                adicionarBlocoProcessoSimplificado(documento, audiencia);
            }
        }

        documento.close();
        return saida.toByteArray();
    }

    /**
     * Adiciona o bloco enxuto de uma audiência da pauta: horário em
     * destaque, processo, classificação, artigo, marcadores, observações e
     * participantes — sem repetir vara, juiz e promotor (que estão no
     * cabeçalho da pauta).
     *
     * @param documento documento em construção
     * @param audiencia audiência no formato de resposta da API
     */
    private void adicionarBlocoProcessoSimplificado(Document documento, Map<String, Object> audiencia) {
        PdfPTable tabela = new PdfPTable(1);
        tabela.setWidthPercentage(100);
        tabela.setSpacingBefore(6);
        tabela.setKeepTogether(true);

        PdfPCell celula = new PdfPCell();
        celula.setBorder(Rectangle.BOX);
        celula.setPadding(8);
        celula.setBackgroundColor(COR_BLOCO);

        Font fonteCabecalho = new Font(Font.HELVETICA, 12, Font.BOLD);
        Font fonteRotulo = new Font(Font.HELVETICA, 9, Font.BOLD);
        Font fonteValor = new Font(Font.HELVETICA, 9, Font.NORMAL);

        Paragraph cabecalho = new Paragraph();
        cabecalho.add(new Chunk(valor(audiencia, "horarioInicio") + " - " + valor(audiencia, "horarioFim"),
                new Font(Font.HELVETICA, 12, Font.BOLD, new Color(0, 60, 130))));
        cabecalho.add(new Chunk("      PROCESSO " + valor(audiencia, "numeroProcesso"), fonteCabecalho));
        cabecalho.setSpacingAfter(5);
        celula.addElement(cabecalho);

        celula.addElement(linhaRotulos(fonteRotulo, fonteValor,
                "Tipo: ", legivel(valor(audiencia, "tipoAudiencia")),
                "Formato: ", legivel(valor(audiencia, "formato")),
                "Competência: ", legivel(valor(audiencia, "competencia")),
                "Status: ", legivel(valor(audiencia, "status"))));

        adicionarLinhaPecas(celula, audiencia, fonteRotulo, fonteValor);

        Object artigo = audiencia.get("artigo");
        List<String> marcadores = marcadoresEspeciais(audiencia);
        if ((artigo != null && !artigo.toString().isBlank()) || !marcadores.isEmpty()) {
            Paragraph extras = new Paragraph();
            if (artigo != null && !artigo.toString().isBlank()) {
                extras.add(new Chunk("Artigo: ", fonteRotulo));
                extras.add(new Chunk(artigo + "   ", fonteValor));
            }
            if (!marcadores.isEmpty()) {
                extras.add(new Chunk(String.join("   ", marcadores),
                        new Font(Font.HELVETICA, 9, Font.BOLD, new Color(160, 30, 30))));
            }
            extras.setSpacingAfter(3);
            celula.addElement(extras);
        }

        Object observacoes = audiencia.get("observacoes");
        if (observacoes != null && !observacoes.toString().isBlank()) {
            Paragraph obs = new Paragraph();
            obs.add(new Chunk("Observações: ", fonteRotulo));
            obs.add(new Chunk(observacoes.toString(), fonteValor));
            obs.setSpacingAfter(5);
            celula.addElement(obs);
        }

        celula.addElement(tabelaParticipantes(((Number) audiencia.get("id")).longValue()));

        tabela.addCell(celula);
        documento.add(tabela);
    }

    /**
     * Gera o PDF da pauta com os filtros da tela de listagem.
     *
     * @param competencia   competência das audiências (opcional)
     * @param varaId        vara das audiências (opcional)
     * @param dataInicio    primeira data do período (opcional)
     * @param dataFim       última data do período (opcional)
     * @param status        status das audiências (opcional)
     * @param tipoAudiencia tipo das audiências (opcional)
     * @param texto         busca textual em processo/artigo/observações (opcional)
     * @return bytes do documento PDF
     */
    public byte[] gerarPautaPdf(String competencia, String varaId, String dataInicio, String dataFim,
                                String status, String tipoAudiencia, String texto) {
        List<Map<String, Object>> audiencias =
                audienciaService.listar(competencia, varaId, dataInicio, dataFim, status, tipoAudiencia, texto);

        ByteArrayOutputStream saida = new ByteArrayOutputStream();
        Document documento = new Document(PageSize.A4, 36, 36, 36, 36);
        PdfWriter.getInstance(documento, saida);
        documento.open();

        adicionarCabecalho(documento, competencia, varaId, dataInicio, dataFim, status, tipoAudiencia,
                texto, audiencias.size());

        if (audiencias.isEmpty()) {
            Paragraph vazio = new Paragraph("Nenhuma audiência encontrada para os filtros informados.",
                    new Font(Font.HELVETICA, 12, Font.NORMAL));
            vazio.setAlignment(Element.ALIGN_CENTER);
            vazio.setSpacingBefore(50);
            documento.add(vazio);
        } else {
            String diaAnterior = null;
            for (Map<String, Object> audiencia : audiencias) {
                String dia = String.valueOf(audiencia.get("dataAudiencia"));
                if (!dia.equals(diaAnterior)) {
                    adicionarCabecalhoDia(documento, audiencia);
                    diaAnterior = dia;
                }
                adicionarBlocoProcesso(documento, audiencia);
            }
        }

        documento.close();
        return saida.toByteArray();
    }

    /**
     * Adiciona o cabeçalho do documento: títulos, período, filtros
     * aplicados e total de audiências.
     *
     * @param documento     documento em construção
     * @param competencia   filtro de competência
     * @param varaId        filtro de vara
     * @param dataInicio    início do período
     * @param dataFim       fim do período
     * @param status        filtro de status
     * @param tipoAudiencia filtro de tipo
     * @param texto         filtro de busca textual
     * @param total         quantidade de audiências no resultado
     */
    private void adicionarCabecalho(Document documento, String competencia, String varaId, String dataInicio,
                                    String dataFim, String status, String tipoAudiencia, String texto, int total) {
        Paragraph titulo = new Paragraph("TRIBUNAL DE JUSTIÇA DO ESTADO DE SÃO PAULO",
                new Font(Font.HELVETICA, 16, Font.BOLD));
        titulo.setAlignment(Element.ALIGN_CENTER);
        documento.add(titulo);

        Paragraph comarca = new Paragraph("Comarca de Cotia", new Font(Font.HELVETICA, 11, Font.NORMAL));
        comarca.setAlignment(Element.ALIGN_CENTER);
        documento.add(comarca);

        Paragraph subtitulo = new Paragraph("PAUTA DE AUDIÊNCIAS", new Font(Font.HELVETICA, 14, Font.BOLD));
        subtitulo.setAlignment(Element.ALIGN_CENTER);
        subtitulo.setSpacingBefore(8);
        documento.add(subtitulo);

        List<String> filtros = new ArrayList<>();
        filtros.add(descricaoPeriodo(dataInicio, dataFim));
        if (naoVazio(varaId)) {
            filtros.add("Vara: " + nomeDaVara(varaId));
        }
        if (naoVazio(competencia)) {
            filtros.add("Competência: " + legivel(competencia));
        }
        if (naoVazio(status)) {
            filtros.add("Status: " + legivel(status));
        }
        if (naoVazio(tipoAudiencia)) {
            filtros.add("Tipo: " + legivel(tipoAudiencia));
        }
        if (naoVazio(texto)) {
            filtros.add("Busca: \"" + texto.strip() + "\"");
        }

        Paragraph linhaFiltros = new Paragraph(String.join("   |   ", filtros),
                new Font(Font.HELVETICA, 10, Font.NORMAL));
        linhaFiltros.setAlignment(Element.ALIGN_CENTER);
        linhaFiltros.setSpacingBefore(6);
        documento.add(linhaFiltros);

        Paragraph rodape = new Paragraph(total + " audiência(s)   |   Gerada em "
                + LocalDateTime.now().format(FORMATO_BR_HORA),
                new Font(Font.HELVETICA, 9, Font.ITALIC, Color.DARK_GRAY));
        rodape.setAlignment(Element.ALIGN_CENTER);
        rodape.setSpacingBefore(4);
        rodape.setSpacingAfter(12);
        documento.add(rodape);
    }

    /**
     * Adiciona a faixa que separa as audiências de um dia, com a data
     * em formato brasileiro e o dia da semana.
     *
     * @param documento documento em construção
     * @param audiencia primeira audiência do dia (fonte da data)
     */
    private void adicionarCabecalhoDia(Document documento, Map<String, Object> audiencia) {
        LocalDate data = LocalDate.parse(String.valueOf(audiencia.get("dataAudiencia")));
        String diaSemana = String.valueOf(audiencia.getOrDefault("diaSemana", ""));

        PdfPTable faixa = new PdfPTable(1);
        faixa.setWidthPercentage(100);
        faixa.setSpacingBefore(10);
        PdfPCell celula = new PdfPCell(new Paragraph(
                data.format(FORMATO_BR) + (diaSemana.isBlank() ? "" : "  —  " + diaSemana.toUpperCase()),
                new Font(Font.HELVETICA, 12, Font.BOLD)));
        celula.setBackgroundColor(COR_CABECALHO);
        celula.setPadding(6);
        celula.setBorder(Rectangle.BOX);
        faixa.addCell(celula);
        documento.add(faixa);
    }

    /**
     * Adiciona ao documento o bloco de uma audiência, com moldura e fundo
     * suave, contendo os dados do processo e a tabela de participantes.
     *
     * @param documento documento em construção
     * @param audiencia audiência no formato de resposta da API
     */
    private void adicionarBlocoProcesso(Document documento, Map<String, Object> audiencia) {
        PdfPTable tabela = new PdfPTable(1);
        tabela.setWidthPercentage(100);
        tabela.setSpacingBefore(6);
        tabela.setKeepTogether(true);

        PdfPCell celula = new PdfPCell();
        celula.setBorder(Rectangle.BOX);
        celula.setPadding(8);
        celula.setBackgroundColor(COR_BLOCO);

        Font fonteCabecalho = new Font(Font.HELVETICA, 12, Font.BOLD);
        Font fonteRotulo = new Font(Font.HELVETICA, 9, Font.BOLD);
        Font fonteValor = new Font(Font.HELVETICA, 9, Font.NORMAL);

        Paragraph cabecalho = new Paragraph();
        cabecalho.add(new Chunk("PROCESSO " + valor(audiencia, "numeroProcesso"), fonteCabecalho));
        cabecalho.add(new Chunk("      " + valor(audiencia, "horarioInicio") + " - "
                + valor(audiencia, "horarioFim"), new Font(Font.HELVETICA, 11, Font.BOLD, new Color(0, 60, 130))));
        cabecalho.setSpacingAfter(5);
        celula.addElement(cabecalho);

        celula.addElement(linhaRotulos(fonteRotulo, fonteValor,
                "Tipo: ", legivel(valor(audiencia, "tipoAudiencia")),
                "Formato: ", legivel(valor(audiencia, "formato")),
                "Competência: ", legivel(valor(audiencia, "competencia")),
                "Status: ", legivel(valor(audiencia, "status"))));

        celula.addElement(linhaRotulos(fonteRotulo, fonteValor,
                "Vara: ", nomeAninhado(audiencia, "vara"),
                "Juiz: ", nomeAninhado(audiencia, "juiz"),
                "Promotor: ", nomeAninhado(audiencia, "promotor")));

        adicionarLinhaPecas(celula, audiencia, fonteRotulo, fonteValor);

        Object artigo = audiencia.get("artigo");
        List<String> marcadores = marcadoresEspeciais(audiencia);
        if ((artigo != null && !artigo.toString().isBlank()) || !marcadores.isEmpty()) {
            Paragraph extras = new Paragraph();
            if (artigo != null && !artigo.toString().isBlank()) {
                extras.add(new Chunk("Artigo: ", fonteRotulo));
                extras.add(new Chunk(artigo + "   ", fonteValor));
            }
            if (!marcadores.isEmpty()) {
                extras.add(new Chunk(String.join("   ", marcadores),
                        new Font(Font.HELVETICA, 9, Font.BOLD, new Color(160, 30, 30))));
            }
            extras.setSpacingAfter(3);
            celula.addElement(extras);
        }

        Object observacoes = audiencia.get("observacoes");
        if (observacoes != null && !observacoes.toString().isBlank()) {
            Paragraph obs = new Paragraph();
            obs.add(new Chunk("Observações: ", fonteRotulo));
            obs.add(new Chunk(observacoes.toString(), fonteValor));
            obs.setSpacingAfter(5);
            celula.addElement(obs);
        }

        celula.addElement(tabelaParticipantes(((Number) audiencia.get("id")).longValue()));

        tabela.addCell(celula);
        documento.add(tabela);
    }

    /**
     * Monta uma linha "Rótulo: valor" com vários pares separados por espaços.
     *
     * @param fonteRotulo fonte dos rótulos
     * @param fonteValor  fonte dos valores
     * @param pares       sequência alternada rótulo, valor, rótulo, valor...
     * @return parágrafo pronto para o bloco
     */
    private Paragraph linhaRotulos(Font fonteRotulo, Font fonteValor, String... pares) {
        Paragraph linha = new Paragraph();
        for (int i = 0; i < pares.length; i += 2) {
            if (i > 0) {
                linha.add(new Chunk("   ", fonteValor));
            }
            linha.add(new Chunk(pares[i], fonteRotulo));
            linha.add(new Chunk(pares[i + 1], fonteValor));
        }
        linha.setSpacingAfter(3);
        return linha;
    }

    /**
     * Descreve as peças importantes marcadas na audiência (defesa prévia,
     * FA/CDC e laudo), com a folha onde se encontram.
     *
     * @param audiencia audiência no formato da API
     * @return texto como "Defesa Prévia (FLS. 30) · Laudo (FLS. 55)", ou vazio
     */
    private static String descricaoPecas(Map<String, Object> audiencia) {
        List<String> pecas = new ArrayList<>();
        adicionarPeca(pecas, audiencia, "defesaPrevia", "defesaPreviaFolha", "Defesa Prévia");
        adicionarPeca(pecas, audiencia, "faCdc", "faCdcFolha", "FA/CDC");
        adicionarPeca(pecas, audiencia, "laudo", "laudoFolha", "Laudo");
        return String.join("  ·  ", pecas);
    }

    /**
     * Acrescenta uma peça à lista quando estiver marcada na audiência.
     *
     * @param pecas      lista em construção
     * @param audiencia  audiência no formato da API
     * @param campoFlag  campo booleano da peça
     * @param campoFolha campo com a folha da peça
     * @param rotulo     nome exibido da peça
     */
    private static void adicionarPeca(List<String> pecas, Map<String, Object> audiencia,
                                      String campoFlag, String campoFolha, String rotulo) {
        if (Boolean.TRUE.equals(audiencia.get(campoFlag))) {
            Object folha = audiencia.get(campoFolha);
            pecas.add(rotulo + (folha == null || folha.toString().isBlank() ? "" : " (" + folha + ")"));
        }
    }

    /**
     * Adiciona ao bloco a linha de peças do processo, quando houver.
     *
     * @param celula     célula do bloco da audiência
     * @param audiencia  audiência no formato da API
     * @param fonteRotulo fonte dos rótulos
     * @param fonteValor  fonte dos valores
     */
    private void adicionarLinhaPecas(PdfPCell celula, Map<String, Object> audiencia,
                                     Font fonteRotulo, Font fonteValor) {
        String pecas = descricaoPecas(audiencia);
        if (!pecas.isEmpty()) {
            Paragraph linha = new Paragraph();
            linha.add(new Chunk("Peças: ", fonteRotulo));
            linha.add(new Chunk(pecas, fonteValor));
            linha.setSpacingAfter(3);
            celula.addElement(linha);
        }
    }

    /**
     * Monta a tabela de participantes de uma audiência com papel, advogado,
     * intimação, situação do mandado e folha.
     *
     * @param audienciaId id da audiência
     * @return tabela pronta para inclusão no bloco, ou aviso se não houver participantes
     */
    private Element tabelaParticipantes(long audienciaId) {
        List<Map<String, Object>> participantes = participacaoService.listar(audienciaId);
        if (participantes.isEmpty()) {
            Paragraph nenhum = new Paragraph("Nenhum participante cadastrado.",
                    new Font(Font.HELVETICA, 9, Font.ITALIC, new Color(160, 30, 30)));
            nenhum.setSpacingBefore(3);
            return nenhum;
        }

        PdfPTable tabela = new PdfPTable(new float[]{28, 15, 22, 9, 17, 9});
        tabela.setWidthPercentage(100);
        tabela.setSpacingBefore(4);

        Font fonteTitulo = new Font(Font.HELVETICA, 8, Font.BOLD);
        for (String titulo : new String[]{"Participante", "Papel", "Advogado", "Intimado", "Mandado", "Fls."}) {
            PdfPCell cabecalho = new PdfPCell(new Paragraph(titulo, fonteTitulo));
            cabecalho.setBackgroundColor(COR_CABECALHO);
            cabecalho.setPadding(4);
            tabela.addCell(cabecalho);
        }

        Font fonteCelula = new Font(Font.HELVETICA, 8, Font.NORMAL);
        for (Map<String, Object> p : participantes) {
            // Participante preso: nome acompanhado do local de prisão.
            String nome = nomeAninhado(p, "pessoa");
            if (Boolean.TRUE.equals(p.get("preso"))) {
                Object local = p.get("localPrisao");
                nome += "\nPRESO" + (local == null || local.toString().isBlank() ? "" : " - " + local);
            }
            tabela.addCell(celulaTexto(nome, fonteCelula));
            tabela.addCell(celulaTexto(descricaoTipoParticipacao(String.valueOf(p.get("tipo"))), fonteCelula));
            tabela.addCell(celulaTexto(descricaoAdvogado(p), fonteCelula));
            boolean intimado = Boolean.TRUE.equals(p.get("intimado"));
            tabela.addCell(celulaTexto(intimado ? "Sim" : "NÃO",
                    new Font(Font.HELVETICA, 8, Font.BOLD,
                            intimado ? new Color(20, 110, 40) : new Color(160, 30, 30))));
            tabela.addCell(celulaTexto(descricaoStatusMandado(p.get("statusMandado")), fonteCelula));
            Object folha = p.get("folhaIntimacao");
            tabela.addCell(celulaTexto(folha == null ? "-" : folha.toString(), fonteCelula));
        }
        return tabela;
    }

    /**
     * Cria uma célula simples de tabela com o texto e a fonte informados.
     *
     * @param texto conteúdo da célula
     * @param fonte fonte do texto
     * @return célula com padding padrão
     */
    private PdfPCell celulaTexto(String texto, Font fonte) {
        PdfPCell celula = new PdfPCell(new Paragraph(texto, fonte));
        celula.setPadding(3);
        return celula;
    }

    /**
     * Descreve o advogado do participante (nome e OAB), se houver.
     *
     * @param participante participante no formato da API
     * @return texto "NOME (OAB xxx)" ou "-"
     */
    private static String descricaoAdvogado(Map<String, Object> participante) {
        Object representacao = participante.get("representacao");
        if (representacao instanceof Map<?, ?> repr && repr.get("advogado") instanceof Map<?, ?> adv) {
            return adv.get("nome") + " (OAB " + adv.get("oab") + ")";
        }
        return "-";
    }

    /**
     * Lista os marcadores especiais da audiência (réu preso, reconhecimento
     * e depoimento especial). O agendamento no Teams é controle interno e
     * não é impresso na pauta.
     *
     * @param audiencia audiência no formato da API
     * @return marcadores presentes, possivelmente vazio
     */
    private static List<String> marcadoresEspeciais(Map<String, Object> audiencia) {
        List<String> marcadores = new ArrayList<>();
        if (Boolean.TRUE.equals(audiencia.get("reuPreso"))) {
            marcadores.add("RÉU PRESO");
        }
        if (Boolean.TRUE.equals(audiencia.get("reconhecimento"))) {
            marcadores.add("RECONHECIMENTO");
        }
        if (Boolean.TRUE.equals(audiencia.get("depoimentoEspecial"))) {
            marcadores.add("DEPOIMENTO ESPECIAL");
        }
        return marcadores;
    }

    /**
     * Descreve o período coberto pela pauta.
     *
     * @param dataInicio primeira data (opcional)
     * @param dataFim    última data (opcional)
     * @return texto do período em formato brasileiro
     */
    private static String descricaoPeriodo(String dataInicio, String dataFim) {
        if (naoVazio(dataInicio) && naoVazio(dataFim)) {
            LocalDate inicio = AudienciaService.parseData(dataInicio);
            LocalDate fim = AudienciaService.parseData(dataFim);
            if (inicio.equals(fim)) {
                return "Data: " + inicio.format(FORMATO_BR);
            }
            return "Período: " + inicio.format(FORMATO_BR) + " a " + fim.format(FORMATO_BR);
        }
        if (naoVazio(dataInicio)) {
            return "A partir de " + AudienciaService.parseData(dataInicio).format(FORMATO_BR);
        }
        if (naoVazio(dataFim)) {
            return "Até " + AudienciaService.parseData(dataFim).format(FORMATO_BR);
        }
        return "Todas as datas";
    }

    /**
     * Busca o nome de uma vara pelo id para exibição no cabeçalho.
     *
     * @param varaId id da vara em texto
     * @return nome da vara, ou o próprio id se não encontrada
     */
    private static String nomeDaVara(String varaId) {
        return Database.queryOne("SELECT nome FROM vara WHERE id = ?",
                rs -> rs.getString("nome"), Long.parseLong(varaId)).orElse("id " + varaId);
    }

    /**
     * Converte um código de enum ({@code VIOLENCIA_DOMESTICA}) em texto
     * legível ({@code Violencia Domestica}).
     *
     * @param codigo nome do enum
     * @return texto com iniciais maiúsculas e espaços
     */
    private static String legivel(String codigo) {
        if (codigo == null || codigo.isBlank() || "N/A".equals(codigo)) {
            return "N/A";
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
     * Traduz o código do tipo de participação para a descrição do enum.
     *
     * @param tipo nome do enum {@code TipoParticipacao}
     * @return descrição em português, ou o próprio código se desconhecido
     */
    private static String descricaoTipoParticipacao(String tipo) {
        try {
            return TipoParticipacao.valueOf(tipo).getDescricao();
        } catch (IllegalArgumentException | NullPointerException e) {
            return tipo;
        }
    }

    /**
     * Traduz o código da situação do mandado para a descrição do enum.
     *
     * @param status nome do enum {@code StatusMandado}
     * @return descrição em português, ou {@code "-"} se ausente
     */
    private static String descricaoStatusMandado(Object status) {
        if (status == null) {
            return "-";
        }
        try {
            return StatusMandado.valueOf(status.toString()).getDescricao();
        } catch (IllegalArgumentException e) {
            return status.toString();
        }
    }

    /**
     * Verifica se um parâmetro de filtro foi informado.
     *
     * @param valor valor do parâmetro
     * @return {@code true} se não for nulo nem vazio
     */
    private static boolean naoVazio(String valor) {
        return valor != null && !valor.isBlank();
    }
}
