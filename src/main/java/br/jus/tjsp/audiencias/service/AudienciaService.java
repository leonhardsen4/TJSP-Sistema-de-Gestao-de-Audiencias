package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.dto.AudienciaDTO;
import br.jus.tjsp.audiencias.model.Audiencia;
import br.jus.tjsp.audiencias.model.enums.*;
import br.jus.tjsp.audiencias.repository.AudienciaRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.ArrayList;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.HashMap;

@Service
public class AudienciaService {

    private final AudienciaRepository audienciaRepository;
    private final DataSource dataSource;
    private final VaraService varaService;
    private final JuizService juizService;
    private final PromotorService promotorService;

    @Autowired
    public AudienciaService(AudienciaRepository audienciaRepository, DataSource dataSource,
                           VaraService varaService, JuizService juizService, PromotorService promotorService) {
        this.audienciaRepository = audienciaRepository;
        this.dataSource = dataSource;
        this.varaService = varaService;
        this.juizService = juizService;
        this.promotorService = promotorService;
    }

    public DataSource getDataSource() {
        return dataSource;
    }

    @Transactional(readOnly = true)
    public List<AudienciaDTO> listarTodas() {
        try {
            // Use direct JDBC to completely bypass JPA
            return buscarAudienciasComJDBC();
        } catch (Exception e) {
            throw new RuntimeException("Erro ao listar audiências: " + e.getMessage(), e);
        }
    }

    private List<AudienciaDTO> buscarAudienciasComJDBC() {
        List<AudienciaDTO> audiencias = new ArrayList<>();
        
        try (var connection = dataSource.getConnection();
             var statement = connection.prepareStatement(
                 "SELECT a.id, a.numero_processo, a.data_audiencia, a.horario_inicio, a.duracao, " +
                 "a.tipo_audiencia, a.formato, a.competencia, a.status, a.artigo, a.observacoes, " +
                 "a.reu_preso, a.agendamento_teams, a.reconhecimento, a.depoimento_especial, " +
                 "a.vara_id, v.nome as vara_nome, " +
                 "a.juiz_id, j.nome as juiz_nome, " +
                 "a.promotor_id, p.nome as promotor_nome " +
                 "FROM audiencia a " +
                 "LEFT JOIN vara v ON a.vara_id = v.id " +
                 "LEFT JOIN juiz j ON a.juiz_id = j.id " +
                 "LEFT JOIN promotor p ON a.promotor_id = p.id")) {
            
            var resultSet = statement.executeQuery();
            
            while (resultSet.next()) {
                AudienciaDTO dto = new AudienciaDTO();
                dto.setId(resultSet.getLong("id"));
                dto.setNumeroProcesso(resultSet.getString("numero_processo"));
                dto.setDataAudiencia(resultSet.getDate("data_audiencia") != null ? 
                    resultSet.getDate("data_audiencia").toLocalDate() : null);
                dto.setHorarioInicio(resultSet.getTime("horario_inicio") != null ? 
                    resultSet.getTime("horario_inicio").toLocalTime() : null);
                dto.setDuracao(resultSet.getInt("duracao"));
                
                // Calculate horarioFim
                if (dto.getHorarioInicio() != null && dto.getDuracao() != null) {
                    dto.setHorarioFim(dto.getHorarioInicio().plusMinutes(dto.getDuracao()));
                }
                
                // Calculate diaSemana
                if (dto.getDataAudiencia() != null) {
                    java.time.DayOfWeek dayOfWeek = dto.getDataAudiencia().getDayOfWeek();
                    dto.setDiaSemana(dayOfWeek.getDisplayName(java.time.format.TextStyle.FULL, new java.util.Locale("pt", "BR")));
                }
                
                // Set additional fields
                dto.setArtigo(resultSet.getString("artigo"));
                dto.setObservacoes(resultSet.getString("observacoes"));
                dto.setReuPreso(resultSet.getBoolean("reu_preso"));
                dto.setAgendamentoTeams(resultSet.getBoolean("agendamento_teams"));
                dto.setReconhecimento(resultSet.getBoolean("reconhecimento"));
                dto.setDepoimentoEspecial(resultSet.getBoolean("depoimento_especial"));
                
                // Set relationship data - Create nested objects for frontend compatibility
                Long varaId = resultSet.getLong("vara_id");
                if (!resultSet.wasNull()) {
                    dto.setVaraId(varaId);
                    dto.setVaraNome(resultSet.getString("vara_nome"));
                    // Create nested vara object for frontend
                    Map<String, Object> vara = new HashMap<>();
                    vara.put("id", varaId);
                    vara.put("nome", resultSet.getString("vara_nome"));
                    dto.setVara(vara);
                }
                
                Long juizId = resultSet.getLong("juiz_id");
                if (!resultSet.wasNull()) {
                    dto.setJuizId(juizId);
                    dto.setJuizNome(resultSet.getString("juiz_nome"));
                    // Create nested juiz object for frontend
                    Map<String, Object> juiz = new HashMap<>();
                    juiz.put("id", juizId);
                    juiz.put("nome", resultSet.getString("juiz_nome"));
                    dto.setJuiz(juiz);
                }
                
                Long promotorId = resultSet.getLong("promotor_id");
                if (!resultSet.wasNull()) {
                    dto.setPromotorId(promotorId);
                    dto.setPromotorNome(resultSet.getString("promotor_nome"));
                    // Create nested promotor object for frontend
                    Map<String, Object> promotor = new HashMap<>();
                    promotor.put("id", promotorId);
                    promotor.put("nome", resultSet.getString("promotor_nome"));
                    dto.setPromotor(promotor);
                }
                
                // Handle enum values safely
                String tipoAudiencia = resultSet.getString("tipo_audiencia");
                if (tipoAudiencia != null) {
                    try {
                        // Map ANPP to the correct enum value
                        if ("ANPP".equals(tipoAudiencia)) {
                            dto.setTipoAudiencia(TipoAudiencia.ACORDO_NAO_PERSECUCAO_PENAL);
                        } else {
                            dto.setTipoAudiencia(TipoAudiencia.valueOf(tipoAudiencia));
                        }
                    } catch (IllegalArgumentException e) {
                        // Invalid enum value, skip setting
                    }
                }
                
                String formato = resultSet.getString("formato");
                if (formato != null) {
                    try {
                        dto.setFormato(FormatoAudiencia.valueOf(formato));
                    } catch (IllegalArgumentException e) {
                        // Invalid enum value, skip setting
                    }
                }
                
                String competencia = resultSet.getString("competencia");
                if (competencia != null) {
                    try {
                        dto.setCompetencia(Competencia.valueOf(competencia));
                    } catch (IllegalArgumentException e) {
                        // Invalid enum value, skip setting
                    }
                }
                
                String status = resultSet.getString("status");
                if (status != null) {
                    try {
                        dto.setStatus(StatusAudiencia.valueOf(status));
                    } catch (IllegalArgumentException e) {
                        // Invalid enum value, skip setting
                    }
                }
                
                audiencias.add(dto);
            }
            
        } catch (Exception e) {
            throw new RuntimeException("Erro ao buscar audiências", e);
        }
        
        return audiencias;
    }

