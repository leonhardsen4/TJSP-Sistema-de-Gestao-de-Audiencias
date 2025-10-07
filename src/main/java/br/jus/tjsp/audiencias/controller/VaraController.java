package br.jus.tjsp.audiencias.controller;

import br.jus.tjsp.audiencias.model.Vara;
import br.jus.tjsp.audiencias.service.VaraService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/varas")
@CrossOrigin(origins = "*")
public class VaraController {

    private final VaraService varaService;

    @Autowired
    public VaraController(VaraService varaService) {
        this.varaService = varaService;
    }

    @GetMapping
    public ResponseEntity<List<Vara>> listarTodas() {
        List<Vara> varas = varaService.listarTodas();
        return ResponseEntity.ok(varas);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Vara> buscarPorId(@PathVariable Long id) {
        Vara vara = varaService.buscarPorId(id);
        return ResponseEntity.ok(vara);
    }

    @GetMapping("/buscar")
    public ResponseEntity<List<Vara>> buscarPorNome(@RequestParam String nome) {
        List<Vara> varas = varaService.buscarPorNome(nome);
        return ResponseEntity.ok(varas);
    }

    @PostMapping
    public ResponseEntity<Vara> criar(@Valid @RequestBody Vara vara) {
        Vara novavara = varaService.salvar(vara);
        return ResponseEntity.status(HttpStatus.CREATED).body(novavara);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Vara> atualizar(@PathVariable Long id, @Valid @RequestBody Vara vara) {
        Vara varaAtualizada = varaService.atualizar(id, vara);
        return ResponseEntity.ok(varaAtualizada);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        varaService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}