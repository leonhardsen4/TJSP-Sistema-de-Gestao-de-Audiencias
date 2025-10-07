package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.model.Advogado;
import br.jus.tjsp.audiencias.repository.AdvogadoRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AdvogadoService {

    private final AdvogadoRepository advogadoRepository;

    @Autowired
    public AdvogadoService(AdvogadoRepository advogadoRepository) {
        this.advogadoRepository = advogadoRepository;
    }

    public List<Advogado> listarTodos() {
        return advogadoRepository.findAll();
    }

    public Advogado buscarPorId(Long id) {
        return advogadoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Advogado não encontrado com o ID: " + id));
    }

    public List<Advogado> buscarPorNome(String nome) {
        return advogadoRepository.findByNomeContainingIgnoreCase(nome);
    }
    
    public List<Advogado> buscarPorOab(String oab) {
        return advogadoRepository.findByOabContainingIgnoreCase(oab);
    }

    public Advogado salvar(Advogado advogado) {
        return advogadoRepository.save(advogado);
    }

    public Advogado atualizar(Long id, Advogado advogadoAtualizado) {
        Advogado advogadoExistente = buscarPorId(id);
        
        advogadoExistente.setNome(advogadoAtualizado.getNome());
        advogadoExistente.setOab(advogadoAtualizado.getOab());
        advogadoExistente.setTelefone(advogadoAtualizado.getTelefone());
        advogadoExistente.setEmail(advogadoAtualizado.getEmail());
        advogadoExistente.setObservacoes(advogadoAtualizado.getObservacoes());
        
        return advogadoRepository.save(advogadoExistente);
    }

    public void excluir(Long id) {
        Advogado advogado = buscarPorId(id);
        advogadoRepository.delete(advogado);
    }
}