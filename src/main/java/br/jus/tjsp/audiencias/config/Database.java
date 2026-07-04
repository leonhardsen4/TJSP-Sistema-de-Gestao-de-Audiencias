package br.jus.tjsp.audiencias.config;

import org.sqlite.SQLiteConfig;
import org.sqlite.SQLiteDataSource;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Ponto único de acesso ao banco de dados SQLite.
 *
 * <p>Responsável por inicializar o arquivo do banco, aplicar o esquema
 * ({@code schema.sql} no classpath) e oferecer métodos utilitários de
 * consulta e atualização via JDBC, dispensando qualquer framework de
 * persistência.</p>
 */
public final class Database {

    /** Fonte de conexões SQLite configurada em {@link #init(String)}. */
    private static SQLiteDataSource dataSource;

    /**
     * Conexão da transação em andamento na thread atual, se houver.
     * Enquanto estiver definida, {@link #query}, {@link #update} e
     * {@link #insert} operam sobre ela (sem abrir nem fechar conexão),
     * de modo que todos os comandos participem da mesma transação.
     */
    private static final ThreadLocal<Connection> TRANSACAO_ATUAL = new ThreadLocal<>();

    private Database() {
        // Classe utilitária: não instanciável.
    }

    /**
     * Ação executada dentro de uma transação, produzindo um resultado.
     *
     * @param <T> tipo do resultado
     */
    @FunctionalInterface
    public interface AcaoTransacional<T> {
        /**
         * Executa a ação. Qualquer exceção não verificada lançada aqui
         * provoca o rollback da transação.
         *
         * @return resultado da ação
         */
        T executar();
    }

    /**
     * Mapeia uma linha de {@link ResultSet} para um objeto.
     *
     * @param <T> tipo do objeto resultante
     */
    @FunctionalInterface
    public interface RowMapper<T> {
        /**
         * Converte a linha atual do {@code ResultSet} em um objeto.
         *
         * @param rs result set posicionado na linha a mapear
         * @return objeto mapeado
         * @throws SQLException se a leitura de alguma coluna falhar
         */
        T map(ResultSet rs) throws SQLException;
    }

    /**
     * Inicializa o banco de dados: cria o diretório do arquivo se preciso,
     * configura o SQLite (chaves estrangeiras ativas, modo WAL, tempo de
     * espera de bloqueio) e executa o {@code schema.sql}.
     *
     * @param caminhoArquivo caminho do arquivo do banco (ex.: {@code data/tjsp_audiencias.db})
     */
    public static synchronized void init(String caminhoArquivo) {
        try {
            Path caminho = Path.of(caminhoArquivo).toAbsolutePath();
            if (caminho.getParent() != null) {
                Files.createDirectories(caminho.getParent());
            }
            SQLiteConfig config = new SQLiteConfig();
            config.enforceForeignKeys(true);
            config.setJournalMode(SQLiteConfig.JournalMode.WAL);
            config.setBusyTimeout(5000);

            SQLiteDataSource ds = new SQLiteDataSource(config);
            ds.setUrl("jdbc:sqlite:" + caminho);
            dataSource = ds;

            executarSchema();
            executarMigracoes();
        } catch (IOException | SQLException e) {
            throw new IllegalStateException("Falha ao inicializar o banco de dados: " + e.getMessage(), e);
        }
    }

