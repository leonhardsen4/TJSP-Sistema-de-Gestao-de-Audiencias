package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.model.RepresentacaoAdvogado;
import br.jus.tjsp.audiencias.model.enums.TipoRepresentacao;
import br.jus.tjsp.audiencias.repository.RepresentacaoAdvogadoRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RepresentacaoAdvogadoService {

    private final RepresentacaoAdvogadoRepository representacaoRepository;

    @Autowired
    public RepresentacaoAdvogadoService(RepresentacaoAdvogadoRepository representacaoRepository) {
        this.representacaoRepository = representacaoRepository;
    }

    public List<RepresentacaoAdvogado> listarTodos() {
        return representacaoRepository.findAll();
    }

    public RepresentacaoAdvogado buscarPorId(Long id) {
        return representacaoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Representação não encontrada com o ID: " + id));
    }

    public List<RepresentacaoAdvogado> buscarPorAudienciaId(Long audienciaId) {
        return representacaoRepository.findByAudienciaId(audienciaId);
    }

    public List<RepresentacaoAdvogado> buscarPorAdvogadoId(Long advogadoId) {
        return representacaoRepository.findByAdvogadoId(advogadoId);
    }

    public List<RepresentacaoAdvogado> buscarPorClienteId(Long clienteId) {
        return representacaoRepository.findByClienteId(clienteId);
    }

    public List<RepresentacaoAdvogado> buscarPorAudienciaETipo(Long audienciaId, TipoRepresentacao tipo) {
        return representacaoRepository.findByAudienciaIdAndTipo(audienciaId, tipo);
    }

    public RepresentacaoAdvogado salvar(RepresentacaoAdvogado representacao) {
        return representacaoRepository.save(representacao);
    }

    public RepresentacaoAdvogado atualizar(Long id, RepresentacaoAdvogado representacaoAtualizada) {
        RepresentacaoAdvogado representacaoExistente = buscarPorId(id);
        
        representacaoExistente.setAudiencia(representacaoAtualizada.getAudiencia());
        representacaoExistente.setAdvogado(representacaoAtualizada.getAdvogado());
        representacaoExistente.setCliente(representacaoAtualizada.getCliente());
        representacaoExistente.setTipo(representacaoAtualizada.getTipo());
        
        return representacaoRepository.save(representacaoExistente);
    }

    public void excluir(Long id) {
        RepresentacaoAdvogado representacao = buscarPorId(id);
        representacaoRepository.delete(representacao);
    }
}