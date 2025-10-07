package br.jus.tjsp.audiencias.controller;

import br.jus.tjsp.audiencias.model.Advogado;
import br.jus.tjsp.audiencias.service.AdvogadoService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/advogados")
@CrossOrigin(origins = "*")
public class AdvogadoController {

    private final AdvogadoService advogadoService;

    @Autowired
    public AdvogadoController(AdvogadoService advogadoService) {
        this.advogadoService = advogadoService;
    }

    @GetMapping
    public ResponseEntity<List<Advogado>> listarTodos() {
        List<Advogado> advogados = advogadoService.listarTodos();
        return ResponseEntity.ok(advogados);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Advogado> buscarPorId(@PathVariable Long id) {
        Advogado advogado = advogadoService.buscarPorId(id);
        return ResponseEntity.ok(advogado);
    }

    @GetMapping("/buscar/nome")
    public ResponseEntity<List<Advogado>> buscarPorNome(@RequestParam String nome) {
        List<Advogado> advogados = advogadoService.buscarPorNome(nome);
        return ResponseEntity.ok(advogados);
    }
    
    @GetMapping("/buscar/oab")
    public ResponseEntity<List<Advogado>> buscarPorOab(@RequestParam String oab) {
        List<Advogado> advogados = advogadoService.buscarPorOab(oab);
        return ResponseEntity.ok(advogados);
    }

    @PostMapping
    public ResponseEntity<Advogado> criar(@Valid @RequestBody Advogado advogado) {
        Advogado novoAdvogado = advogadoService.salvar(advogado);
        return ResponseEntity.status(HttpStatus.CREATED).body(novoAdvogado);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Advogado> atualizar(@PathVariable Long id, @Valid @RequestBody Advogado advogado) {
        Advogado advogadoAtualizado = advogadoService.atualizar(id, advogado);
        return ResponseEntity.ok(advogadoAtualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        advogadoService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}