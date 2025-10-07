package br.jus.tjsp.audiencias.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"senha"})
@EqualsAndHashCode
public class Usuario {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotBlank(message = "O nome completo é obrigatório")
    @Size(min = 2, max = 100, message = "O nome deve ter entre 2 e 100 caracteres")
    @Column(nullable = false, length = 100)
    private String nomeCompleto;
    
    @NotBlank(message = "O email é obrigatório")
    @Email(message = "Email inválido")
    @Column(nullable = false, unique = true, length = 100)
    private String email;
    
    @NotBlank(message = "O telefone é obrigatório")
    @Size(min = 10, max = 15, message = "O telefone deve ter entre 10 e 15 caracteres")
    @Column(nullable = false, length = 15)
    private String telefone;
    
    @NotBlank(message = "A matrícula é obrigatória")
    @Size(min = 6, message = "A matrícula deve ter no mínimo 6 caracteres alfanuméricos")
    @Column(nullable = false, unique = true, length = 20)
    private String matricula;
    
    @Column(nullable = false, length = 255)
    private String senha;
    
    @Column(nullable = false)
    private Boolean ativo = true;
    
    @Column(nullable = false)
    private Boolean primeiroAcesso = true;
    
    @Column(nullable = false)
    private LocalDateTime dataCadastro = LocalDateTime.now();
    
    @Column
    private LocalDateTime ultimoAcesso;
    
    @Column
    private LocalDateTime dataAlteracaoSenha;
}