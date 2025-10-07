package br.jus.tjsp.audiencias.controller;

import br.jus.tjsp.audiencias.model.Promotor;
import br.jus.tjsp.audiencias.service.PromotorService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/promotores")
@CrossOrigin(origins = "*")
public class PromotorController {

    private final PromotorService promotorService;

    @Autowired
    public PromotorController(PromotorService promotorService) {
        this.promotorService = promotorService;
    }

    @GetMapping
    public ResponseEntity<List<Promotor>> listarTodos() {
        List<Promotor> promotores = promotorService.listarTodos();
        return ResponseEntity.ok(promotores);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Promotor> buscarPorId(@PathVariable Long id) {
        Promotor promotor = promotorService.buscarPorId(id);
        return ResponseEntity.ok(promotor);
    }

    @GetMapping("/buscar")
    public ResponseEntity<List<Promotor>> buscarPorNome(@RequestParam String nome) {
        List<Promotor> promotores = promotorService.buscarPorNome(nome);
        return ResponseEntity.ok(promotores);
    }

    @PostMapping
    public ResponseEntity<Promotor> criar(@Valid @RequestBody Promotor promotor) {
        Promotor novoPromotor = promotorService.salvar(promotor);
        return ResponseEntity.status(HttpStatus.CREATED).body(novoPromotor);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Promotor> atualizar(@PathVariable Long id, @Valid @RequestBody Promotor promotor) {
        Promotor promotorAtualizado = promotorService.atualizar(id, promotor);
        return ResponseEntity.ok(promotorAtualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        promotorService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}