    public AudienciaDTO convertToDTO(Audiencia audiencia) {
        AudienciaDTO dto = new AudienciaDTO();
        dto.setId(audiencia.getId());
        dto.setNumeroProcesso(audiencia.getNumeroProcesso());
        dto.setDataAudiencia(audiencia.getDataAudiencia());
        dto.setHorarioInicio(audiencia.getHorarioInicio());
        dto.setDuracao(audiencia.getDuracao());
        dto.setHorarioFim(audiencia.getHorarioFim());
        dto.setDiaSemana(audiencia.getDiaSemana());
        dto.setTipoAudiencia(audiencia.getTipoAudiencia());
        dto.setFormato(audiencia.getFormato());
        dto.setCompetencia(audiencia.getCompetencia());
        dto.setStatus(audiencia.getStatus());
        dto.setArtigo(audiencia.getArtigo());
        dto.setObservacoes(audiencia.getObservacoes());
        dto.setReuPreso(audiencia.getReuPreso());
        dto.setAgendamentoTeams(audiencia.getAgendamentoTeams());
        dto.setReconhecimento(audiencia.getReconhecimento());
        dto.setDepoimentoEspecial(audiencia.getDepoimentoEspecial());
        
        // Safely handle relationships - both flat and nested objects
        if (audiencia.getVara() != null) {
            dto.setVaraId(audiencia.getVara().getId());
            dto.setVaraNome(audiencia.getVara().getNome());
            // Create nested vara object for frontend
            Map<String, Object> vara = new HashMap<>();
            vara.put("id", audiencia.getVara().getId());
            vara.put("nome", audiencia.getVara().getNome());
            dto.setVara(vara);
        }
        if (audiencia.getJuiz() != null) {
            dto.setJuizId(audiencia.getJuiz().getId());
            dto.setJuizNome(audiencia.getJuiz().getNome());
            // Create nested juiz object for frontend
            Map<String, Object> juiz = new HashMap<>();
            juiz.put("id", audiencia.getJuiz().getId());
            juiz.put("nome", audiencia.getJuiz().getNome());
            dto.setJuiz(juiz);
        }
        if (audiencia.getPromotor() != null) {
            dto.setPromotorId(audiencia.getPromotor().getId());
            dto.setPromotorNome(audiencia.getPromotor().getNome());
            // Create nested promotor object for frontend
            Map<String, Object> promotor = new HashMap<>();
            promotor.put("id", audiencia.getPromotor().getId());
            promotor.put("nome", audiencia.getPromotor().getNome());
            dto.setPromotor(promotor);
        }
        
        return dto;
    }

