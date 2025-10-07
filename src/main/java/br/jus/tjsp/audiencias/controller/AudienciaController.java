package br.jus.tjsp.audiencias.controller;

import br.jus.tjsp.audiencias.dto.AudienciaDTO;
import br.jus.tjsp.audiencias.model.Audiencia;
import br.jus.tjsp.audiencias.model.enums.Competencia;
import br.jus.tjsp.audiencias.model.enums.FormatoAudiencia;
import br.jus.tjsp.audiencias.model.enums.StatusAudiencia;
import br.jus.tjsp.audiencias.model.enums.TipoAudiencia;
import br.jus.tjsp.audiencias.repository.AudienciaRepository;
import br.jus.tjsp.audiencias.service.AudienciaService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/audiencias")
@CrossOrigin(origins = "http://localhost:3000")
public class AudienciaController {

    private static final Logger logger = LoggerFactory.getLogger(AudienciaController.class);
    
    private final AudienciaService audienciaService;
    private final AudienciaRepository audienciaRepository;

    @Autowired
    public AudienciaController(AudienciaService audienciaService, AudienciaRepository audienciaRepository) {
        this.audienciaService = audienciaService;
        this.audienciaRepository = audienciaRepository;
    }

    @GetMapping("/raw-data")
    public ResponseEntity<?> listarRaw() {
        try {
            logger.info("Tentando buscar audiências usando consulta SQL nativa");
            List<Object[]> rawData = audienciaService.buscarDadosNativos();
            logger.info("Consulta SQL nativa executada com sucesso. Registros encontrados: {}", rawData.size());
            return ResponseEntity.ok(rawData);
        } catch (Exception e) {
            logger.error("Erro ao executar consulta SQL nativa: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erro ao buscar dados: " + e.getMessage());
        }
    }

    @GetMapping("/teste")
    public ResponseEntity<String> teste() {
        return ResponseEntity.ok("Endpoint funcionando!");
    }
    
