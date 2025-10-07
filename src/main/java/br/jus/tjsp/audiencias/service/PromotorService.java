package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.model.Promotor;
import br.jus.tjsp.audiencias.repository.PromotorRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PromotorService {

    private final PromotorRepository promotorRepository;

    @Autowired
    public PromotorService(PromotorRepository promotorRepository) {
        this.promotorRepository = promotorRepository;
    }

    public List<Promotor> listarTodos() {
        return promotorRepository.findAll();
    }

    public Promotor buscarPorId(Long id) {
        return promotorRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Promotor não encontrado com o ID: " + id));
    }

    public List<Promotor> buscarPorNome(String nome) {
        return promotorRepository.findByNomeContainingIgnoreCase(nome);
    }

    public Promotor salvar(Promotor promotor) {
        return promotorRepository.save(promotor);
    }

    public Promotor atualizar(Long id, Promotor promotorAtualizado) {
        Promotor promotorExistente = buscarPorId(id);
        
        promotorExistente.setNome(promotorAtualizado.getNome());
        promotorExistente.setTelefone(promotorAtualizado.getTelefone());
        promotorExistente.setEmail(promotorAtualizado.getEmail());
        promotorExistente.setObservacoes(promotorAtualizado.getObservacoes());
        
        return promotorRepository.save(promotorExistente);
    }

    public void excluir(Long id) {
        Promotor promotor = buscarPorId(id);
        promotorRepository.delete(promotor);
    }
}