package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.model.Audiencia;
import br.jus.tjsp.audiencias.model.ParticipacaoAudiencia;
import br.jus.tjsp.audiencias.model.RepresentacaoAdvogado;
import br.jus.tjsp.audiencias.repository.AudienciaRepository;
import br.jus.tjsp.audiencias.repository.ParticipacaoAudienciaRepository;
import br.jus.tjsp.audiencias.repository.RepresentacaoAdvogadoRepository;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPCell;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.awt.Color;

@Service
public class PautaServiceOpenPDF {

    private static final Logger logger = LoggerFactory.getLogger(PautaServiceOpenPDF.class);

    @Autowired
    private AudienciaRepository audienciaRepository;
    
    @Autowired
    private ParticipacaoAudienciaRepository participacaoRepository;
    
    @Autowired
    private RepresentacaoAdvogadoRepository representacaoRepository;

    public byte[] gerarPautaPDFOpenPDF(LocalDate data) throws Exception {
        logger.info("Iniciando geração de PDF com OpenPDF para a data: {}", data);
        
        try {
            List<Audiencia> audiencias = audienciaRepository.findByDataAudienciaOrderByHorarioInicio(data);
            logger.info("Encontradas {} audiências para a data {}", audiencias.size(), data);
            
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4);
            PdfWriter.getInstance(document, baos);
            document.open();

            logger.info("Documento PDF criado com sucesso usando OpenPDF");

            // Título
            Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD);
            Paragraph title = new Paragraph("TRIBUNAL DE JUSTIÇA DO ESTADO DE SÃO PAULO", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            // Subtítulo
            Font subtitleFont = new Font(Font.HELVETICA, 14, Font.BOLD);
            Paragraph subtitle = new Paragraph("PAUTA DE AUDIÊNCIAS", subtitleFont);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingBefore(10);
            document.add(subtitle);

            // Data
            Font dateFont = new Font(Font.HELVETICA, 12, Font.NORMAL);
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            Paragraph dateP = new Paragraph("Data: " + data.format(formatter), dateFont);
            dateP.setAlignment(Element.ALIGN_CENTER);
            dateP.setSpacingBefore(10);
            dateP.setSpacingAfter(20);
            document.add(dateP);

            if (audiencias.isEmpty()) {
                Paragraph noAudiencias = new Paragraph("Nenhuma audiência agendada para esta data.", dateFont);
                noAudiencias.setAlignment(Element.ALIGN_CENTER);
                noAudiencias.setSpacingBefore(50);
                document.add(noAudiencias);
                logger.info("Nenhuma audiência encontrada para a data");
            } else {
                logger.info("Adicionando {} audiências ao PDF", audiencias.size());
                
                // Novo layout: cada processo separado
                for (int i = 0; i < audiencias.size(); i++) {
                    Audiencia audiencia = audiencias.get(i);
                    addProcessoSection(document, audiencia, i + 1);
                    
                    // Adicionar espaço entre processos (exceto no último)
                    if (i < audiencias.size() - 1) {
                        document.add(new Paragraph(" ", new Font(Font.HELVETICA, 8, Font.NORMAL)));
                    }
                }
            }

            logger.info("Finalizando documento PDF");
            document.close();
            byte[] pdfBytes = baos.toByteArray();
            logger.info("PDF gerado com sucesso usando OpenPDF. Tamanho: {} bytes", pdfBytes.length);
            return pdfBytes;
            
        } catch (Exception e) {
            logger.error("Erro durante a geração do PDF com OpenPDF para a data {}: {}", data, e.getMessage(), e);
            throw e;
        }
    }
    
    private void addProcessoSection(Document document, Audiencia audiencia, int numeroSequencial) throws DocumentException {
        // Buscar participantes da audiência
        List<ParticipacaoAudiencia> participantes = participacaoRepository.findByAudienciaId(audiencia.getId());
        
        // Buscar representações de advogados para esta audiência
        List<RepresentacaoAdvogado> representacoes = representacaoRepository.findByAudienciaId(audiencia.getId());
        
        // Criar uma tabela para organizar as informações do processo
        PdfPTable processoTable = new PdfPTable(1);
        processoTable.setWidthPercentage(100);
        processoTable.setSpacingBefore(10);
        processoTable.setSpacingAfter(5);
        
        // Célula principal com borda
        PdfPCell mainCell = new PdfPCell();
        mainCell.setBorder(Rectangle.BOX);
        mainCell.setPadding(10);
        mainCell.setBackgroundColor(new Color(248, 249, 250)); // Cor de fundo suave
        
        // Conteúdo da célula
        StringBuilder content = new StringBuilder();
        
        // Cabeçalho destacado - Número do processo e horário
        Font headerFont = new Font(Font.HELVETICA, 14, Font.BOLD);
        Font timeFont = new Font(Font.HELVETICA, 12, Font.BOLD);
        Font labelFont = new Font(Font.HELVETICA, 10, Font.BOLD);
        Font valueFont = new Font(Font.HELVETICA, 10, Font.NORMAL);
        
        // Criar parágrafo com número do processo destacado
        Paragraph processoHeader = new Paragraph();
        processoHeader.add(new Chunk("PROCESSO Nº " + (audiencia.getNumeroProcesso() != null ? audiencia.getNumeroProcesso() : "N/A"), headerFont));
        processoHeader.add(new Chunk("     HORÁRIO: " + audiencia.getHorarioInicio().toString(), timeFont));
        processoHeader.setSpacingAfter(8);
        
        // Competência destacada
        Paragraph competencia = new Paragraph();
        competencia.add(new Chunk("COMPETÊNCIA: ", labelFont));
        competencia.add(new Chunk(audiencia.getCompetencia() != null ? audiencia.getCompetencia().toString() : "N/A", valueFont));
        competencia.setSpacingAfter(5);
        
        // Informações da audiência
        Paragraph infoAudiencia = new Paragraph();
        infoAudiencia.add(new Chunk("Tipo: ", labelFont));
        infoAudiencia.add(new Chunk(audiencia.getTipoAudiencia() != null ? audiencia.getTipoAudiencia().toString() : "N/A", valueFont));
        infoAudiencia.add(new Chunk("     Formato: ", labelFont));
        infoAudiencia.add(new Chunk(audiencia.getFormato() != null ? audiencia.getFormato().toString() : "N/A", valueFont));
        infoAudiencia.setSpacingAfter(5);
        
        // Vara e Juiz
        Paragraph varaJuiz = new Paragraph();
        varaJuiz.add(new Chunk("Vara: ", labelFont));
        varaJuiz.add(new Chunk(audiencia.getVara() != null ? audiencia.getVara().getNome() : "N/A", valueFont));
        varaJuiz.add(new Chunk("     Juiz: ", labelFont));
        varaJuiz.add(new Chunk(audiencia.getJuiz() != null ? audiencia.getJuiz().getNome() : "N/A", valueFont));
        varaJuiz.setSpacingAfter(5);
        
        // Promotor
        Paragraph promotor = new Paragraph();
        promotor.add(new Chunk("Promotor: ", labelFont));
        promotor.add(new Chunk(audiencia.getPromotor() != null ? audiencia.getPromotor().getNome() : "N/A", valueFont));
        promotor.setSpacingAfter(5);
        
        // Observações (se houver)
        Paragraph observacoes = null;
        if (audiencia.getObservacoes() != null && !audiencia.getObservacoes().trim().isEmpty()) {
            observacoes = new Paragraph();
            observacoes.add(new Chunk("Observações: ", labelFont));
            observacoes.add(new Chunk(audiencia.getObservacoes(), valueFont));
            observacoes.setSpacingAfter(8);
        }
        
        // Lista de participantes
        Paragraph participantesHeader = new Paragraph();
        participantesHeader.add(new Chunk("PARTICIPANTES:", labelFont));
        participantesHeader.setSpacingAfter(3);
        
        // Adicionar todos os elementos à célula
        mainCell.addElement(processoHeader);
        mainCell.addElement(competencia);
        mainCell.addElement(infoAudiencia);
        mainCell.addElement(varaJuiz);
        mainCell.addElement(promotor);
        
        if (observacoes != null) {
            mainCell.addElement(observacoes);
        }
        
        mainCell.addElement(participantesHeader);
        
        // Adicionar participantes
        if (participantes.isEmpty()) {
            Paragraph nenhumParticipante = new Paragraph("Nenhum participante cadastrado.", valueFont);
            nenhumParticipante.setIndentationLeft(10);
            mainCell.addElement(nenhumParticipante);
        } else {
            for (ParticipacaoAudiencia participante : participantes) {
                Paragraph participanteInfo = new Paragraph();
                participanteInfo.setIndentationLeft(10);
                participanteInfo.add(new Chunk("• ", valueFont));
                participanteInfo.add(new Chunk(participante.getPessoa().getNome(), valueFont));
                participanteInfo.add(new Chunk(" - ", valueFont));
                participanteInfo.add(new Chunk(getTipoParticipacaoDescricao(participante.getTipo().toString()), new Font(Font.HELVETICA, 9, Font.ITALIC)));
                
                // Buscar advogado do participante
                RepresentacaoAdvogado representacao = representacoes.stream()
                    .filter(r -> r.getCliente().getId().equals(participante.getPessoa().getId()))
                    .findFirst()
                    .orElse(null);
                
                if (representacao != null) {
                    participanteInfo.add(new Chunk(" | Advogado: ", new Font(Font.HELVETICA, 8, Font.BOLD)));
                    participanteInfo.add(new Chunk(representacao.getAdvogado().getNome(), new Font(Font.HELVETICA, 8, Font.NORMAL)));
                    participanteInfo.add(new Chunk(" (OAB: " + representacao.getAdvogado().getOab() + ")", new Font(Font.HELVETICA, 8, Font.NORMAL, Color.BLUE)));
                }
                
                if (participante.getIntimado()) {
                    participanteInfo.add(new Chunk(" (Intimado)", new Font(Font.HELVETICA, 8, Font.BOLD, Color.GREEN)));
                }
                
                participanteInfo.setSpacingAfter(2);
                mainCell.addElement(participanteInfo);
            }
        }
        
        processoTable.addCell(mainCell);
        document.add(processoTable);
    }
    
    private String getTipoParticipacaoDescricao(String tipo) {
        switch (tipo) {
            case "AUTOR": return "Autor";
            case "REU": return "Réu";
            case "VITIMA": return "Vítima";
            case "VITIMA_FATAL": return "Vítima Fatal";
            case "REPRESENTANTE_LEGAL": return "Representante Legal";
            case "TESTEMUNHA_COMUM": return "Testemunha Comum";
            case "TESTEMUNHA_ACUSACAO": return "Testemunha de Acusação";
            case "TESTEMUNHA_DEFESA": return "Testemunha de Defesa";
            case "ASSISTENTE_ACUSACAO": return "Assistente de Acusação";
            case "PERITO": return "Perito";
            case "TERCEIRO": return "Terceiro";
            case "OUTROS": return "Outros";
            default: return tipo;
        }
    }
}