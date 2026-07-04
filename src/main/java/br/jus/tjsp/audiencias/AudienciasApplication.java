package br.jus.tjsp.audiencias;

import br.jus.tjsp.audiencias.config.Database;
import br.jus.tjsp.audiencias.service.AudienciaService;
import br.jus.tjsp.audiencias.service.BackupService;
import br.jus.tjsp.audiencias.service.ExportacaoService;
import br.jus.tjsp.audiencias.service.UsuarioService;
import br.jus.tjsp.audiencias.web.Routes;
import io.javalin.Javalin;
import io.javalin.http.staticfiles.Location;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Ponto de entrada do Sistema de Gestão de Audiências do TJSP.
 *
 * <p>Inicializa o banco SQLite e sobe o servidor Javalin na porta 8080
 * (configurável pela variável de ambiente {@code PORT}). O caminho do
 * banco pode ser alterado pela variável {@code DB_PATH}.</p>
 *
 * <p>Também atende ao comando administrativo de redefinição de senha:
 * {@code java -jar audiencias.jar reset-senha <emailOuMatricula> <novaSenha>}.</p>
 */
public final class AudienciasApplication {

    private static final Logger log = LoggerFactory.getLogger(AudienciasApplication.class);

    private AudienciasApplication() {
        // Classe de inicialização: não instanciável.
    }

    /**
     * Inicia o servidor ou executa um comando administrativo.
     *
     * @param args vazio para subir o servidor, ou
     *             {@code reset-senha <emailOuMatricula> <novaSenha>}
     */
    public static void main(String[] args) {
        Database.init(System.getenv().getOrDefault("DB_PATH", "data/tjsp_audiencias.db"));

        if (args.length > 0 && "reset-senha".equals(args[0])) {
            executarResetSenha(args);
            return;
        }

        int porta = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        Javalin app = criarApp();
        app.start("0.0.0.0", porta);
        log.info("Sistema de Gestão de Audiências no ar em http://localhost:{}", porta);
        iniciarBackupSemanal();
    }

    /**
     * Agenda o backup automático semanal (CSV + cópia do banco na pasta
     * {@code backups/}). O primeiro roda alguns minutos após a subida do
     * servidor e, daí em diante, a cada 7 dias enquanto ele ficar no ar. O
     * backup manual continua disponível na tela de Configurações a qualquer
     * momento. A thread é daemon para não impedir o encerramento da JVM.
     */
    private static void iniciarBackupSemanal() {
        BackupService backup = new BackupService(
                new AudienciaService(), new ExportacaoService(), "backups");
        ScheduledExecutorService agendador = Executors.newSingleThreadScheduledExecutor(tarefa -> {
            Thread t = new Thread(tarefa, "backup-semanal");
            t.setDaemon(true);
            return t;
        });
        agendador.scheduleAtFixedRate(() -> {
            try {
                backup.executar();
                log.info("Backup automático semanal concluído.");
            } catch (Exception e) {
                log.error("Falha no backup automático: {}", e.getMessage(), e);
            }
        }, 5, TimeUnit.DAYS.toMinutes(7), TimeUnit.MINUTES);
    }

    /**
     * Cria e configura a aplicação Javalin: JSON via Jackson, CORS aberto
     * (uso local) e, se existir uma build do frontend em
     * {@code frontend/build}, serve os arquivos estáticos dela.
     *
     * @return aplicação configurada, ainda não iniciada
     */
    public static Javalin criarApp() {
        Javalin app = Javalin.create(config -> {
            config.showJavalinBanner = false;
            config.bundledPlugins.enableCors(cors -> cors.addRule(regra -> {
                regra.anyHost();
            }));
            Path build = Path.of("frontend", "build");
            if (Files.isDirectory(build)) {
                config.staticFiles.add(build.toString(), Location.EXTERNAL);
                config.spaRoot.addFile("/", build.resolve("index.html").toString(), Location.EXTERNAL);
            }
        });
        Routes.registrar(app);
        if (!Files.isDirectory(Path.of("frontend", "build"))) {
            // Sem build do frontend, a raiz orienta o usuário em vez de dar 404.
            app.get("/", ctx -> ctx.json(java.util.Map.of(
                    "sistema", "TJSP - Sistema de Gestão de Audiências",
                    "mensagem", "Esta porta serve apenas a API. Acesse a interface em http://localhost:3000 "
                            + "(ou gere a build do frontend com 'npm run build' para servi-la aqui).")));
        }
        return app;
    }

    /**
     * Executa o comando administrativo {@code reset-senha}, que redefine a
     * senha de um usuário e o marca para trocar a senha no próximo login.
     *
     * @param args argumentos da linha de comando
     */
    private static void executarResetSenha(String[] args) {
        if (args.length != 3) {
            System.err.println("Uso: reset-senha <emailOuMatricula> <novaSenha>");
            System.exit(1);
        }
        try {
            new UsuarioService().redefinirSenha(args[1], args[2]);
            System.out.println("Senha redefinida com sucesso para: " + args[1]);
        } catch (Exception e) {
            System.err.println("Falha ao redefinir senha: " + e.getMessage());
            System.exit(1);
        }
    }
}
