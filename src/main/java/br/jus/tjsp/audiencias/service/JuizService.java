package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.model.Juiz;
import br.jus.tjsp.audiencias.repository.JuizRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class JuizService {

    private final JuizRepository juizRepository;

    @Autowired
    public JuizService(JuizRepository juizRepository) {
        this.juizRepository = juizRepository;
    }

    public List<Juiz> listarTodos() {
        return juizRepository.findAll();
    }

    public Juiz buscarPorId(Long id) {
        return juizRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Juiz não encontrado com o ID: " + id));
    }

    public List<Juiz> buscarPorNome(String nome) {
        return juizRepository.findByNomeContainingIgnoreCase(nome);
    }

    public Juiz salvar(Juiz juiz) {
        return juizRepository.save(juiz);
    }

    public Juiz atualizar(Long id, Juiz juizAtualizado) {
        Juiz juizExistente = buscarPorId(id);
        
        juizExistente.setNome(juizAtualizado.getNome());
        juizExistente.setTelefone(juizAtualizado.getTelefone());
        juizExistente.setEmail(juizAtualizado.getEmail());
        juizExistente.setObservacoes(juizAtualizado.getObservacoes());
        
        return juizRepository.save(juizExistente);
    }

    public void excluir(Long id) {
        Juiz juiz = buscarPorId(id);
        juizRepository.delete(juiz);
    }
}