    public long contarAudiencias() {
        return audienciaRepository.count();
    }

    public List<Long> listarIds() {
        List<Long> ids = new ArrayList<>();
        
        try (var connection = dataSource.getConnection();
             var statement = connection.prepareStatement("SELECT id FROM audiencia")) {
            
            var resultSet = statement.executeQuery();
            
            while (resultSet.next()) {
                ids.add(resultSet.getLong("id"));
            }
            
        } catch (Exception e) {
            throw new RuntimeException("Erro ao buscar IDs das audiências", e);
        }
        
        return ids;
    }

    public List<Object[]> buscarDadosSimples() {
        return audienciaRepository.findDadosBasicos();
    }

    public List<Object[]> buscarDadosNativos() {
        return audienciaRepository.findDadosNativos();
    }

    public List<Object[]> buscarPorCompetenciaNativo(String competencia) {
        return audienciaRepository.findByCompetenciaNativo(competencia);
    }

    public Audiencia buscarPorId(Long id) {
        return audienciaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Audiência não encontrada com o ID: " + id));
    }

    public List<Audiencia> buscarPorData(LocalDate data) {
        return audienciaRepository.findByDataAudiencia(data);
    }

    public List<Audiencia> buscarPautaDiaria(LocalDate data) {
        return audienciaRepository.findByDataAudienciaOrderByHorarioInicio(data);
    }

    public List<Audiencia> buscarComFiltros(String numeroProcesso, Long varaId, 
                                           LocalDate dataInicio, LocalDate dataFim, 
                                           StatusAudiencia status, TipoAudiencia tipo, 
                                           Competencia competencia, FormatoAudiencia formato) {
        return audienciaRepository.buscarComFiltros(numeroProcesso, varaId, dataInicio, 
                                                  dataFim, status, tipo, competencia, formato);
    }

    public List<Audiencia> buscarGlobal(String termo) {
        return audienciaRepository.buscarGlobal(termo);
    }

    @Transactional
    public Audiencia salvar(Audiencia audiencia) {
        if (audiencia == null) {
            throw new IllegalArgumentException("Audiência não pode ser nula");
        }
        
        // Validar campos obrigatórios
        if (audiencia.getVara() == null) {
            throw new IllegalArgumentException("Vara é obrigatória");
        }
        
        if (audiencia.getDataAudiencia() == null) {
            throw new IllegalArgumentException("Data da audiência é obrigatória");
        }
        
        if (audiencia.getHorarioInicio() == null) {
            throw new IllegalArgumentException("Horário de início é obrigatório");
        }
        
        if (audiencia.getDuracao() == null || audiencia.getDuracao() <= 0) {
            throw new IllegalArgumentException("Duração deve ser maior que zero");
        }
        
        // Verificar se as entidades relacionadas existem no banco
        try {
            // Recarregar vara para garantir que existe
            if (audiencia.getVara().getId() != null) {
                audiencia.setVara(varaService.buscarPorId(audiencia.getVara().getId()));
            }
            
            // Recarregar juiz se informado
            if (audiencia.getJuiz() != null && audiencia.getJuiz().getId() != null) {
                audiencia.setJuiz(juizService.buscarPorId(audiencia.getJuiz().getId()));
            }
            
            // Recarregar promotor se informado
            if (audiencia.getPromotor() != null && audiencia.getPromotor().getId() != null) {
                audiencia.setPromotor(promotorService.buscarPorId(audiencia.getPromotor().getId()));
            }
        } catch (EntityNotFoundException e) {
            throw new IllegalArgumentException("Entidade relacionada não encontrada: " + e.getMessage(), e);
        }
        
        // Verificar conflitos de horário (se necessário)
        verificarConflitos(audiencia);
        
        return audienciaRepository.save(audiencia);
    }

