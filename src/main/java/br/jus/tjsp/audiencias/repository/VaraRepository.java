package br.jus.tjsp.audiencias.repository;

import br.jus.tjsp.audiencias.model.Vara;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VaraRepository extends JpaRepository<Vara, Long> {
    List<Vara> findByNomeContainingIgnoreCase(String nome);
}