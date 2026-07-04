package br.jus.tjsp.audiencias.service;

import br.jus.tjsp.audiencias.config.Database;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Stream;

/**
 * Backup simples do sistema para uma pasta local ({@code backups/}).
 *
 * <p>Cada backup gera dois arquivos, com carimbo de data/hora no nome:</p>
 * <ul>
 *   <li>uma planilha <b>CSV</b> com todas as audiências (abre no Excel), e</li>
 *   <li>uma <b>cópia do banco</b> ({@code .db}) via {@code VACUUM INTO},
 *       que é um backup restaurável de verdade.</li>
 * </ul>
 *
 * <p>Pode ser disparado sob demanda (botão na tela de Configurações) ou
 * automaticamente (agendamento semanal em {@code AudienciasApplication}).
 * A pasta é criada se não existir, e mantém-se apenas um histórico recente
 * (ver {@link #MAX_HISTORICO}).</p>
 */
public class BackupService {

    /** Formato do carimbo usado no nome dos arquivos de backup. */
    private static final DateTimeFormatter CARIMBO =
            DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss");

    /** Quantos backups de cada tipo manter (os mais antigos são apagados). */
    private static final int MAX_HISTORICO = 20;

    /** Serializa as execuções, mesmo vindas de instâncias diferentes. */
    private static final Object TRAVA = new Object();

    private final AudienciaService audiencias;
    private final ExportacaoService exportacao;
    private final Path pasta;

    /**
     * @param audiencias serviço para listar as audiências (fonte do CSV)
     * @param exportacao gerador do CSV
     * @param pastaBackup caminho da pasta de backups (ex.: {@code backups})
     */
    public BackupService(AudienciaService audiencias, ExportacaoService exportacao, String pastaBackup) {
        this.audiencias = audiencias;
        this.exportacao = exportacao;
        this.pasta = Path.of(pastaBackup);
    }

    /**
     * Executa um backup completo (CSV + cópia do banco) na pasta configurada,
     * criando-a se necessário e limpando o histórico antigo.
     *
     * @return situação atualizada da pasta de backups (ver {@link #status()})
     */
    public Map<String, Object> executar() {
        synchronized (TRAVA) {
            try {
                Files.createDirectories(pasta);
                String carimbo = LocalDateTime.now().format(CARIMBO);

                Path csv = pasta.resolve("audiencias_" + carimbo + ".csv");
                Files.write(csv, exportacao.gerarCsv(audiencias.listar((String) null)));

                Path banco = pasta.resolve("banco_" + carimbo + ".db");
                Database.backupPara(banco.toAbsolutePath().toString());

                limparHistorico("audiencias_", ".csv");
                limparHistorico("banco_", ".db");
                return status();
            } catch (IOException e) {
                throw new UncheckedIOException("Falha ao gravar o backup", e);
            }
        }
    }

    /**
     * Situação atual da pasta de backups: caminho absoluto, quantidade de
     * backups e data/hora do mais recente.
     *
     * @return mapa pronto para serialização na API
     */
    public Map<String, Object> status() {
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("pasta", pasta.toAbsolutePath().toString());
        Path ultimo = maisRecente("banco_", ".db");
        info.put("quantidade", contar("banco_", ".db"));
        info.put("ultimoBackup", ultimo == null ? null : dataDoArquivo(ultimo));
        return info;
    }

    /** Remove os arquivos mais antigos de um tipo, além do limite. */
    private void limparHistorico(String prefixo, String sufixo) {
        if (!Files.isDirectory(pasta)) {
            return;
        }
        try (Stream<Path> arquivos = Files.list(pasta)) {
            arquivos
                    .filter(p -> corresponde(p, prefixo, sufixo))
                    .sorted(Comparator.comparing((Path p) -> p.getFileName().toString()).reversed())
                    .skip(MAX_HISTORICO)
                    .forEach(p -> {
                        try {
                            Files.deleteIfExists(p);
                        } catch (IOException e) {
                            // Falha ao apagar um antigo não invalida o backup novo.
                        }
                    });
        } catch (IOException e) {
            // Limpeza é melhor-esforço; ignora se a pasta não puder ser lida.
        }
    }

    /** O arquivo mais recente de um tipo (pelo nome, que tem carimbo), ou null. */
    private Path maisRecente(String prefixo, String sufixo) {
        if (!Files.isDirectory(pasta)) {
            return null;
        }
        try (Stream<Path> arquivos = Files.list(pasta)) {
            return arquivos
                    .filter(p -> corresponde(p, prefixo, sufixo))
                    .max(Comparator.comparing(p -> p.getFileName().toString()))
                    .orElse(null);
        } catch (IOException e) {
            return null;
        }
    }

    /** Conta os arquivos de um tipo na pasta. */
    private long contar(String prefixo, String sufixo) {
        if (!Files.isDirectory(pasta)) {
            return 0;
        }
        try (Stream<Path> arquivos = Files.list(pasta)) {
            return arquivos.filter(p -> corresponde(p, prefixo, sufixo)).count();
        } catch (IOException e) {
            return 0;
        }
    }

    private static boolean corresponde(Path p, String prefixo, String sufixo) {
        String nome = p.getFileName().toString();
        return nome.startsWith(prefixo) && nome.endsWith(sufixo);
    }

    /** Extrai a data/hora legível do carimbo no nome do arquivo. */
    private static String dataDoArquivo(Path arquivo) {
        String nome = arquivo.getFileName().toString();
        int inicio = nome.indexOf('_') + 1;
        int fim = nome.lastIndexOf('.');
        if (inicio <= 0 || fim <= inicio) {
            return nome;
        }
        try {
            LocalDateTime dt = LocalDateTime.parse(nome.substring(inicio, fim), CARIMBO);
            return dt.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
        } catch (RuntimeException e) {
            return nome;
        }
    }
}
