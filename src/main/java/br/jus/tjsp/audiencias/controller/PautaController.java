package br.jus.tjsp.audiencias.controller;

import br.jus.tjsp.audiencias.service.PautaServiceOpenPDF;
import br.jus.tjsp.audiencias.service.PautaServiceMinimal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

@RestController
@RequestMapping("/pauta")
@CrossOrigin(origins = "http://localhost:3000")
public class PautaController {

    private static final Logger logger = LoggerFactory.getLogger(PautaController.class);

    @Autowired
    private PautaServiceOpenPDF pautaServiceOpenPDF;
    
    @Autowired
    private PautaServiceMinimal pautaServiceMinimal;

    @GetMapping("/pdf")
    public ResponseEntity<byte[]> gerarPautaPDF(@RequestParam String data) {
        logger.info("Recebida solicitação para gerar PDF para a data: {}", data);
        
        try {
            LocalDate dataAudiencia = LocalDate.parse(data);
            byte[] pdfBytes = pautaServiceOpenPDF.gerarPautaPDFOpenPDF(dataAudiencia);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("inline", "pauta-audiencias-" + data + ".pdf");
            
            logger.info("PDF gerado com sucesso para a data: {}", data);
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(pdfBytes);
                    
        } catch (Exception e) {
            logger.error("Erro ao gerar PDF da pauta para a data {}: {}", data, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/test")
    public ResponseEntity<String> testEndpoint() {
        logger.info("Endpoint de teste do PautaController chamado");
        return ResponseEntity.ok("PautaController is working!");
    }
    
    @GetMapping("/texto")
    public ResponseEntity<byte[]> gerarPautaTexto(@RequestParam String data) {
        logger.info("Recebida solicitação para gerar pauta em texto para a data: {}", data);
        
        try {
            logger.info("Tentando fazer parse da data: {}", data);
            LocalDate dataAudiencia = LocalDate.parse(data);
            logger.info("Parse da data realizado com sucesso: {}", dataAudiencia);
            
            logger.info("Chamando pautaServiceMinimal.gerarPautaTexto...");
            byte[] textoBytes = pautaServiceMinimal.gerarPautaTexto(dataAudiencia);
            logger.info("Serviço retornou {} bytes", textoBytes != null ? textoBytes.length : 0);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_PLAIN);
            headers.setContentDispositionFormData("attachment", "pauta_" + data + ".txt");
            
            logger.info("Texto gerado com sucesso para a data: {}", data);
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(textoBytes);
                    
        } catch (DateTimeParseException e) {
            logger.error("Erro ao fazer parse da data {}: {}", data, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            logger.error("Erro ao gerar texto da pauta para a data {}: {}", data, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/pdf-openpdf")
    public ResponseEntity<byte[]> gerarPautaPDFOpenPDF(@RequestParam String data) {
        logger.info("Recebida solicitação para gerar PDF com OpenPDF para a data: {}", data);
        
        try {
            LocalDate dataAudiencia = LocalDate.parse(data);
            byte[] pdfBytes = pautaServiceOpenPDF.gerarPautaPDFOpenPDF(dataAudiencia);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "pauta_" + data + "_openpdf.pdf");
            
            logger.info("PDF com OpenPDF gerado com sucesso para a data: {}", data);
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(pdfBytes);
                    
        } catch (Exception e) {
            logger.error("Erro ao gerar PDF com OpenPDF para a data {}: {}", data, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}