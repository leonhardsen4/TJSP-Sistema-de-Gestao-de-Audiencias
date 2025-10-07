package br.jus.tjsp.audiencias.model;

import br.jus.tjsp.audiencias.model.enums.Competencia;
import br.jus.tjsp.audiencias.model.enums.FormatoAudiencia;
import br.jus.tjsp.audiencias.model.enums.StatusAudiencia;
import br.jus.tjsp.audiencias.model.enums.TipoAudiencia;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.EqualsAndHashCode;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.Locale;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"vara", "juiz", "promotor"})
@EqualsAndHashCode(exclude = {"vara", "juiz", "promotor"})
public class Audiencia {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank(message = "O número do processo é obrigatório")
    @Pattern(regexp = "\\d{7}-\\d{2}\\.\\d{4}\\.\\d\\.\\d{2}\\.\\d{4}", 
             message = "Formato inválido. Use: NNNNNNN-NN.NNNN.N.NN.NNNN")
    private String numeroProcesso;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vara_id")
    @NotNull(message = "A vara é obrigatória")
    @JsonIgnore
    private Vara vara;
    
    @NotNull(message = "A data da audiência é obrigatória")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dataAudiencia;
    
    @NotNull(message = "O horário de início é obrigatório")
    @JsonFormat(pattern = "HH:mm:ss")
    private LocalTime horarioInicio;
    
    @NotNull(message = "A duração é obrigatória")
    private Integer duracao;
    
    @JsonFormat(pattern = "HH:mm:ss")
    private LocalTime horarioFim;
    
    private String diaSemana;
    
    @Enumerated(EnumType.STRING)
    @NotNull(message = "O tipo de audiência é obrigatório")
    private TipoAudiencia tipoAudiencia;
    
    @Enumerated(EnumType.STRING)
    @NotNull(message = "O formato da audiência é obrigatório")
    private FormatoAudiencia formato;
    
    @Enumerated(EnumType.STRING)
    @NotNull(message = "A competência é obrigatória")
    private Competencia competencia;
    
    @Enumerated(EnumType.STRING)
    @NotNull(message = "O status é obrigatório")
    private StatusAudiencia status;
    
    private String artigo;
    
    @Column(columnDefinition = "TEXT")
    private String observacoes;
    
    private Boolean reuPreso = false;
    
    private Boolean agendamentoTeams = false;
    
    private Boolean reconhecimento = false;
    
    private Boolean depoimentoEspecial = false;
    
    @CreationTimestamp
    @JsonIgnore
    private LocalDateTime criacao;
    
    @UpdateTimestamp
    @JsonIgnore
    private LocalDateTime atualizacao;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "juiz_id")
    @JsonIgnore
    private Juiz juiz;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "promotor_id")
    @JsonIgnore
    private Promotor promotor;
    
    @PrePersist
    public void prePersist() {
        if (horarioInicio != null && duracao != null) {
            horarioFim = horarioInicio.plusMinutes(duracao);
        }
        
        if (dataAudiencia != null) {
            DayOfWeek dayOfWeek = dataAudiencia.getDayOfWeek();
            diaSemana = dayOfWeek.getDisplayName(TextStyle.FULL, new Locale("pt", "BR"));
        }
    }
}