package br.jus.tjsp.audiencias.repository;

import br.jus.tjsp.audiencias.model.Promotor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PromotorRepository extends JpaRepository<Promotor, Long> {
    List<Promotor> findByNomeContainingIgnoreCase(String nome);
}