    @GetMapping("/test")
    public ResponseEntity<String> testEndpoint() {
        try {
            // Simple string response without any entity serialization
            return ResponseEntity.ok("Backend is working! Current time: " + java.time.LocalDateTime.now());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/por-competencia")
    public ResponseEntity<List<Map<String, Object>>> listarPorCompetencia(
            @RequestParam(required = false) String competencia) {
        try {
            List<Object[]> resultados;
            
            if (competencia != null && !competencia.trim().isEmpty()) {
                resultados = audienciaService.buscarPorCompetenciaNativo(competencia.toUpperCase());
            } else {
                resultados = audienciaService.buscarDadosNativos();
            }
            
            List<Map<String, Object>> lista = resultados.stream()
                .map(row -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", row[0]);
                    item.put("numeroProcesso", row[1]);
                    item.put("dataAudiencia", row[2] != null ? row[2].toString() : null);
                    item.put("horarioInicio", row[3] != null ? row[3].toString() : null);
                    item.put("duracao", row[4]);
                    item.put("tipoAudiencia", row[5] != null ? row[5].toString() : null);
                    item.put("formato", row[6] != null ? row[6].toString() : null);
                    item.put("competencia", row[7] != null ? row[7].toString() : null);
                    item.put("status", row[8] != null ? row[8].toString() : null);
                    return item;
                })
                .collect(Collectors.toList());
                
            return ResponseEntity.ok(lista);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Erro ao listar audiências por competência");
            error.put("message", e.getMessage());
            error.put("class", e.getClass().getSimpleName());
            return ResponseEntity.status(500).body(List.of(error));
        }
    }
    
    @GetMapping("/count")
    public ResponseEntity<?> contarAudiencias() {
        try {
            long count = audienciaService.contarAudiencias();
            return ResponseEntity.ok(Map.of("count", count));
        } catch (Exception e) {
            logger.error("Erro ao contar audiências", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/simple")
    public ResponseEntity<?> listarSimples() {
        try {
            // Use native SQL to avoid JPA entity loading issues
            List<Object[]> rawData = audienciaRepository.findDadosNativos();
            List<Map<String, Object>> result = rawData.stream()
                    .map(row -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", row[0]);
                        map.put("numeroProcesso", row[1]);
                        map.put("dataAudiencia", row[2]);
                        map.put("horarioInicio", row[3]);
                        map.put("duracao", row[4]);
                        map.put("tipoAudiencia", row[5]);
                        map.put("formato", row[6]);
                        map.put("competencia", row[7]);
                        map.put("status", row[8]);
                        return map;
                    })
                    .collect(Collectors.toList());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Erro ao listar audiências simples", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/basic-data")
    public ResponseEntity<?> listarBasico() {
        try {
            List<Map<String, Object>> audiencias = new ArrayList<>();
            
            // Use direct JDBC connection to completely bypass JPA/Hibernate
            try (var connection = audienciaService.getDataSource().getConnection();
                 var statement = connection.prepareStatement(
                     "SELECT id, numero_processo, data_audiencia, horario_inicio, duracao, status FROM audiencia")) {
                
                var resultSet = statement.executeQuery();
                
                while (resultSet.next()) {
                    Map<String, Object> audiencia = new HashMap<>();
                    audiencia.put("id", resultSet.getLong("id"));
                    audiencia.put("numeroProcesso", resultSet.getString("numero_processo"));
                    audiencia.put("dataAudiencia", resultSet.getDate("data_audiencia"));
                    audiencia.put("horarioInicio", resultSet.getTime("horario_inicio"));
                    audiencia.put("duracao", resultSet.getInt("duracao"));
                    audiencia.put("status", resultSet.getString("status"));
                    
                    audiencias.add(audiencia);
                }
            }
            
            return ResponseEntity.ok(audiencias);
        } catch (Exception e) {
            logger.error("Erro ao listar audiências básicas", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erro interno do servidor: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<?> listarTodas() {
        try {
            // Use the DTO service method instead of direct entity serialization
            List<AudienciaDTO> audiencias = audienciaService.listarTodas();
            return ResponseEntity.ok(audiencias);
        } catch (StackOverflowError e) {
            logger.error("StackOverflowError ao listar audiências - possível referência circular ou problema de serialização JSON", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "error", "Erro de serialização",
                            "message", "Possível referência circular ou problema de serialização JSON",
                            "class", e.getClass().getSimpleName()
                    ));
        } catch (Exception e) {
            logger.error("Erro ao listar audiências", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erro interno do servidor: " + e.getMessage());
        }
    }

    @GetMapping("/data")
    public ResponseEntity<List<Audiencia>> buscarPorData(
            @RequestParam @DateTimeFormat(pattern = "dd/MM/yyyy") LocalDate data) {
        List<Audiencia> audiencias = audienciaService.buscarPorData(data);
        return ResponseEntity.ok(audiencias);
    }

    @GetMapping("/pauta")
    public ResponseEntity<List<Audiencia>> buscarPautaDiaria(
            @RequestParam @DateTimeFormat(pattern = "dd/MM/yyyy") LocalDate data) {
        List<Audiencia> audiencias = audienciaService.buscarPautaDiaria(data);
        return ResponseEntity.ok(audiencias);
    }

    @GetMapping("/buscar")
    public ResponseEntity<List<Audiencia>> buscarComFiltros(
            @RequestParam(required = false) String numeroProcesso,
            @RequestParam(required = false) Long varaId,
            @RequestParam(required = false) @DateTimeFormat(pattern = "dd/MM/yyyy") LocalDate dataInicio,
            @RequestParam(required = false) @DateTimeFormat(pattern = "dd/MM/yyyy") LocalDate dataFim,
            @RequestParam(required = false) StatusAudiencia status,
            @RequestParam(required = false) TipoAudiencia tipo,
            @RequestParam(required = false) Competencia competencia,
            @RequestParam(required = false) FormatoAudiencia formato) {
        
        List<Audiencia> audiencias = audienciaService.buscarComFiltros(
                numeroProcesso, varaId, dataInicio, dataFim, status, tipo, competencia, formato);
        return ResponseEntity.ok(audiencias);
    }

    @GetMapping("/buscar-global")
    public ResponseEntity<List<Audiencia>> buscarGlobal(@RequestParam String termo) {
        List<Audiencia> audiencias = audienciaService.buscarGlobal(termo);
        return ResponseEntity.ok(audiencias);
    }

    @PostMapping
    public ResponseEntity<?> criar(@Valid @RequestBody AudienciaDTO audienciaDTO) {
        try {
            Audiencia novaAudiencia = audienciaService.salvarDTO(audienciaDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(novaAudiencia);
        } catch (IllegalArgumentException e) {
            // Erro de validação - retorna 400 Bad Request
            logger.warn("Erro de validação ao criar audiência: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("erro", "Dados inválidos", "detalhes", e.getMessage()));
        } catch (IllegalStateException e) {
            // Conflito de horário - retorna 409 Conflict
            logger.warn("Conflito de horário ao criar audiência: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("erro", "Conflito de horário", "detalhes", e.getMessage()));
        } catch (Exception e) {
            // Erro interno - retorna 500 Internal Server Error
            logger.error("Erro interno ao criar audiência", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("erro", "Erro interno do servidor", "detalhes", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Long id, @Valid @RequestBody AudienciaDTO audienciaDTO) {
        try {
            Audiencia audienciaAtualizada = audienciaService.atualizarDTO(id, audienciaDTO);
            return ResponseEntity.ok(audienciaAtualizada);
        } catch (IllegalArgumentException e) {
            // Erro de validação - retorna 400 Bad Request
            logger.warn("Erro de validação ao atualizar audiência {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("erro", "Dados inválidos", "detalhes", e.getMessage()));
        } catch (IllegalStateException e) {
            // Conflito de horário - retorna 409 Conflict
            logger.warn("Conflito de horário ao atualizar audiência {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("erro", "Conflito de horário", "detalhes", e.getMessage()));
        } catch (EntityNotFoundException e) {
            // Audiência não encontrada - retorna 404 Not Found
            logger.warn("Audiência não encontrada para atualização: {}", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("erro", "Audiência não encontrada", "detalhes", e.getMessage()));
        } catch (Exception e) {
            // Erro interno - retorna 500 Internal Server Error
            logger.error("Erro interno ao atualizar audiência {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("erro", "Erro interno do servidor", "detalhes", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        audienciaService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/verificar-conflitos")
    public ResponseEntity<?> verificarConflitos(
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate data,
            @RequestParam @DateTimeFormat(pattern = "HH:mm") String horarioInicio,
            @RequestParam int duracao,
            @RequestParam Long varaId,
            @RequestParam(required = false) Long audienciaId) {
        try {
            List<Map<String, Object>> conflitos = audienciaService.verificarConflitosHorario(
                    data, horarioInicio, duracao, varaId, audienciaId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("temConflito", !conflitos.isEmpty());
            response.put("conflitos", conflitos);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Erro ao verificar conflitos de horário", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Erro ao verificar conflitos");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @GetMapping("/buscar-horarios-livres")
    public ResponseEntity<?> buscarHorariosLivres(
            @RequestParam Long varaId,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate dataInicio,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate dataFim,
            @RequestParam int duracao,
            @RequestParam @DateTimeFormat(pattern = "HH:mm") String horarioInicioMinimo,
            @RequestParam @DateTimeFormat(pattern = "HH:mm") String horarioFimMaximo) {
        try {
            List<Map<String, Object>> horariosLivres = audienciaService.buscarHorariosLivres(
                    varaId, dataInicio, dataFim, duracao, horarioInicioMinimo, horarioFimMaximo);
            
            return ResponseEntity.ok(horariosLivres);
        } catch (Exception e) {
            logger.error("Erro ao buscar horários livres", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Erro ao buscar horários livres");
            error.put("message", e.getMessage());
            error.put("class", e.getClass().getSimpleName());
            return ResponseEntity.status(500).body(error);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> buscarPorId(@PathVariable Long id) {
        try {
            Audiencia audiencia = audienciaService.buscarPorId(id);
            AudienciaDTO dto = audienciaService.convertToDTO(audiencia);
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            logger.error("Erro ao buscar audiência por ID", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Erro interno do servidor: " + e.getMessage());
        }
    }
}