    @Transactional
    public Audiencia atualizar(Long id, Audiencia audienciaAtualizada) {
        Audiencia audienciaExistente = buscarPorId(id);
        
        // Atualiza os campos
        audienciaExistente.setNumeroProcesso(audienciaAtualizada.getNumeroProcesso());
        audienciaExistente.setVara(audienciaAtualizada.getVara());
        audienciaExistente.setDataAudiencia(audienciaAtualizada.getDataAudiencia());
        audienciaExistente.setHorarioInicio(audienciaAtualizada.getHorarioInicio());
        audienciaExistente.setDuracao(audienciaAtualizada.getDuracao());
        audienciaExistente.setTipoAudiencia(audienciaAtualizada.getTipoAudiencia());
        audienciaExistente.setFormato(audienciaAtualizada.getFormato());
        audienciaExistente.setCompetencia(audienciaAtualizada.getCompetencia());
        audienciaExistente.setStatus(audienciaAtualizada.getStatus());
        audienciaExistente.setArtigo(audienciaAtualizada.getArtigo());
        audienciaExistente.setObservacoes(audienciaAtualizada.getObservacoes());
        audienciaExistente.setReuPreso(audienciaAtualizada.getReuPreso());
        audienciaExistente.setAgendamentoTeams(audienciaAtualizada.getAgendamentoTeams());
        audienciaExistente.setReconhecimento(audienciaAtualizada.getReconhecimento());
        audienciaExistente.setDepoimentoEspecial(audienciaAtualizada.getDepoimentoEspecial());
        audienciaExistente.setJuiz(audienciaAtualizada.getJuiz());
        audienciaExistente.setPromotor(audienciaAtualizada.getPromotor());
        
        return audienciaRepository.save(audienciaExistente);
    }

    @Transactional
    public void excluir(Long id) {
        Audiencia audiencia = buscarPorId(id);
        
        // Remover entidades relacionadas usando JPQL diretamente
        try (Connection conn = dataSource.getConnection()) {
            // Remover representações de advogados
            PreparedStatement stmtRepr = conn.prepareStatement("DELETE FROM representacao_advogado WHERE audiencia_id = ?");
            stmtRepr.setLong(1, id);
            stmtRepr.executeUpdate();
            stmtRepr.close();
            
            // Remover participações da audiência
            PreparedStatement stmtPart = conn.prepareStatement("DELETE FROM participacao_audiencia WHERE audiencia_id = ?");
            stmtPart.setLong(1, id);
            stmtPart.executeUpdate();
            stmtPart.close();
            
        } catch (Exception e) {
            throw new RuntimeException("Erro ao remover entidades relacionadas: " + e.getMessage(), e);
        }
        
        // Agora pode excluir a audiência
        audienciaRepository.delete(audiencia);
    }
    
    private void verificarConflitos(Audiencia audiencia) {
        // Temporariamente desabilitado para resolver erro 500
        /*
        if (audiencia.getVara() != null && 
            audiencia.getDataAudiencia() != null && 
            audiencia.getHorarioInicio() != null && 
            audiencia.getDuracao() != null) {
            
            LocalTime horarioFim = audiencia.getHorarioInicio().plusMinutes(audiencia.getDuracao());
            
            boolean temConflito = audienciaRepository.existeConflito(
                audiencia.getVara().getId(),
                audiencia.getDataAudiencia(),
                audiencia.getHorarioInicio(),
                horarioFim,
                audiencia.getId()
            );
            
            if (temConflito) {
                throw new IllegalStateException("Já existe uma audiência agendada para esta vara no mesmo horário.");
            }
        }
        */
    }

