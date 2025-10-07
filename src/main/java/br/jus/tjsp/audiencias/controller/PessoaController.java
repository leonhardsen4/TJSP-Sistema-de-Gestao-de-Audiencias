package br.jus.tjsp.audiencias.controller;

import br.jus.tjsp.audiencias.model.Pessoa;
import br.jus.tjsp.audiencias.service.PessoaService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/pessoas")
@CrossOrigin(origins = "*")
public class PessoaController {

    private final PessoaService pessoaService;

    @Autowired
    public PessoaController(PessoaService pessoaService) {
        this.pessoaService = pessoaService;
    }

    @GetMapping
    public ResponseEntity<List<Pessoa>> listarTodos() {
        List<Pessoa> pessoas = pessoaService.listarTodos();
        return ResponseEntity.ok(pessoas);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Pessoa> buscarPorId(@PathVariable Long id) {
        Pessoa pessoa = pessoaService.buscarPorId(id);
        return ResponseEntity.ok(pessoa);
    }

    @GetMapping("/buscar/nome")
    public ResponseEntity<List<Pessoa>> buscarPorNome(@RequestParam String nome) {
        List<Pessoa> pessoas = pessoaService.buscarPorNome(nome);
        return ResponseEntity.ok(pessoas);
    }
    
    @GetMapping("/buscar/cpf")
    public ResponseEntity<List<Pessoa>> buscarPorCpf(@RequestParam String cpf) {
        List<Pessoa> pessoas = pessoaService.buscarPorCpf(cpf);
        return ResponseEntity.ok(pessoas);
    }

    @PostMapping
    public ResponseEntity<Pessoa> criar(@Valid @RequestBody Pessoa pessoa) {
        Pessoa novaPessoa = pessoaService.salvar(pessoa);
        return ResponseEntity.status(HttpStatus.CREATED).body(novaPessoa);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Pessoa> atualizar(@PathVariable Long id, @Valid @RequestBody Pessoa pessoa) {
        Pessoa pessoaAtualizada = pessoaService.atualizar(id, pessoa);
        return ResponseEntity.ok(pessoaAtualizada);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        pessoaService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}