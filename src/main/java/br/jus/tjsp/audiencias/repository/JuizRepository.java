package br.jus.tjsp.audiencias.repository;

import br.jus.tjsp.audiencias.model.Juiz;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JuizRepository extends JpaRepository<Juiz, Long> {
    List<Juiz> findByNomeContainingIgnoreCase(String nome);
}