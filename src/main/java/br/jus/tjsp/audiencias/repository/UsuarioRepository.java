package br.jus.tjsp.audiencias.repository;

import br.jus.tjsp.audiencias.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    
    Optional<Usuario> findByEmail(String email);
    
    Optional<Usuario> findByMatricula(String matricula);
    
    boolean existsByEmail(String email);
    
    boolean existsByMatricula(String matricula);
    
    Optional<Usuario> findByEmailAndAtivoTrue(String email);
    
    Optional<Usuario> findByMatriculaAndAtivoTrue(String matricula);
}