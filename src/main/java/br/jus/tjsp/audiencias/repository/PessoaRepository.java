package br.jus.tjsp.audiencias.repository;

import br.jus.tjsp.audiencias.model.Pessoa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PessoaRepository extends JpaRepository<Pessoa, Long> {
    List<Pessoa> findByNomeContainingIgnoreCase(String nome);
    List<Pessoa> findByCpfContaining(String cpf);
    Optional<Pessoa> findByCpf(String cpf);
}