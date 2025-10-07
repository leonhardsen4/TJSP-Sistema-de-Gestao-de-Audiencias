package br.jus.tjsp.audiencias.controller;

import br.jus.tjsp.audiencias.model.RepresentacaoAdvogado;
import br.jus.tjsp.audiencias.model.enums.TipoRepresentacao;
import br.jus.tjsp.audiencias.service.RepresentacaoAdvogadoService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/representacoes")
@CrossOrigin(origins = "*")
public class RepresentacaoAdvogadoController {

    private final RepresentacaoAdvogadoService representacaoService;

    @Autowired
    public RepresentacaoAdvogadoController(RepresentacaoAdvogadoService representacaoService) {
        this.representacaoService = representacaoService;
    }

    @GetMapping
    public ResponseEntity<List<RepresentacaoAdvogado>> listarTodos() {
        List<RepresentacaoAdvogado> representacoes = representacaoService.listarTodos();
        return ResponseEntity.ok(representacoes);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RepresentacaoAdvogado> buscarPorId(@PathVariable Long id) {
        RepresentacaoAdvogado representacao = representacaoService.buscarPorId(id);
        return ResponseEntity.ok(representacao);
    }

    @GetMapping("/audiencia/{audienciaId}")
    public ResponseEntity<List<RepresentacaoAdvogado>> buscarPorAudienciaId(@PathVariable Long audienciaId) {
        List<RepresentacaoAdvogado> representacoes = representacaoService.buscarPorAudienciaId(audienciaId);
        return ResponseEntity.ok(representacoes);
    }

    @GetMapping("/advogado/{advogadoId}")
    public ResponseEntity<List<RepresentacaoAdvogado>> buscarPorAdvogadoId(@PathVariable Long advogadoId) {
        List<RepresentacaoAdvogado> representacoes = representacaoService.buscarPorAdvogadoId(advogadoId);
        return ResponseEntity.ok(representacoes);
    }

    @GetMapping("/cliente/{clienteId}")
    public ResponseEntity<List<RepresentacaoAdvogado>> buscarPorClienteId(@PathVariable Long clienteId) {
        List<RepresentacaoAdvogado> representacoes = representacaoService.buscarPorClienteId(clienteId);
        return ResponseEntity.ok(representacoes);
    }

    @GetMapping("/audiencia/{audienciaId}/tipo/{tipo}")
    public ResponseEntity<List<RepresentacaoAdvogado>> buscarPorAudienciaETipo(
            @PathVariable Long audienciaId,
            @PathVariable TipoRepresentacao tipo) {
        List<RepresentacaoAdvogado> representacoes = representacaoService.buscarPorAudienciaETipo(audienciaId, tipo);
        return ResponseEntity.ok(representacoes);
    }

    @PostMapping
    public ResponseEntity<RepresentacaoAdvogado> criar(@Valid @RequestBody RepresentacaoAdvogado representacao) {
        RepresentacaoAdvogado novaRepresentacao = representacaoService.salvar(representacao);
        return ResponseEntity.status(HttpStatus.CREATED).body(novaRepresentacao);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RepresentacaoAdvogado> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody RepresentacaoAdvogado representacao) {
        RepresentacaoAdvogado representacaoAtualizada = representacaoService.atualizar(id, representacao);
        return ResponseEntity.ok(representacaoAtualizada);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        representacaoService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}