package br.jus.tjsp.audiencias.repository;

import br.jus.tjsp.audiencias.model.RepresentacaoAdvogado;
import br.jus.tjsp.audiencias.model.enums.TipoRepresentacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RepresentacaoAdvogadoRepository extends JpaRepository<RepresentacaoAdvogado, Long> {
    List<RepresentacaoAdvogado> findByAudienciaId(Long audienciaId);
    List<RepresentacaoAdvogado> findByAdvogadoId(Long advogadoId);
    List<RepresentacaoAdvogado> findByClienteId(Long clienteId);
    List<RepresentacaoAdvogado> findByAudienciaIdAndTipo(Long audienciaId, TipoRepresentacao tipo);
}