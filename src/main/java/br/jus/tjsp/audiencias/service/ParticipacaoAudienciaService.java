package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.model.ParticipacaoAudiencia;
import br.jus.tjsp.audiencias.model.enums.TipoParticipacao;
import br.jus.tjsp.audiencias.repository.ParticipacaoAudienciaRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ParticipacaoAudienciaService {

    private final ParticipacaoAudienciaRepository participacaoRepository;

    @Autowired
    public ParticipacaoAudienciaService(ParticipacaoAudienciaRepository participacaoRepository) {
        this.participacaoRepository = participacaoRepository;
    }

    public List<ParticipacaoAudiencia> listarTodos() {
        return participacaoRepository.findAll();
    }

    public ParticipacaoAudiencia buscarPorId(Long id) {
        return participacaoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Participação não encontrada com o ID: " + id));
    }

    public List<ParticipacaoAudiencia> buscarPorAudienciaId(Long audienciaId) {
        return participacaoRepository.findByAudienciaId(audienciaId);
    }

    public List<ParticipacaoAudiencia> buscarPorPessoaId(Long pessoaId) {
        return participacaoRepository.findByPessoaId(pessoaId);
    }

    public List<ParticipacaoAudiencia> buscarPorAudienciaEtipo(Long audienciaId, TipoParticipacao tipo) {
        return participacaoRepository.findByAudienciaIdAndTipo(audienciaId, tipo);
    }

    public ParticipacaoAudiencia salvar(ParticipacaoAudiencia participacao) {
        return participacaoRepository.save(participacao);
    }

    public ParticipacaoAudiencia atualizar(Long id, ParticipacaoAudiencia participacaoAtualizada) {
        ParticipacaoAudiencia participacaoExistente = buscarPorId(id);
        
        participacaoExistente.setAudiencia(participacaoAtualizada.getAudiencia());
        participacaoExistente.setPessoa(participacaoAtualizada.getPessoa());
        participacaoExistente.setTipo(participacaoAtualizada.getTipo());
        participacaoExistente.setIntimado(participacaoAtualizada.getIntimado());
        participacaoExistente.setObservacoes(participacaoAtualizada.getObservacoes());
        
        return participacaoRepository.save(participacaoExistente);
    }

    public void excluir(Long id) {
        ParticipacaoAudiencia participacao = buscarPorId(id);
        participacaoRepository.delete(participacao);
    }
}