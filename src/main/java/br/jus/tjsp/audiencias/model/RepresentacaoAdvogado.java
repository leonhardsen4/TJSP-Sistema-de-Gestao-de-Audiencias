package br.jus.tjsp.audiencias.model;

import br.jus.tjsp.audiencias.model.enums.TipoRepresentacao;
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
public class RepresentacaoAdvogado {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "audiencia_id")
    @NotNull(message = "A audiência é obrigatória")
    @JsonBackReference
    private Audiencia audiencia;
    
    @ManyToOne
    @JoinColumn(name = "advogado_id")
    @NotNull(message = "O advogado é obrigatório")
    private Advogado advogado;
    
    @ManyToOne
    @JoinColumn(name = "cliente_id")
    @NotNull(message = "O cliente é obrigatório")
    private Pessoa cliente;
    
    @Enumerated(EnumType.STRING)
    @NotNull(message = "O tipo de representação é obrigatório")
    private TipoRepresentacao tipo;
}