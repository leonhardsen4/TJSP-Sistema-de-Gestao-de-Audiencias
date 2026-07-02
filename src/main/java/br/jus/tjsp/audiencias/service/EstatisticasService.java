package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.config.Database;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Calcula as métricas exibidas no dashboard do sistema.
 */
public class EstatisticasService {

    /**
     * Monta o resumo do dashboard: totais por entidade e a quantidade de
     * audiências marcadas para hoje.
     *
     * @return mapa {@code {totalAudiencias, audienciasHoje, totalVaras,
     *         totalJuizes, totalPromotores, totalAdvogados, totalPessoas}}
     */
    public Map<String, Object> resumoDashboard() {
        Map<String, Object> resumo = new LinkedHashMap<>();
        resumo.put("totalAudiencias", Database.count("SELECT COUNT(*) FROM audiencia"));
        resumo.put("audienciasHoje", Database.count(
                "SELECT COUNT(*) FROM audiencia WHERE data_audiencia = ?", LocalDate.now().toString()));
        resumo.put("totalVaras", Database.count("SELECT COUNT(*) FROM vara"));
        resumo.put("totalJuizes", Database.count("SELECT COUNT(*) FROM juiz"));
        resumo.put("totalPromotores", Database.count("SELECT COUNT(*) FROM promotor"));
        resumo.put("totalAdvogados", Database.count("SELECT COUNT(*) FROM advogado"));
        resumo.put("totalPessoas", Database.count("SELECT COUNT(*) FROM pessoa"));
        return resumo;
    }
}
