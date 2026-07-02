package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.TesteBase;
import br.jus.tjsp.audiencias.config.Database;
import br.jus.tjsp.audiencias.web.ApiException;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Testes de cadastro, autenticação e gestão de senhas dos usuários.
 */
class UsuarioServiceTest extends TesteBase {

    /** Serviço sob teste. */
    private final UsuarioService servico = new UsuarioService();

    /** Corpo de cadastro válido reutilizado nos testes. */
    private static final Map<String, Object> CADASTRO_VALIDO = Map.of(
            "nomeCompleto", "Usuária de Teste",
            "email", "teste@tjsp.jus.br",
            "telefone", "11999998888",
            "matricula", "MAT12345",
            "senha", "segredo123");

    /**
     * O cadastro deve gravar a senha com hash BCrypt, nunca em texto claro.
     */
    @Test
    void cadastrarDeveGuardarSenhaComHash() {
        Map<String, Object> criado = servico.cadastrar(CADASTRO_VALIDO);
        assertNull(criado.get("senha"), "a resposta não pode expor a senha");

        String hash = Database.queryOne("SELECT senha FROM usuario WHERE id = ?",
                rs -> rs.getString(1), criado.get("id")).orElseThrow();
        assertTrue(hash.startsWith("$2a$"), "senha deve estar com hash BCrypt");
    }

    /**
     * E-mail e matrícula são únicos.
     */
    @Test
    void cadastroDuplicadoDeveFalhar() {
        servico.cadastrar(CADASTRO_VALIDO);
        ApiException erro = assertThrows(ApiException.class, () -> servico.cadastrar(CADASTRO_VALIDO));
        assertEquals(400, erro.getStatus());
        assertTrue(erro.getMessage().contains("já cadastrado"));
    }

    /**
     * Campos fora das regras (matrícula curta, senha curta, e-mail
     * inválido) devem ser rejeitados.
     */
    @Test
    void cadastroInvalidoDeveFalhar() {
        Map<String, Object> matriculaCurta = new java.util.HashMap<>(CADASTRO_VALIDO);
        matriculaCurta.put("matricula", "AB1");
        assertThrows(ApiException.class, () -> servico.cadastrar(matriculaCurta));

        Map<String, Object> senhaCurta = new java.util.HashMap<>(CADASTRO_VALIDO);
        senhaCurta.put("senha", "123");
        assertThrows(ApiException.class, () -> servico.cadastrar(senhaCurta));

        Map<String, Object> emailInvalido = new java.util.HashMap<>(CADASTRO_VALIDO);
        emailInvalido.put("email", "sem-arroba");
        assertThrows(ApiException.class, () -> servico.cadastrar(emailInvalido));
    }

    /**
     * O login deve funcionar tanto por e-mail quanto por matrícula e
     * devolver o usuário sem a senha.
     */
    @Test
    void autenticarPorEmailOuMatricula() {
        servico.cadastrar(CADASTRO_VALIDO);

        Map<String, Object> porEmail = servico.autenticar("teste@tjsp.jus.br", "segredo123");
        Map<?, ?> usuario = (Map<?, ?>) porEmail.get("usuario");
        assertEquals("Usuária de Teste", usuario.get("nomeCompleto"));
        assertFalse(usuario.containsKey("senha"));

        Map<String, Object> porMatricula = servico.autenticar("MAT12345", "segredo123");
        assertEquals(usuario.get("id"), ((Map<?, ?>) porMatricula.get("usuario")).get("id"));
    }

    /**
     * Senha errada ou usuário inexistente devem dar 401.
     */
    @Test
    void autenticarComCredenciaisErradasDeveDar401() {
        servico.cadastrar(CADASTRO_VALIDO);
        assertEquals(401, assertThrows(ApiException.class,
                () -> servico.autenticar("teste@tjsp.jus.br", "errada")).getStatus());
        assertEquals(401, assertThrows(ApiException.class,
                () -> servico.autenticar("naoexiste@x.com", "segredo123")).getStatus());
    }

    /**
     * Usuário desativado não pode entrar, mesmo com a senha certa.
     */
    @Test
    void usuarioInativoNaoDeveEntrar() {
        Map<String, Object> criado = servico.cadastrar(CADASTRO_VALIDO);
        Database.update("UPDATE usuario SET ativo = 0 WHERE id = ?", criado.get("id"));
        assertEquals(401, assertThrows(ApiException.class,
                () -> servico.autenticar("MAT12345", "segredo123")).getStatus());
    }

    /**
     * A troca de senha exige a senha atual e passa a valer imediatamente.
     */
    @Test
    void alterarSenhaDeveExigirSenhaAtual() {
        long id = ((Number) servico.cadastrar(CADASTRO_VALIDO).get("id")).longValue();

        assertThrows(ApiException.class, () -> servico.alterarSenha(id, "errada", "novaSenha1"));

        servico.alterarSenha(id, "segredo123", "novaSenha1");
        assertEquals(401, assertThrows(ApiException.class,
                () -> servico.autenticar("MAT12345", "segredo123")).getStatus());
        servico.autenticar("MAT12345", "novaSenha1");
    }

    /**
     * O reset administrativo redefine a senha sem pedir a atual e religa a
     * flag de primeiro acesso.
     */
    @Test
    void redefinirSenhaDeveForcarTrocaNoProximoLogin() {
        servico.cadastrar(CADASTRO_VALIDO);
        servico.redefinirSenha("MAT12345", "provisoria9");

        Map<String, Object> login = servico.autenticar("MAT12345", "provisoria9");
        assertEquals(true, login.get("primeiroAcesso"));
    }

    /**
     * Reset para usuário desconhecido deve dar 404.
     */
    @Test
    void redefinirSenhaDeUsuarioInexistenteDeveDar404() {
        assertEquals(404, assertThrows(ApiException.class,
                () -> servico.redefinirSenha("fantasma", "qualquer1")).getStatus());
    }
}
