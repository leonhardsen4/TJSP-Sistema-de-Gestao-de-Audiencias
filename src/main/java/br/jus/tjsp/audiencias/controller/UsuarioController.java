package br.jus.tjsp.audiencias.controller;

import br.jus.tjsp.audiencias.model.Usuario;
import br.jus.tjsp.audiencias.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.Map;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "http://localhost:3000")
public class UsuarioController {
    
    @Autowired
    private UsuarioService usuarioService;
    
    @PostMapping("/cadastrar")
    public ResponseEntity<?> cadastrarUsuario(@Valid @RequestBody Usuario usuario) {
        try {
            Usuario usuarioCadastrado = usuarioService.cadastrarUsuario(usuario);
            // Não retornar a senha na resposta
            usuarioCadastrado.setSenha(null);
            return ResponseEntity.ok(usuarioCadastrado);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("erro", e.getMessage()));
        }
    }
    
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        try {
            String login = credentials.get("login");
            String senha = credentials.get("senha");
            
            Usuario usuario = usuarioService.autenticar(login, senha);
            // Não retornar a senha na resposta
            usuario.setSenha(null);
            
            return ResponseEntity.ok(Map.of(
                "usuario", usuario,
                "primeiroAcesso", usuario.getPrimeiroAcesso()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("erro", e.getMessage()));
        }
    }
    
    @PostMapping("/{id}/alterar-senha")
    public ResponseEntity<?> alterarSenha(@PathVariable Long id, @RequestBody Map<String, String> senhas) {
        try {
            String senhaAtual = senhas.get("senhaAtual");
            String novaSenha = senhas.get("novaSenha");
            
            Usuario usuario = usuarioService.alterarSenha(id, senhaAtual, novaSenha);
            // Não retornar a senha na resposta
            usuario.setSenha(null);
            
            return ResponseEntity.ok(usuario);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("erro", e.getMessage()));
        }
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<?> buscarUsuario(@PathVariable Long id) {
        try {
            Usuario usuario = usuarioService.buscarPorId(id);
            // Não retornar a senha na resposta
            usuario.setSenha(null);
            return ResponseEntity.ok(usuario);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("erro", e.getMessage()));
        }
    }
}