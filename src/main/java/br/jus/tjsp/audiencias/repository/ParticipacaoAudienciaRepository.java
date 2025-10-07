package br.jus.tjsp.audiencias.repository;

import br.jus.tjsp.audiencias.model.ParticipacaoAudiencia;
import br.jus.tjsp.audiencias.model.enums.TipoParticipacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ParticipacaoAudienciaRepository extends JpaRepository<ParticipacaoAudiencia, Long> {
    List<ParticipacaoAudiencia> findByAudienciaId(Long audienciaId);
    List<ParticipacaoAudiencia> findByPessoaId(Long pessoaId);
    List<ParticipacaoAudiencia> findByAudienciaIdAndTipo(Long audienciaId, TipoParticipacao tipo);
}