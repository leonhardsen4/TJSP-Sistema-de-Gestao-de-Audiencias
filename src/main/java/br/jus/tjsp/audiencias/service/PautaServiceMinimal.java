package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.model.Audiencia;
import br.jus.tjsp.audiencias.repository.AudienciaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@Transactional
public class PautaServiceMinimal {

    private static final Logger logger = LoggerFactory.getLogger(PautaServiceMinimal.class);

    @Autowired
    private AudienciaRepository audienciaRepository;

    public byte[] gerarPautaTexto(LocalDate data) throws Exception {
        logger.info("Iniciando geração de pauta em texto para a data: {}", data);
        
        try {
            logger.info("Buscando audiências no repositório...");
            List<Audiencia> audiencias = audienciaRepository.findByDataAudienciaOrderByHorarioInicio(data);
            logger.info("Encontradas {} audiências para a data {}", audiencias.size(), data);
            
            StringBuilder texto = new StringBuilder();
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            
            logger.info("Construindo cabeçalho do texto...");
            texto.append("TRIBUNAL DE JUSTIÇA DO ESTADO DE SÃO PAULO\n");
            texto.append("PAUTA DE AUDIÊNCIAS\n");
            texto.append("Data: ").append(data.format(formatter)).append("\n\n");
            
            if (audiencias.isEmpty()) {
                texto.append("Nenhuma audiência agendada para esta data.\n");
                logger.info("Nenhuma audiência encontrada para a data");
            } else {
                logger.info("Adicionando {} audiências ao texto", audiencias.size());
                
                texto.append("HORÁRIO | PROCESSO | VARA | JUIZ | TIPO\n");
                texto.append("--------|----------|------|------|-----\n");
                
                for (int i = 0; i < audiencias.size(); i++) {
                    Audiencia audiencia = audiencias.get(i);
                    try {
                        logger.debug("Processando audiência {}/{} - ID: {}", i+1, audiencias.size(), audiencia.getId());
                        
                        String horario = "";
                        try {
                            horario = audiencia.getHorarioInicio() != null ? audiencia.getHorarioInicio().toString() : "";
                            logger.debug("Horário obtido: {}", horario);
                        } catch (Exception e) {
                            logger.error("Erro ao obter horário: {}", e.getMessage());
                            horario = "N/A";
                        }
                        
                        String processo = "";
                        try {
                            processo = audiencia.getNumeroProcesso() != null ? audiencia.getNumeroProcesso() : "";
                            logger.debug("Processo obtido: {}", processo);
                        } catch (Exception e) {
                            logger.error("Erro ao obter processo: {}", e.getMessage());
                            processo = "N/A";
                        }
                        
                        String vara = "N/A";
                        String juiz = "N/A";
                        String tipo = "";
                        
                        // Acessar vara com tratamento de erro
                        try {
                            if (audiencia.getVara() != null) {
                                vara = audiencia.getVara().getNome() != null ? audiencia.getVara().getNome() : "N/A";
                                logger.debug("Vara obtida: {}", vara);
                            }
                        } catch (Exception e) {
                            logger.error("Erro ao obter vara: {}", e.getMessage());
                            vara = "N/A";
                        }
                        
                        // Acessar juiz com tratamento de erro
                        try {
                            if (audiencia.getJuiz() != null) {
                                juiz = audiencia.getJuiz().getNome() != null ? audiencia.getJuiz().getNome() : "N/A";
                                logger.debug("Juiz obtido: {}", juiz);
                            }
                        } catch (Exception e) {
                            logger.error("Erro ao obter juiz: {}", e.getMessage());
                            juiz = "N/A";
                        }
                        
                        // Acessar tipo com tratamento de erro
                        try {
                            if (audiencia.getTipoAudiencia() != null) {
                                tipo = audiencia.getTipoAudiencia().toString();
                                logger.debug("Tipo obtido: {}", tipo);
                            }
                        } catch (Exception e) {
                            logger.error("Erro ao obter tipo: {}", e.getMessage());
                            tipo = "N/A";
                        }
                        
                        texto.append(String.format("%-8s | %-8s | %-4s | %-4s | %-4s\n",
                            horario, processo, vara, juiz, tipo));
                            
                        logger.debug("Audiência processada com sucesso: {}", audiencia.getId());
                            
                    } catch (Exception e) {
                        logger.error("Erro ao processar audiência {}: {}", audiencia.getId(), e.getMessage(), e);
                        texto.append("Erro ao processar audiência\n");
                    }
                }
            }

            logger.info("Finalizando geração de texto...");
            try {
                byte[] textoBytes = texto.toString().getBytes("UTF-8");
                logger.info("Texto gerado com sucesso. Tamanho: {} bytes", textoBytes.length);
                return textoBytes;
            } catch (Exception e) {
                logger.error("Erro ao converter texto para bytes: {}", e.getMessage(), e);
                throw e;
            }
            
        } catch (Exception e) {
            logger.error("Erro durante a geração do texto para a data {}: {}", data, e.getMessage(), e);
            throw e;
        }
    }
}