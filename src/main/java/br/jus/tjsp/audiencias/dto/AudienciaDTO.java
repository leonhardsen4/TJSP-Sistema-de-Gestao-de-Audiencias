package br.jus.tjsp.audiencias.dto;

import br.jus.tjsp.audiencias.model.enums.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AudienciaDTO {
    private Long id;
    
    @NotBlank(message = "O número do processo é obrigatório")
    @Pattern(regexp = "\\d{7}-\\d{2}\\.\\d{4}\\.\\d\\.\\d{2}\\.\\d{4}", 
             message = "Formato inválido. Use: NNNNNNN-NN.NNNN.N.NN.NNNN")
    private String numeroProcesso;
    
    @NotNull(message = "A vara é obrigatória")
    private Long varaId;
    private String varaNome;
    
    @NotNull(message = "A data da audiência é obrigatória")
    private LocalDate dataAudiencia;
    
    @NotNull(message = "O horário de início é obrigatório")
    private LocalTime horarioInicio;
    
    @NotNull(message = "A duração é obrigatória")
    private Integer duracao;
    
    private LocalTime horarioFim;
    private String diaSemana;
    
    @NotNull(message = "O tipo de audiência é obrigatório")
    private TipoAudiencia tipoAudiencia;
    
    @NotNull(message = "O formato da audiência é obrigatório")
    private FormatoAudiencia formato;
    
    @NotNull(message = "A competência é obrigatória")
    private Competencia competencia;
    
    @NotNull(message = "O status é obrigatório")
    private StatusAudiencia status;
    
    private String artigo;
    private String observacoes;
    private Boolean reuPreso;
    private Boolean agendamentoTeams;
    private Boolean reconhecimento;
    private Boolean depoimentoEspecial;
    private Long juizId;
    private String juizNome;
    private Long promotorId;
    private String promotorNome;
    
    // Nested objects for frontend compatibility
    private Map<String, Object> vara;
    private Map<String, Object> juiz;
    private Map<String, Object> promotor;
}