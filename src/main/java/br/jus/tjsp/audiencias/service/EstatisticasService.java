package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.repository.AudienciaRepository;
import br.jus.tjsp.audiencias.repository.VaraRepository;
import br.jus.tjsp.audiencias.repository.JuizRepository;
import br.jus.tjsp.audiencias.repository.PromotorRepository;
import br.jus.tjsp.audiencias.repository.AdvogadoRepository;
import br.jus.tjsp.audiencias.repository.PessoaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@Service
public class EstatisticasService {

    private final AudienciaRepository audienciaRepository;
    private final VaraRepository varaRepository;
    private final JuizRepository juizRepository;
    private final PromotorRepository promotorRepository;
    private final AdvogadoRepository advogadoRepository;
    private final PessoaRepository pessoaRepository;

    @Autowired
    public EstatisticasService(AudienciaRepository audienciaRepository,
                              VaraRepository varaRepository,
                              JuizRepository juizRepository,
                              PromotorRepository promotorRepository,
                              AdvogadoRepository advogadoRepository,
                              PessoaRepository pessoaRepository) {
        this.audienciaRepository = audienciaRepository;
        this.varaRepository = varaRepository;
        this.juizRepository = juizRepository;
        this.promotorRepository = promotorRepository;
        this.advogadoRepository = advogadoRepository;
        this.pessoaRepository = pessoaRepository;
    }

    public Map<String, Long> obterEstatisticasDashboard() {
        Map<String, Long> estatisticas = new HashMap<>();
        
        // Contar total de registros
        estatisticas.put("totalAudiencias", audienciaRepository.count());
        estatisticas.put("totalVaras", varaRepository.count());
        estatisticas.put("totalJuizes", juizRepository.count());
        estatisticas.put("totalPromotores", promotorRepository.count());
        estatisticas.put("totalAdvogados", advogadoRepository.count());
        estatisticas.put("totalPessoas", pessoaRepository.count());
        
        // Contar audiências de hoje
        LocalDate hoje = LocalDate.now();
        long audienciasHoje = audienciaRepository.findByDataAudiencia(hoje).size();
        estatisticas.put("audienciasHoje", audienciasHoje);
        
        return estatisticas;
    }
}