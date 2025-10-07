package br.jus.tjsp.audiencias.model;

import br.jus.tjsp.audiencias.model.enums.TipoParticipacao;
import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.EqualsAndHashCode;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"audiencia"})
@EqualsAndHashCode(exclude = {"audiencia"})
public class ParticipacaoAudiencia {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "audiencia_id")
    @NotNull(message = "A audiência é obrigatória")
    @JsonBackReference
    private Audiencia audiencia;
    
    @ManyToOne
    @JoinColumn(name = "pessoa_id")
    @NotNull(message = "A pessoa é obrigatória")
    private Pessoa pessoa;
    
    @Enumerated(EnumType.STRING)
    @NotNull(message = "O tipo de participação é obrigatório")
    private TipoParticipacao tipo;
    
    private Boolean intimado = false;
    
    @Column(columnDefinition = "TEXT")
    private String observacoes;
}