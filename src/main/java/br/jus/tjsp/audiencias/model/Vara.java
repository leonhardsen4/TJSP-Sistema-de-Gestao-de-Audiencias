package br.jus.tjsp.audiencias.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
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
@ToString
@EqualsAndHashCode
public class Vara {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank(message = "O nome da vara é obrigatório")
    private String nome;
    
    private String comarca;
    
    private String endereco;
    
    private String telefone;
    
    @Email(message = "Email inválido")
    private String email;
    
    @Column(columnDefinition = "TEXT")
    private String observacoes;
}