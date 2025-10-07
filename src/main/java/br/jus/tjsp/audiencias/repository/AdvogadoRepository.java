package br.jus.tjsp.audiencias.repository;

import br.jus.tjsp.audiencias.model.Advogado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AdvogadoRepository extends JpaRepository<Advogado, Long> {
    List<Advogado> findByNomeContainingIgnoreCase(String nome);
    List<Advogado> findByOabContainingIgnoreCase(String oab);
    Optional<Advogado> findByOab(String oab);
}