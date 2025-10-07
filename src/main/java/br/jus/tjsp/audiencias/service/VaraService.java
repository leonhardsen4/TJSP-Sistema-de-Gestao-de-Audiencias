package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.model.Vara;
import br.jus.tjsp.audiencias.repository.VaraRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class VaraService {

    private final VaraRepository varaRepository;

    @Autowired
    public VaraService(VaraRepository varaRepository) {
        this.varaRepository = varaRepository;
    }

    public List<Vara> listarTodas() {
        return varaRepository.findAll();
    }

    public Vara buscarPorId(Long id) {
        return varaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Vara não encontrada com o ID: " + id));
    }

    public List<Vara> buscarPorNome(String nome) {
        return varaRepository.findByNomeContainingIgnoreCase(nome);
    }

    public Vara salvar(Vara vara) {
        return varaRepository.save(vara);
    }

    public Vara atualizar(Long id, Vara varaAtualizada) {
        Vara varaExistente = buscarPorId(id);
        
        varaExistente.setNome(varaAtualizada.getNome());
        varaExistente.setTelefone(varaAtualizada.getTelefone());
        varaExistente.setEmail(varaAtualizada.getEmail());
        varaExistente.setObservacoes(varaAtualizada.getObservacoes());
        
        return varaRepository.save(varaExistente);
    }

    public void excluir(Long id) {
        Vara vara = buscarPorId(id);
        varaRepository.delete(vara);
    }
}