    /**
     * Aplica alterações de esquema em bancos criados por versões anteriores.
     * O {@code schema.sql} só cria tabelas novas (CREATE TABLE IF NOT EXISTS),
     * então colunas acrescentadas depois precisam de ALTER TABLE aqui.
     *
     * @throws SQLException se algum comando falhar
     */
    private static void executarMigracoes() throws SQLException {
        garantirColuna("participacao_audiencia", "status_mandado", "TEXT NOT NULL DEFAULT 'PENDENTE'");
        garantirColuna("participacao_audiencia", "folha_intimacao", "TEXT");

        // Introdução das pautas (jul/2026): audiências passam a pertencer a uma
        // pauta. Na primeira execução após a mudança (coluna pauta_id ainda
        // ausente), as audiências antigas — dados de teste sem pauta — são
        // removidas, conforme decidido pelo usuário em 03/07/2026.
        if (!colunaExiste("audiencia", "pauta_id")) {
            garantirColuna("audiencia", "pauta_id", "INTEGER REFERENCES pauta (id) ON DELETE CASCADE");
            try (Connection conn = getConnection(); Statement st = conn.createStatement()) {
                st.execute("DELETE FROM audiencia");
            }
        }
        // O índice fica fora do schema.sql porque em bancos antigos a coluna
        // só existe depois da migração acima.
        try (Connection conn = getConnection(); Statement st = conn.createStatement()) {
            st.execute("CREATE INDEX IF NOT EXISTS idx_audiencia_pauta ON audiencia (pauta_id)");
        }

        // Cor de exibição das pautas da vara no calendário (jul/2026).
        garantirColuna("vara", "cor", "TEXT");

        // Peças importantes do processo, anotadas na audiência (jul/2026).
        garantirColuna("audiencia", "denuncia", "INTEGER NOT NULL DEFAULT 0");
        garantirColuna("audiencia", "denuncia_folha", "TEXT");
        garantirColuna("audiencia", "defesa_previa", "INTEGER NOT NULL DEFAULT 0");
        garantirColuna("audiencia", "defesa_previa_folha", "TEXT");
        garantirColuna("audiencia", "fa_cdc", "INTEGER NOT NULL DEFAULT 0");
        garantirColuna("audiencia", "fa_cdc_folha", "TEXT");
        garantirColuna("audiencia", "laudo", "INTEGER NOT NULL DEFAULT 0");
        garantirColuna("audiencia", "laudo_folha", "TEXT");

        // Prisão anotada por participante; o reu_preso da audiência passa a
        // ser derivado automaticamente (jul/2026).
        garantirColuna("participacao_audiencia", "preso", "INTEGER NOT NULL DEFAULT 0");
        garantirColuna("participacao_audiencia", "local_prisao", "TEXT");
    }

    /**
     * Verifica se uma coluna existe em uma tabela.
     *
     * @param tabela tabela a inspecionar
     * @param coluna nome da coluna
     * @return {@code true} se a coluna existir
     * @throws SQLException se a consulta ao catálogo falhar
     */
    private static boolean colunaExiste(String tabela, String coluna) throws SQLException {
        try (Connection conn = getConnection(); Statement st = conn.createStatement();
             ResultSet rs = st.executeQuery("PRAGMA table_info(" + tabela + ")")) {
            while (rs.next()) {
                if (coluna.equalsIgnoreCase(rs.getString("name"))) {
                    return true;
                }
            }
            return false;
        }
    }

    /**
     * Adiciona uma coluna à tabela caso ela ainda não exista.
     *
     * @param tabela    tabela alvo
     * @param coluna    nome da coluna
     * @param definicao tipo e restrições da coluna no dialeto SQLite
     * @throws SQLException se a consulta ao catálogo ou o ALTER TABLE falharem
     */
    private static void garantirColuna(String tabela, String coluna, String definicao) throws SQLException {
        if (!colunaExiste(tabela, coluna)) {
            try (Connection conn = getConnection(); Statement st = conn.createStatement()) {
                st.execute("ALTER TABLE " + tabela + " ADD COLUMN " + coluna + " " + definicao);
            }
        }
    }

