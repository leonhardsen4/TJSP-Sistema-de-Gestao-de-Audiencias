package br.jus.tjsp.audiencias.repository;

import br.jus.tjsp.audiencias.model.Audiencia;
import br.jus.tjsp.audiencias.model.enums.Competencia;
import br.jus.tjsp.audiencias.model.enums.FormatoAudiencia;
import br.jus.tjsp.audiencias.model.enums.StatusAudiencia;
import br.jus.tjsp.audiencias.model.enums.TipoAudiencia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AudienciaRepository extends JpaRepository<Audiencia, Long> {
    
    List<Audiencia> findByDataAudiencia(LocalDate data);
    
    List<Audiencia> findByVaraId(Long varaId);
    
    List<Audiencia> findByStatus(StatusAudiencia status);
    
    List<Audiencia> findByTipoAudiencia(TipoAudiencia tipo);
    
    List<Audiencia> findByCompetencia(Competencia competencia);
    
    List<Audiencia> findByFormato(FormatoAudiencia formato);
    
    @Query("SELECT a FROM Audiencia a WHERE " +
           "(:numeroProcesso IS NULL OR a.numeroProcesso LIKE %:numeroProcesso%) AND " +
           "(:varaId IS NULL OR a.vara.id = :varaId) AND " +
           "(:dataInicio IS NULL OR a.dataAudiencia >= :dataInicio) AND " +
           "(:dataFim IS NULL OR a.dataAudiencia <= :dataFim) AND " +
           "(:status IS NULL OR a.status = :status) AND " +
           "(:tipo IS NULL OR a.tipoAudiencia = :tipo) AND " +
           "(:competencia IS NULL OR a.competencia = :competencia) AND " +
           "(:formato IS NULL OR a.formato = :formato)")
    List<Audiencia> buscarComFiltros(String numeroProcesso, Long varaId, LocalDate dataInicio, 
                                    LocalDate dataFim, StatusAudiencia status, TipoAudiencia tipo, 
                                    Competencia competencia, FormatoAudiencia formato);
    
    @Query("SELECT a FROM Audiencia a WHERE " +
           "a.numeroProcesso LIKE %:termo% OR " +
           "a.vara.nome LIKE %:termo% OR " +
           "a.juiz.nome LIKE %:termo% OR " +
           "a.promotor.nome LIKE %:termo% OR " +
           "a.artigo LIKE %:termo% OR " +
           "a.observacoes LIKE %:termo%")
    List<Audiencia> buscarGlobal(String termo);
    
    @Query("SELECT a FROM Audiencia a " +
           "LEFT JOIN FETCH a.vara " +
           "LEFT JOIN FETCH a.juiz " +
           "LEFT JOIN FETCH a.promotor " +
           "WHERE a.dataAudiencia = :data ORDER BY a.horarioInicio")
    List<Audiencia> findByDataAudienciaOrderByHorarioInicio(LocalDate data);
    
    @Query("SELECT a.id, a.numeroProcesso, a.dataAudiencia, a.horarioInicio, a.duracao, " +
           "a.tipoAudiencia, a.formato, a.competencia FROM Audiencia a")
    List<Object[]> findDadosBasicos();
    
    @Query(value = "SELECT id, numero_processo, data_audiencia, horario_inicio, duracao, " +
           "tipo_audiencia, formato, competencia, status FROM audiencia", nativeQuery = true)
    List<Object[]> findDadosNativos();
    
    @Query(value = "SELECT id, numero_processo, data_audiencia, horario_inicio, duracao, " +
           "tipo_audiencia, formato, competencia, status FROM audiencia " +
           "WHERE competencia = ?1", nativeQuery = true)
    List<Object[]> findByCompetenciaNativo(String competencia);
    
    // Removendo temporariamente a query existeConflito para isolar o problema
    /*
    @Query("SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END FROM Audiencia a " +
           "WHERE a.vara.id = :varaId AND a.dataAudiencia = :data AND " +
           "a.horarioInicio < :horarioFim AND " +
           "a.horarioInicio >= :horarioInicio AND " +
           "(a.id <> :audienciaId OR :audienciaId IS NULL)")
    boolean existeConflito(Long varaId, LocalDate data, 
                          java.time.LocalTime horarioInicio, java.time.LocalTime horarioFim, 
                          Long audienciaId);
    */
}