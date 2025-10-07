package br.jus.tjsp.audiencias.controller;

import br.jus.tjsp.audiencias.model.ParticipacaoAudiencia;
import br.jus.tjsp.audiencias.model.enums.TipoParticipacao;
import br.jus.tjsp.audiencias.service.ParticipacaoAudienciaService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/participacoes")
@CrossOrigin(origins = "*")
public class ParticipacaoAudienciaController {

    private final ParticipacaoAudienciaService participacaoService;

    @Autowired
    public ParticipacaoAudienciaController(ParticipacaoAudienciaService participacaoService) {
        this.participacaoService = participacaoService;
    }

    @GetMapping
    public ResponseEntity<List<ParticipacaoAudiencia>> listarTodos() {
        List<ParticipacaoAudiencia> participacoes = participacaoService.listarTodos();
        return ResponseEntity.ok(participacoes);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ParticipacaoAudiencia> buscarPorId(@PathVariable Long id) {
        ParticipacaoAudiencia participacao = participacaoService.buscarPorId(id);
        return ResponseEntity.ok(participacao);
    }

    @GetMapping("/audiencia/{audienciaId}")
    public ResponseEntity<List<ParticipacaoAudiencia>> buscarPorAudienciaId(@PathVariable Long audienciaId) {
        List<ParticipacaoAudiencia> participacoes = participacaoService.buscarPorAudienciaId(audienciaId);
        return ResponseEntity.ok(participacoes);
    }

    @GetMapping("/pessoa/{pessoaId}")
    public ResponseEntity<List<ParticipacaoAudiencia>> buscarPorPessoaId(@PathVariable Long pessoaId) {
        List<ParticipacaoAudiencia> participacoes = participacaoService.buscarPorPessoaId(pessoaId);
        return ResponseEntity.ok(participacoes);
    }

    @GetMapping("/audiencia/{audienciaId}/tipo/{tipo}")
    public ResponseEntity<List<ParticipacaoAudiencia>> buscarPorAudienciaEtipo(
            @PathVariable Long audienciaId,
            @PathVariable TipoParticipacao tipo) {
        List<ParticipacaoAudiencia> participacoes = participacaoService.buscarPorAudienciaEtipo(audienciaId, tipo);
        return ResponseEntity.ok(participacoes);
    }

    @PostMapping
    public ResponseEntity<ParticipacaoAudiencia> criar(@Valid @RequestBody ParticipacaoAudiencia participacao) {
        ParticipacaoAudiencia novaParticipacao = participacaoService.salvar(participacao);
        return ResponseEntity.status(HttpStatus.CREATED).body(novaParticipacao);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ParticipacaoAudiencia> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody ParticipacaoAudiencia participacao) {
        ParticipacaoAudiencia participacaoAtualizada = participacaoService.atualizar(id, participacao);
        return ResponseEntity.ok(participacaoAtualizada);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        participacaoService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}