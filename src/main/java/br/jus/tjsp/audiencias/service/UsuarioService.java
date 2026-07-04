package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.config.Database;
import br.jus.tjsp.audiencias.web.ApiException;
import org.mindrot.jbcrypt.BCrypt;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Cadastro e autenticação de usuários do sistema.
 *
 * <p>As senhas são armazenadas com hash BCrypt. Não há fluxo de
 * recuperação de senha: o administrador redefine senhas pelo comando
 * de linha de comando {@code reset-senha} (ver {@link #redefinirSenha}).</p>
 */
public class UsuarioService {

    /** Matrícula: ao menos 6 caracteres alfanuméricos. */
    private static final Pattern PADRAO_MATRICULA = Pattern.compile("^[a-zA-Z0-9]{6,}$");

    /** Validação simples de formato de e-mail. */
    private static final Pattern PADRAO_EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    /**
     * Cadastra um novo usuário com a senha escolhida por ele próprio.
     *
     * @param dados corpo com {@code nomeCompleto}, {@code email}, {@code telefone},
     *              {@code matricula} e {@code senha}
     * @return usuário criado (sem o campo senha)
     * @throws ApiException 400 se algum campo for inválido ou e-mail/matrícula
     *                      já estiverem cadastrados
     */
    public Map<String, Object> cadastrar(Map<String, Object> dados) {
        String nome = texto(dados, "nomeCompleto");
        String email = texto(dados, "email");
        String telefone = texto(dados, "telefone");
        String matricula = texto(dados, "matricula");
        String senha = texto(dados, "senha");

        if (nome == null || nome.length() < 2 || nome.length() > 100) {
            throw new ApiException(400, "Nome completo deve ter entre 2 e 100 caracteres");
        }
        if (email == null || !PADRAO_EMAIL.matcher(email).matches()) {
            throw new ApiException(400, "E-mail inválido");
        }
        if (telefone == null || telefone.length() < 10 || telefone.length() > 15) {
            throw new ApiException(400, "Telefone deve ter entre 10 e 15 caracteres");
        }
        if (matricula == null || !PADRAO_MATRICULA.matcher(matricula).matches()) {
            throw new ApiException(400, "Matrícula deve ter ao menos 6 caracteres alfanuméricos");
        }
        if (senha == null || senha.length() < 6) {
            throw new ApiException(400, "Senha deve ter ao menos 6 caracteres");
        }
        if (Database.count("SELECT COUNT(*) FROM usuario WHERE email = ?", email) > 0) {
            throw new ApiException(400, "E-mail já cadastrado");
        }
        if (Database.count("SELECT COUNT(*) FROM usuario WHERE matricula = ?", matricula) > 0) {
            throw new ApiException(400, "Matrícula já cadastrada");
        }

        long id = Database.insert("""
                        INSERT INTO usuario (nome_completo, email, telefone, matricula, senha,
                            ativo, primeiro_acesso, data_cadastro)
                        VALUES (?, ?, ?, ?, ?, 1, 0, ?)
                        """,
                nome, email, telefone, matricula,
                BCrypt.hashpw(senha, BCrypt.gensalt()), LocalDateTime.now().toString());
        return buscarPorId(id);
    }

    /**
     * Autentica um usuário pelo e-mail ou pela matrícula.
     *
     * @param login e-mail ou matrícula
     * @param senha senha em texto claro para conferência
     * @return resposta {@code {usuario, primeiroAcesso}} esperada pela tela de login
     * @throws ApiException 401 se as credenciais forem inválidas ou o usuário
     *                      estiver inativo
     */
    public Map<String, Object> autenticar(String login, String senha) {
        if (login == null || login.isBlank() || senha == null || senha.isBlank()) {
            throw new ApiException(401, "Informe login e senha");
        }
        Optional<Map<String, Object>> linha = Database.queryOne(
                "SELECT * FROM usuario WHERE (email = ? OR matricula = ?) AND ativo = 1",
                this::mapearComSenha, login.strip(), login.strip());

        Map<String, Object> usuario = linha.orElseThrow(
                () -> new ApiException(401, "Usuário ou senha inválidos"));
        String hash = (String) usuario.remove("senha");
        if (!BCrypt.checkpw(senha, hash)) {
            throw new ApiException(401, "Usuário ou senha inválidos");
        }

        Database.update("UPDATE usuario SET ultimo_acesso = ? WHERE id = ?",
                LocalDateTime.now().toString(), usuario.get("id"));

        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("usuario", usuario);
        resposta.put("primeiroAcesso", usuario.get("primeiroAcesso"));
        return resposta;
    }

    /**
     * Altera a senha de um usuário mediante conferência da senha atual.
     * Também desliga a flag de primeiro acesso.
     *
     * @param id         id do usuário
     * @param senhaAtual senha vigente para conferência
     * @param novaSenha  nova senha (mínimo de 6 caracteres)
     * @throws ApiException 404 se o usuário não existir; 400 se a senha atual
     *                      não conferir ou a nova for curta demais
     */
    public void alterarSenha(long id, String senhaAtual, String novaSenha) {
        String hash = Database.queryOne("SELECT senha FROM usuario WHERE id = ?", rs -> rs.getString(1), id)
                .orElseThrow(() -> ApiException.naoEncontrado("Usuário não encontrado com id " + id));
        if (senhaAtual == null || !BCrypt.checkpw(senhaAtual, hash)) {
            throw new ApiException(400, "Senha atual incorreta");
        }
        if (novaSenha == null || novaSenha.length() < 6) {
            throw new ApiException(400, "Nova senha deve ter ao menos 6 caracteres");
        }
        Database.update(
                "UPDATE usuario SET senha = ?, primeiro_acesso = 0, data_alteracao_senha = ? WHERE id = ?",
                BCrypt.hashpw(novaSenha, BCrypt.gensalt()), LocalDateTime.now().toString(), id);
    }

    /**
     * Atualiza os dados de perfil (nome e e-mail) do usuário. Não altera
     * senha, matrícula ou telefone.
     *
     * @param id    id do usuário
     * @param dados corpo com {@code nomeCompleto} e {@code email}
     * @return usuário atualizado (sem a senha)
     * @throws ApiException 404 se o usuário não existir; 400 se algum campo for
     *                      inválido ou o e-mail já pertencer a outro usuário
     */
    public Map<String, Object> atualizarPerfil(long id, Map<String, Object> dados) {
        buscarPorId(id);
        String nome = texto(dados, "nomeCompleto");
        String email = texto(dados, "email");
        if (nome == null || nome.length() < 2 || nome.length() > 100) {
            throw new ApiException(400, "Nome completo deve ter entre 2 e 100 caracteres");
        }
        if (email == null || !PADRAO_EMAIL.matcher(email).matches()) {
            throw new ApiException(400, "E-mail inválido");
        }
        if (Database.count("SELECT COUNT(*) FROM usuario WHERE email = ? AND id <> ?", email, id) > 0) {
            throw new ApiException(400, "E-mail já cadastrado para outro usuário");
        }
        Database.update("UPDATE usuario SET nome_completo = ?, email = ? WHERE id = ?", nome, email, id);
        return buscarPorId(id);
    }

    /**
     * Busca um usuário pelo id, sem expor a senha.
     *
     * @param id identificador do usuário
     * @return usuário encontrado
     * @throws ApiException 404 se não existir
     */
    public Map<String, Object> buscarPorId(long id) {
        return Database.queryOne("SELECT * FROM usuario WHERE id = ?", this::mapear, id)
                .orElseThrow(() -> ApiException.naoEncontrado("Usuário não encontrado com id " + id));
    }

    /**
     * Redefine a senha de um usuário sem exigir a senha atual — uso
     * exclusivo do administrador pela linha de comando
     * ({@code java -jar audiencias.jar reset-senha <emailOuMatricula> <novaSenha>}).
     * A flag de primeiro acesso é religada para forçar a troca no próximo login.
     *
     * @param login     e-mail ou matrícula do usuário
     * @param novaSenha nova senha a definir (mínimo de 6 caracteres)
     * @throws ApiException 404 se o usuário não existir; 400 se a senha for curta
     */
    public void redefinirSenha(String login, String novaSenha) {
        if (novaSenha == null || novaSenha.length() < 6) {
            throw new ApiException(400, "Nova senha deve ter ao menos 6 caracteres");
        }
        Long id = Database.queryOne(
                        "SELECT id FROM usuario WHERE email = ? OR matricula = ?",
                        rs -> rs.getLong(1), login, login)
                .orElseThrow(() -> ApiException.naoEncontrado("Usuário não encontrado: " + login));
        Database.update(
                "UPDATE usuario SET senha = ?, primeiro_acesso = 1, data_alteracao_senha = ? WHERE id = ?",
                BCrypt.hashpw(novaSenha, BCrypt.gensalt()), LocalDateTime.now().toString(), id);
    }

    /**
     * Converte uma linha da tabela de usuários para o formato JSON da API,
     * omitindo a senha.
     *
     * @param rs result set posicionado na linha
     * @return usuário como mapa pronto para serialização
     * @throws SQLException se a leitura falhar
     */
    private Map<String, Object> mapear(ResultSet rs) throws SQLException {
        Map<String, Object> u = mapearComSenha(rs);
        u.remove("senha");
        return u;
    }

    /**
     * Converte uma linha da tabela de usuários incluindo o hash da senha
     * (uso interno na autenticação).
     *
     * @param rs result set posicionado na linha
     * @return usuário como mapa, com o campo {@code senha}
     * @throws SQLException se a leitura falhar
     */
    private Map<String, Object> mapearComSenha(ResultSet rs) throws SQLException {
        Map<String, Object> u = new LinkedHashMap<>();
        u.put("id", rs.getLong("id"));
        u.put("nomeCompleto", rs.getString("nome_completo"));
        u.put("email", rs.getString("email"));
        u.put("telefone", rs.getString("telefone"));
        u.put("matricula", rs.getString("matricula"));
        u.put("ativo", rs.getInt("ativo") != 0);
        u.put("primeiroAcesso", rs.getInt("primeiro_acesso") != 0);
        u.put("dataCadastro", rs.getString("data_cadastro"));
        u.put("ultimoAcesso", rs.getString("ultimo_acesso"));
        u.put("senha", rs.getString("senha"));
        return u;
    }

    /**
     * Lê um campo textual do corpo da requisição.
     *
     * @param dados corpo da requisição
     * @param campo nome do campo
     * @return texto sem espaços nas pontas, ou {@code null} se vazio/ausente
     */
    private static String texto(Map<String, Object> dados, String campo) {
        Object valor = dados == null ? null : dados.get(campo);
        if (valor == null || valor.toString().isBlank()) {
            return null;
        }
        return valor.toString().strip();
    }
}
