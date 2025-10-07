package br.jus.tjsp.audiencias.controller;

import br.jus.tjsp.audiencias.model.Audiencia;
import br.jus.tjsp.audiencias.model.ParticipacaoAudiencia;
import br.jus.tjsp.audiencias.model.Pessoa;
import br.jus.tjsp.audiencias.model.RepresentacaoAdvogado;
import br.jus.tjsp.audiencias.model.Advogado;
import br.jus.tjsp.audiencias.model.enums.TipoParticipacao;
import br.jus.tjsp.audiencias.model.enums.TipoRepresentacao;
import br.jus.tjsp.audiencias.service.AudienciaService;
import br.jus.tjsp.audiencias.service.ParticipacaoAudienciaService;
import br.jus.tjsp.audiencias.service.PessoaService;
import br.jus.tjsp.audiencias.service.RepresentacaoAdvogadoService;
import br.jus.tjsp.audiencias.service.AdvogadoService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/audiencias")
@CrossOrigin(origins = "*")
public class AudienciaParticipanteController {

    private final AudienciaService audienciaService;
    private final ParticipacaoAudienciaService participacaoService;
    private final PessoaService pessoaService;
    private final RepresentacaoAdvogadoService representacaoService;
    private final AdvogadoService advogadoService;

    @Autowired
    public AudienciaParticipanteController(
            AudienciaService audienciaService,
            ParticipacaoAudienciaService participacaoService,
            PessoaService pessoaService,
            RepresentacaoAdvogadoService representacaoService,
            AdvogadoService advogadoService) {
        this.audienciaService = audienciaService;
        this.participacaoService = participacaoService;
        this.pessoaService = pessoaService;
        this.representacaoService = representacaoService;
        this.advogadoService = advogadoService;
    }

    @GetMapping("/{audienciaId}/participantes")
    public ResponseEntity<List<ParticipacaoAudiencia>> listarParticipantes(@PathVariable Long audienciaId) {
        List<ParticipacaoAudiencia> participantes = participacaoService.buscarPorAudienciaId(audienciaId);
        return ResponseEntity.ok(participantes);
    }

    @PostMapping("/{audienciaId}/participantes")
    public ResponseEntity<ParticipacaoAudiencia> adicionarParticipante(
            @PathVariable Long audienciaId,
            @Valid @RequestBody Map<String, Object> participanteData) {
        
        try {
            Audiencia audiencia = audienciaService.buscarPorId(audienciaId);
            Pessoa pessoa = pessoaService.buscarPorId(Long.valueOf(participanteData.get("pessoaId").toString()));
            
            ParticipacaoAudiencia participacao = new ParticipacaoAudiencia();
            participacao.setAudiencia(audiencia);
            participacao.setPessoa(pessoa);
            participacao.setTipo(TipoParticipacao.valueOf(participanteData.get("tipo").toString()));
            participacao.setIntimado((Boolean) participanteData.getOrDefault("intimado", false));
            participacao.setObservacoes((String) participanteData.get("observacoes"));
            
            ParticipacaoAudiencia novaParticipacao = participacaoService.salvar(participacao);
            
            // Se foi especificado um advogado, criar a representação
            if (participanteData.containsKey("advogadoId") && participanteData.get("advogadoId") != null) {
                Long advogadoId = Long.valueOf(participanteData.get("advogadoId").toString());
                Advogado advogado = advogadoService.buscarPorId(advogadoId);
                
                RepresentacaoAdvogado representacao = new RepresentacaoAdvogado();
                representacao.setAudiencia(audiencia);
                representacao.setAdvogado(advogado);
                representacao.setCliente(pessoa);
                
                if (participanteData.containsKey("tipoRepresentacao") && participanteData.get("tipoRepresentacao") != null) {
                    representacao.setTipo(TipoRepresentacao.valueOf(participanteData.get("tipoRepresentacao").toString()));
                } else {
                    representacao.setTipo(TipoRepresentacao.DEFESA);
                }
                
                representacaoService.salvar(representacao);
            }
            
            return ResponseEntity.status(HttpStatus.CREATED).body(novaParticipacao);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/{audienciaId}/participantes")
    public ResponseEntity<Void> removerTodosParticipantes(@PathVariable Long audienciaId) {
        List<ParticipacaoAudiencia> participantes = participacaoService.buscarPorAudienciaId(audienciaId);
        
        // Remover representações primeiro
        List<RepresentacaoAdvogado> representacoes = representacaoService.buscarPorAudienciaId(audienciaId);
        for (RepresentacaoAdvogado representacao : representacoes) {
            representacaoService.excluir(representacao.getId());
        }
        
        // Remover participações
        for (ParticipacaoAudiencia participacao : participantes) {
            participacaoService.excluir(participacao.getId());
        }
        
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{audienciaId}/participantes/{participanteId}")
    public ResponseEntity<Void> removerParticipante(
            @PathVariable Long audienciaId,
            @PathVariable Long participanteId) {
        
        ParticipacaoAudiencia participacao = participacaoService.buscarPorId(participanteId);
        
        // Remover representação se existir
        List<RepresentacaoAdvogado> representacoes = representacaoService.buscarPorClienteId(participacao.getPessoa().getId());
        for (RepresentacaoAdvogado representacao : representacoes) {
            if (representacao.getAudiencia().getId().equals(audienciaId)) {
                representacaoService.excluir(representacao.getId());
            }
        }
        
        participacaoService.excluir(participanteId);
        return ResponseEntity.noContent().build();
    }
}