    /**
     * Executa o script {@code schema.sql} presente no classpath,
     * criando as tabelas e índices que ainda não existirem.
     *
     * @throws SQLException se algum comando do script falhar
     */
    private static void executarSchema() throws SQLException {
        String script;
        try (InputStream in = Database.class.getResourceAsStream("/schema.sql")) {
            if (in == null) {
                throw new IllegalStateException("schema.sql não encontrado no classpath");
            }
            script = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))
                    .lines().collect(Collectors.joining("\n"));
        } catch (IOException e) {
            throw new IllegalStateException("Falha ao ler schema.sql", e);
        }
        try (Connection conn = getConnection(); Statement st = conn.createStatement()) {
            for (String comando : script.split(";")) {
                String sql = comando.strip();
                if (!sql.isEmpty()) {
                    st.execute(sql);
                }
            }
        }
    }

    /**
     * Obtém uma conexão nova com o banco.
     *
     * @return conexão JDBC pronta para uso (deve ser fechada pelo chamador)
     * @throws SQLException se a conexão não puder ser aberta
     */
    public static Connection getConnection() throws SQLException {
        if (dataSource == null) {
            throw new IllegalStateException("Database.init() ainda não foi chamado");
        }
        return dataSource.getConnection();
    }

    /**
     * Executa um bloco de comandos de banco dentro de uma única transação:
     * ou tudo é confirmado ({@code commit}), ou nada é aplicado
     * ({@code rollback}) caso alguma exceção seja lançada. Enquanto o bloco
     * roda, as chamadas a {@link #query}, {@link #update} e {@link #insert}
     * na mesma thread usam a conexão da transação automaticamente.
     *
     * <p>Reentrante: se já houver uma transação ativa na thread, o bloco
     * apenas participa dela (não abre uma nova nem confirma sozinho).</p>
     *
     * @param acao bloco a executar; seu retorno é repassado ao chamador
     * @param <T>  tipo do resultado
     * @return o valor devolvido pela ação
     */
    public static <T> T executarEmTransacao(AcaoTransacional<T> acao) {
        // Já dentro de uma transação nesta thread: apenas participa dela.
        if (TRANSACAO_ATUAL.get() != null) {
            return acao.executar();
        }
        if (dataSource == null) {
            throw new IllegalStateException("Database.init() ainda não foi chamado");
        }
        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(false);
            TRANSACAO_ATUAL.set(conn);
            try {
                T resultado = acao.executar();
                conn.commit();
                return resultado;
            } catch (RuntimeException | Error e) {
                conn.rollback();
                throw e;
            } finally {
                TRANSACAO_ATUAL.remove();
            }
        } catch (SQLException e) {
            throw new IllegalStateException("Erro na transação: " + e.getMessage(), e);
        }
    }

    /**
     * Versão sem retorno de {@link #executarEmTransacao(AcaoTransacional)}.
     *
     * @param acao bloco a executar dentro da transação
     */
    public static void executarEmTransacao(Runnable acao) {
        executarEmTransacao(() -> {
            acao.run();
            return null;
        });
    }

    /**
     * Gera uma cópia consistente do banco no caminho informado, usando
     * {@code VACUUM INTO} do SQLite — seguro mesmo com o servidor no ar e o
     * modo WAL ativo. Não pode rodar dentro de uma transação.
     *
     * @param caminhoDestino caminho do arquivo de destino (será criado)
     */
    public static void backupPara(String caminhoDestino) {
        // O destino é gerado pelo servidor (pasta de backup + carimbo), sem
        // entrada do usuário; ainda assim, dobramos aspas simples por garantia.
        String destino = caminhoDestino.replace("'", "''");
        try (Connection conn = getConnection(); Statement st = conn.createStatement()) {
            st.execute("VACUUM INTO '" + destino + "'");
        } catch (SQLException e) {
            throw new IllegalStateException("Erro ao gerar cópia do banco: " + e.getMessage(), e);
        }
    }

    /**
     * Executa uma consulta e mapeia todas as linhas do resultado.
     *
     * @param sql    comando SQL com marcadores {@code ?}
     * @param mapper conversor de linha para objeto
     * @param params valores dos marcadores, na ordem
     * @param <T>    tipo dos objetos retornados
     * @return lista (possivelmente vazia) com as linhas mapeadas
     */
    public static <T> List<T> query(String sql, RowMapper<T> mapper, Object... params) {
        Connection tx = TRANSACAO_ATUAL.get();
        if (tx != null) {
            return consultarEm(tx, sql, mapper, params);
        }
        try (Connection conn = getConnection()) {
            return consultarEm(conn, sql, mapper, params);
        } catch (SQLException e) {
            throw new IllegalStateException("Erro na consulta SQL: " + e.getMessage(), e);
        }
    }

    /**
     * Executa a consulta em uma conexão específica (sem fechá-la), usada
     * tanto no caminho comum quanto dentro de uma transação.
     */
    private static <T> List<T> consultarEm(Connection conn, String sql, RowMapper<T> mapper, Object... params) {
        List<T> resultado = new ArrayList<>();
        try (PreparedStatement st = preparar(conn, sql, params); ResultSet rs = st.executeQuery()) {
            while (rs.next()) {
                resultado.add(mapper.map(rs));
            }
            return resultado;
        } catch (SQLException e) {
            throw new IllegalStateException("Erro na consulta SQL: " + e.getMessage(), e);
        }
    }

    /**
     * Executa uma consulta que retorna no máximo uma linha.
     *
     * @param sql    comando SQL com marcadores {@code ?}
     * @param mapper conversor de linha para objeto
     * @param params valores dos marcadores, na ordem
     * @param <T>    tipo do objeto retornado
     * @return a linha mapeada, ou vazio se a consulta não retornar nada
     */
    public static <T> Optional<T> queryOne(String sql, RowMapper<T> mapper, Object... params) {
        List<T> lista = query(sql, mapper, params);
        return lista.isEmpty() ? Optional.empty() : Optional.of(lista.get(0));
    }

    /**
     * Executa um comando de escrita (INSERT, UPDATE ou DELETE).
     *
     * @param sql    comando SQL com marcadores {@code ?}
     * @param params valores dos marcadores, na ordem
     * @return quantidade de linhas afetadas
     */
    public static int update(String sql, Object... params) {
        Connection tx = TRANSACAO_ATUAL.get();
        if (tx != null) {
            try (PreparedStatement st = preparar(tx, sql, params)) {
                return st.executeUpdate();
            } catch (SQLException e) {
                throw new IllegalStateException("Erro no comando SQL: " + e.getMessage(), e);
            }
        }
        try (Connection conn = getConnection(); PreparedStatement st = preparar(conn, sql, params)) {
            return st.executeUpdate();
        } catch (SQLException e) {
            throw new IllegalStateException("Erro no comando SQL: " + e.getMessage(), e);
        }
    }

    /**
     * Executa um INSERT e retorna a chave primária gerada.
     *
     * @param sql    comando INSERT com marcadores {@code ?}
     * @param params valores dos marcadores, na ordem
     * @return id gerado pelo banco para a nova linha
     */
    public static long insert(String sql, Object... params) {
        Connection tx = TRANSACAO_ATUAL.get();
        if (tx != null) {
            return inserirEm(tx, sql, params);
        }
        try (Connection conn = getConnection()) {
            return inserirEm(conn, sql, params);
        } catch (SQLException e) {
            throw new IllegalStateException("Erro no INSERT: " + e.getMessage(), e);
        }
    }

    /**
     * Executa o INSERT em uma conexão específica (sem fechá-la) e devolve a
     * chave gerada, usado tanto no caminho comum quanto dentro de transação.
     */
    private static long inserirEm(Connection conn, String sql, Object... params) {
        try (PreparedStatement st = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            aplicarParametros(st, params);
            st.executeUpdate();
            try (ResultSet chaves = st.getGeneratedKeys()) {
                if (chaves.next()) {
                    return chaves.getLong(1);
                }
            }
            throw new IllegalStateException("INSERT não retornou chave gerada");
        } catch (SQLException e) {
            throw new IllegalStateException("Erro no INSERT: " + e.getMessage(), e);
        }
    }

    /**
     * Executa uma consulta de contagem ({@code SELECT COUNT(...)}).
     *
     * @param sql    comando SQL cuja primeira coluna é um número
     * @param params valores dos marcadores, na ordem
     * @return valor da contagem
     */
    public static long count(String sql, Object... params) {
        return queryOne(sql, rs -> rs.getLong(1), params).orElse(0L);
    }

    /**
     * Prepara um statement aplicando os parâmetros informados.
     *
     * @param conn   conexão em uso
     * @param sql    comando SQL
     * @param params valores dos marcadores
     * @return statement pronto para execução
     * @throws SQLException se a preparação falhar
     */
    private static PreparedStatement preparar(Connection conn, String sql, Object... params) throws SQLException {
        PreparedStatement st = conn.prepareStatement(sql);
        aplicarParametros(st, params);
        return st;
    }

    /**
     * Define os valores dos marcadores {@code ?} de um statement.
     *
     * @param st     statement alvo
     * @param params valores na ordem dos marcadores
     * @throws SQLException se algum valor não puder ser definido
     */
    private static void aplicarParametros(PreparedStatement st, Object... params) throws SQLException {
        for (int i = 0; i < params.length; i++) {
            Object p = params[i];
            if (p instanceof Boolean b) {
                st.setInt(i + 1, b ? 1 : 0);
            } else {
                st.setObject(i + 1, p);
            }
        }
    }
}
