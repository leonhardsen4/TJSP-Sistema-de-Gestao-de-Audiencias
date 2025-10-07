package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.model.Pessoa;
import br.jus.tjsp.audiencias.repository.PessoaRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PessoaService {

    private final PessoaRepository pessoaRepository;

    @Autowired
    public PessoaService(PessoaRepository pessoaRepository) {
        this.pessoaRepository = pessoaRepository;
    }

    public List<Pessoa> listarTodos() {
        return pessoaRepository.findAll();
    }

    public Pessoa buscarPorId(Long id) {
        return pessoaRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Pessoa não encontrada com o ID: " + id));
    }

    public List<Pessoa> buscarPorNome(String nome) {
        return pessoaRepository.findByNomeContainingIgnoreCase(nome);
    }
    
    public List<Pessoa> buscarPorCpf(String cpf) {
        return pessoaRepository.findByCpf(cpf)
                .map(List::of)
                .orElse(List.of());
    }

    public Pessoa salvar(Pessoa pessoa) {
        return pessoaRepository.save(pessoa);
    }

    public Pessoa atualizar(Long id, Pessoa pessoaAtualizada) {
        Pessoa pessoaExistente = buscarPorId(id);
        
        pessoaExistente.setNome(pessoaAtualizada.getNome());
        pessoaExistente.setCpf(pessoaAtualizada.getCpf());
        pessoaExistente.setTelefone(pessoaAtualizada.getTelefone());
        pessoaExistente.setEmail(pessoaAtualizada.getEmail());
        pessoaExistente.setObservacoes(pessoaAtualizada.getObservacoes());
        
        return pessoaRepository.save(pessoaExistente);
    }

    public void excluir(Long id) {
        Pessoa pessoa = buscarPorId(id);
        pessoaRepository.delete(pessoa);
    }
}