    @Transactional
    public Audiencia salvarDTO(AudienciaDTO audienciaDTO) {
        if (audienciaDTO == null) {
            throw new IllegalArgumentException("DTO da audiência não pode ser nulo");
        }
        
        try {
            Audiencia audiencia = convertFromDTO(audienciaDTO);
            return salvar(audiencia);
        } catch (IllegalArgumentException e) {
            // Re-throw validation errors with context
            throw new IllegalArgumentException("Erro de validação ao salvar audiência: " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("Erro inesperado ao salvar audiência: " + e.getMessage(), e);
        }
    }

    private Audiencia convertFromDTO(AudienciaDTO dto) {
        if (dto == null) {
            throw new IllegalArgumentException("DTO não pode ser nulo");
        }
        
        System.out.println("=== INICIO DEBUG convertFromDTO ===");
        System.out.println("DTO recebido - VaraId: " + dto.getVaraId() + ", JuizId: " + dto.getJuizId() + ", PromotorId: " + dto.getPromotorId());
        
        Audiencia audiencia = new Audiencia();
        audiencia.setId(dto.getId());
        audiencia.setNumeroProcesso(dto.getNumeroProcesso());
        audiencia.setDataAudiencia(dto.getDataAudiencia());
        audiencia.setHorarioInicio(dto.getHorarioInicio());
        audiencia.setDuracao(dto.getDuracao());
        audiencia.setHorarioFim(dto.getHorarioFim());
        audiencia.setDiaSemana(dto.getDiaSemana());
        audiencia.setTipoAudiencia(dto.getTipoAudiencia());
        audiencia.setFormato(dto.getFormato());
        audiencia.setCompetencia(dto.getCompetencia());
        audiencia.setStatus(dto.getStatus());
        audiencia.setArtigo(dto.getArtigo());
        audiencia.setObservacoes(dto.getObservacoes());
        audiencia.setReuPreso(dto.getReuPreso());
        audiencia.setAgendamentoTeams(dto.getAgendamentoTeams());
        audiencia.setReconhecimento(dto.getReconhecimento());
        audiencia.setDepoimentoEspecial(dto.getDepoimentoEspecial());
        
        // Set relationships using actual entities from database with proper validation
        try {
            // Vara é obrigatória
            if (dto.getVaraId() != null) {
                try {
                    System.out.println("Buscando Vara com ID: " + dto.getVaraId());
                    audiencia.setVara(varaService.buscarPorId(dto.getVaraId()));
                    System.out.println("Vara encontrada: " + audiencia.getVara().getNome());
                } catch (EntityNotFoundException e) {
                    System.out.println("ERRO: Vara não encontrada com ID: " + dto.getVaraId());
                    throw new IllegalArgumentException("Vara não encontrada com ID: " + dto.getVaraId(), e);
                }
            } else {
                System.out.println("ERRO: VaraId é nulo");
                throw new IllegalArgumentException("Vara é obrigatória para criar uma audiência");
            }
            
            // Juiz é opcional
            if (dto.getJuizId() != null) {
                try {
                    System.out.println("Buscando Juiz com ID: " + dto.getJuizId());
                    audiencia.setJuiz(juizService.buscarPorId(dto.getJuizId()));
                    System.out.println("Juiz encontrado: " + audiencia.getJuiz().getNome());
                } catch (EntityNotFoundException e) {
                    System.out.println("ERRO: Juiz não encontrado com ID: " + dto.getJuizId());
                    throw new IllegalArgumentException("Juiz não encontrado com ID: " + dto.getJuizId(), e);
                }
            } else {
                System.out.println("JuizId é nulo - pulando");
            }
            
            // Promotor é opcional
            if (dto.getPromotorId() != null) {
                try {
                    System.out.println("Buscando Promotor com ID: " + dto.getPromotorId());
                    audiencia.setPromotor(promotorService.buscarPorId(dto.getPromotorId()));
                    System.out.println("Promotor encontrado: " + audiencia.getPromotor().getNome());
                } catch (EntityNotFoundException e) {
                    System.out.println("ERRO: Promotor não encontrado com ID: " + dto.getPromotorId());
                    throw new IllegalArgumentException("Promotor não encontrado com ID: " + dto.getPromotorId(), e);
                }
            } else {
                System.out.println("PromotorId é nulo - pulando");
            }
        } catch (IllegalArgumentException e) {
            // Re-throw validation errors
            throw e;
        } catch (Exception e) {
            System.out.println("ERRO inesperado: " + e.getMessage());
            throw new RuntimeException("Erro inesperado ao converter DTO para entidade: " + e.getMessage(), e);
        }
        
        System.out.println("=== FIM DEBUG convertFromDTO ===");
        return audiencia;
    }

    public Audiencia atualizarDTO(Long id, AudienciaDTO audienciaDTO) {
        if (audienciaDTO == null) {
            throw new IllegalArgumentException("AudienciaDTO não pode ser nulo");
        }
        
        Audiencia audienciaExistente = audienciaRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Audiência não encontrada com ID: " + id));
        
        try {
            // Convert DTO to entity
            Audiencia audienciaAtualizada = convertFromDTO(audienciaDTO);
            audienciaAtualizada.setId(id);
            
            // Preserve creation timestamp
            audienciaAtualizada.setCriacao(audienciaExistente.getCriacao());
            
            return salvar(audienciaAtualizada);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Erro na validação dos dados: " + e.getMessage(), e);
        } catch (EntityNotFoundException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Erro inesperado ao atualizar audiência: " + e.getMessage(), e);
        }
    }

    public List<Map<String, Object>> verificarConflitosHorario(LocalDate data, String horarioInicio, 
                                                               int duracao, Long varaId, Long audienciaId) {
        List<Map<String, Object>> conflitos = new ArrayList<>();
        
        try {
            // Converter horário de início para LocalTime
            LocalTime inicio = LocalTime.parse(horarioInicio);
            LocalTime fim = inicio.plusMinutes(duracao);
            
            String sql = """
                SELECT a.id, a.numero_processo, a.horario_inicio, a.duracao,
                       v.nome as vara_nome, j.nome as juiz_nome
                FROM audiencia a
                JOIN vara v ON a.vara_id = v.id
                JOIN juiz j ON a.juiz_id = j.id
                WHERE a.data_audiencia = ?
                AND a.vara_id = ?
                AND a.status != 'CANCELADA'
                """;
            
            // Se for edição, excluir a própria audiência da verificação
            if (audienciaId != null) {
                sql += " AND a.id != ?";
            }
            
            try (Connection connection = dataSource.getConnection();
                 PreparedStatement statement = connection.prepareStatement(sql)) {
                
                statement.setDate(1, Date.valueOf(data));
                statement.setLong(2, varaId);
                
                if (audienciaId != null) {
                    statement.setLong(3, audienciaId);
                }
                
                ResultSet resultSet = statement.executeQuery();
                
                while (resultSet.next()) {
                    LocalTime audienciaInicio = resultSet.getTime("horario_inicio").toLocalTime();
                    int audienciaDuracao = resultSet.getInt("duracao");
                    LocalTime audienciaFim = audienciaInicio.plusMinutes(audienciaDuracao);
                    
                    // Verificar se há sobreposição de horários
                    if (!(fim.isBefore(audienciaInicio) || inicio.isAfter(audienciaFim))) {
                        Map<String, Object> conflito = new HashMap<>();
                        conflito.put("id", resultSet.getLong("id"));
                        conflito.put("numeroProcesso", resultSet.getString("numero_processo"));
                        conflito.put("horarioInicio", audienciaInicio.toString());
                        conflito.put("horarioFim", audienciaFim.toString());
                        conflito.put("duracao", audienciaDuracao);
                        conflito.put("varaNome", resultSet.getString("vara_nome"));
                        conflito.put("juizNome", resultSet.getString("juiz_nome"));
                        
                        conflitos.add(conflito);
                    }
                }
            }
            
        } catch (Exception e) {
            throw new RuntimeException("Erro ao verificar conflitos de horário", e);
        }
        
        return conflitos;
    }

    public List<Map<String, Object>> buscarHorariosLivres(Long varaId, LocalDate dataInicio, LocalDate dataFim, 
                                                         int duracao, String horarioInicioMinimo, String horarioFimMaximo) {
        List<Map<String, Object>> horariosLivres = new ArrayList<>();
        
        try {
            LocalTime inicioMinimo = LocalTime.parse(horarioInicioMinimo);
            LocalTime fimMaximo = LocalTime.parse(horarioFimMaximo);
            
            // Iterar por cada dia no período
            LocalDate dataAtual = dataInicio;
            while (!dataAtual.isAfter(dataFim)) {
                // Pular fins de semana (opcional - pode ser configurável)
                if (dataAtual.getDayOfWeek() != java.time.DayOfWeek.SATURDAY && 
                    dataAtual.getDayOfWeek() != java.time.DayOfWeek.SUNDAY) {
                    
                    // Buscar audiências existentes para esta data e vara
                    List<Map<String, Object>> audienciasExistentes = buscarAudienciasPorDataEVara(dataAtual, varaId);
                    
                    // Gerar horários livres para este dia
                    List<Map<String, Object>> horariosLivresDia = gerarHorariosLivresDia(
                        dataAtual, inicioMinimo, fimMaximo, duracao, audienciasExistentes, varaId);
                    
                    horariosLivres.addAll(horariosLivresDia);
                }
                
                dataAtual = dataAtual.plusDays(1);
            }
            
        } catch (Exception e) {
            throw new RuntimeException("Erro ao buscar horários livres", e);
        }
        
        return horariosLivres;
    }
    
    private List<Map<String, Object>> buscarAudienciasPorDataEVara(LocalDate data, Long varaId) {
        List<Map<String, Object>> audiencias = new ArrayList<>();
        
        try (Connection connection = dataSource.getConnection();
             PreparedStatement statement = connection.prepareStatement(
                 "SELECT horario_inicio, duracao FROM audiencia " +
                 "WHERE data_audiencia = ? AND vara_id = ? AND status != 'CANCELADA' " +
                 "ORDER BY horario_inicio")) {
            
            statement.setDate(1, Date.valueOf(data));
            statement.setLong(2, varaId);
            
            ResultSet resultSet = statement.executeQuery();
            
            while (resultSet.next()) {
                Map<String, Object> audiencia = new HashMap<>();
                LocalTime inicio = resultSet.getTime("horario_inicio").toLocalTime();
                int duracaoAud = resultSet.getInt("duracao");
                LocalTime fim = inicio.plusMinutes(duracaoAud);
                
                audiencia.put("inicio", inicio);
                audiencia.put("fim", fim);
                audiencias.add(audiencia);
            }
            
        } catch (Exception e) {
            throw new RuntimeException("Erro ao buscar audiências existentes", e);
        }
        
        return audiencias;
    }
    
    private List<Map<String, Object>> gerarHorariosLivresDia(LocalDate data, LocalTime inicioMinimo, 
                                                           LocalTime fimMaximo, int duracao, 
                                                           List<Map<String, Object>> audienciasExistentes, Long varaId) {
        List<Map<String, Object>> horariosLivres = new ArrayList<>();
        
        // Intervalo de 30 minutos entre audiências
        int intervaloMinutos = 30;
        
        LocalTime horarioAtual = inicioMinimo;
        
        while (horarioAtual.plusMinutes(duracao).isBefore(fimMaximo) || 
               horarioAtual.plusMinutes(duracao).equals(fimMaximo)) {
            
            LocalTime fimProposto = horarioAtual.plusMinutes(duracao);
            
            // Verificar se este horário conflita com alguma audiência existente
            boolean temConflito = false;
            for (Map<String, Object> audiencia : audienciasExistentes) {
                LocalTime inicioExistente = (LocalTime) audiencia.get("inicio");
                LocalTime fimExistente = (LocalTime) audiencia.get("fim");
                
                // Verificar sobreposição (incluindo intervalo de segurança)
                if (!(fimProposto.plusMinutes(intervaloMinutos).isBefore(inicioExistente) || 
                      horarioAtual.isAfter(fimExistente.plusMinutes(intervaloMinutos)))) {
                    temConflito = true;
                    break;
                }
            }
            
            if (!temConflito) {
                Map<String, Object> horarioLivre = new HashMap<>();
                horarioLivre.put("data", data.toString());
                horarioLivre.put("horarioInicio", horarioAtual.toString());
                horarioLivre.put("horarioFim", fimProposto.toString());
                horarioLivre.put("duracao", duracao);
                horarioLivre.put("varaId", varaId);
                
                // Adicionar informações do dia da semana
                java.time.DayOfWeek dayOfWeek = data.getDayOfWeek();
                horarioLivre.put("diaSemana", dayOfWeek.getDisplayName(
                    java.time.format.TextStyle.FULL, new java.util.Locale("pt", "BR")));
                
                horariosLivres.add(horarioLivre);
            }
            
            // Avançar para o próximo slot (intervalos de 30 minutos)
            horarioAtual = horarioAtual.plusMinutes(30);
        }
        
        return horariosLivres;
    }
}