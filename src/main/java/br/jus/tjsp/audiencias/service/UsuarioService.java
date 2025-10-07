package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.model.Usuario;
import br.jus.tjsp.audiencias.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
public class UsuarioService {
    
    @Autowired
    private UsuarioRepository usuarioRepository;
    
    @Autowired
    private EmailService emailService;
    
    private static final String CARACTERES_SENHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*";
    private static final int TAMANHO_SENHA = 8;
    private static final Pattern PATTERN_MATRICULA = Pattern.compile("^[a-zA-Z0-9]{6,}$");
    
    public Usuario cadastrarUsuario(Usuario usuario) {
        // Validar se email já existe
        if (usuarioRepository.existsByEmail(usuario.getEmail())) {
            throw new RuntimeException("Email já cadastrado no sistema");
        }
        
        // Validar se matrícula já existe
        if (usuarioRepository.existsByMatricula(usuario.getMatricula())) {
            throw new RuntimeException("Matrícula já cadastrada no sistema");
        }
        
        // Validar formato da matrícula
        if (!PATTERN_MATRICULA.matcher(usuario.getMatricula()).matches()) {
            throw new RuntimeException("Matrícula deve conter no mínimo 6 caracteres alfanuméricos");
        }
        
        // Se não foi fornecida uma senha, gerar uma aleatória
        if (usuario.getSenha() == null || usuario.getSenha().trim().isEmpty()) {
            String senhaGerada = gerarSenhaAleatoria();
            usuario.setSenha(senhaGerada);
            usuario.setPrimeiroAcesso(true);
            
            // Salvar usuário
            Usuario usuarioSalvo = usuarioRepository.save(usuario);
            usuarioSalvo.setDataCadastro(LocalDateTime.now());
            usuarioSalvo.setAtivo(true);
            
            // Enviar senha por email
            emailService.enviarSenhaPorEmail(usuarioSalvo.getEmail(), usuarioSalvo.getNomeCompleto(), senhaGerada);
            
            return usuarioSalvo;
        } else {
            // Usar a senha fornecida pelo usuário
            usuario.setDataCadastro(LocalDateTime.now());
            usuario.setPrimeiroAcesso(false); // Não é primeiro acesso se o usuário definiu a senha
            usuario.setAtivo(true);
            
            // Salvar usuário
            Usuario usuarioSalvo = usuarioRepository.save(usuario);
            
            return usuarioSalvo;
        }
    }
    
    public Usuario autenticar(String login, String senha) {
        Usuario usuario = null;
        
        // Tentar buscar por email primeiro
        Optional<Usuario> usuarioOpt = usuarioRepository.findByEmailAndAtivoTrue(login);
        if (usuarioOpt.isEmpty()) {
            // Se não encontrou por email, tentar por matrícula
            usuarioOpt = usuarioRepository.findByMatriculaAndAtivoTrue(login);
        }
        
        if (usuarioOpt.isPresent()) {
            usuario = usuarioOpt.get();
            if (usuario.getSenha().equals(senha)) {
                usuario.setUltimoAcesso(LocalDateTime.now());
                usuarioRepository.save(usuario);
                return usuario;
            }
        }
        
        throw new RuntimeException("Credenciais inválidas");
    }
    
    public Usuario alterarSenha(Long usuarioId, String senhaAtual, String novaSenha) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
            .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        
        if (!usuario.getSenha().equals(senhaAtual)) {
            throw new RuntimeException("Senha atual incorreta");
        }
        
        if (novaSenha.length() < 6) {
            throw new RuntimeException("Nova senha deve ter no mínimo 6 caracteres");
        }
        
        usuario.setSenha(novaSenha);
        usuario.setPrimeiroAcesso(false);
        usuario.setDataAlteracaoSenha(LocalDateTime.now());
        
        return usuarioRepository.save(usuario);
    }
    
    public Usuario buscarPorId(Long id) {
        return usuarioRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
    }
    

    
    private String gerarSenhaAleatoria() {
        SecureRandom random = new SecureRandom();
        StringBuilder senha = new StringBuilder();
        
        for (int i = 0; i < TAMANHO_SENHA; i++) {
            int index = random.nextInt(CARACTERES_SENHA.length());
            senha.append(CARACTERES_SENHA.charAt(index));
        }
        
        return senha.toString();
    }
}