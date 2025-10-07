package br.jus.tjsp.audiencias.controller;

import br.jus.tjsp.audiencias.model.Juiz;
import br.jus.tjsp.audiencias.service.JuizService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/juizes")
@CrossOrigin(origins = "*")
public class JuizController {

    private final JuizService juizService;

    @Autowired
    public JuizController(JuizService juizService) {
        this.juizService = juizService;
    }

    @GetMapping
    public ResponseEntity<List<Juiz>> listarTodos() {
        List<Juiz> juizes = juizService.listarTodos();
        return ResponseEntity.ok(juizes);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Juiz> buscarPorId(@PathVariable Long id) {
        Juiz juiz = juizService.buscarPorId(id);
        return ResponseEntity.ok(juiz);
    }

    @GetMapping("/buscar")
    public ResponseEntity<List<Juiz>> buscarPorNome(@RequestParam String nome) {
        List<Juiz> juizes = juizService.buscarPorNome(nome);
        return ResponseEntity.ok(juizes);
    }

    @PostMapping
    public ResponseEntity<Juiz> criar(@Valid @RequestBody Juiz juiz) {
        Juiz novoJuiz = juizService.salvar(juiz);
        return ResponseEntity.status(HttpStatus.CREATED).body(novoJuiz);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Juiz> atualizar(@PathVariable Long id, @Valid @RequestBody Juiz juiz) {
        Juiz juizAtualizado = juizService.atualizar(id, juiz);
        return ResponseEntity.ok(juizAtualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        juizService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}