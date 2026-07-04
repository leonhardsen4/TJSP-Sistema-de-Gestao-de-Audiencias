package br.jus.tjsp.audiencias;

import br.jus.tjsp.audiencias.config.Database;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.Map;

/**
 * Base para os testes: inicializa um banco SQLite novo e vazio em um
 * diretório temporário antes de cada teste, garantindo isolamento total
 * entre os casos.
 */
public abstract class TesteBase {

    /** Diretório temporário gerenciado pelo JUnit. */
    @TempDir
    Path diretorioTemporario;

    /**
     * Cria um banco zerado para o teste que vai executar.
     */
    @BeforeEach
    void iniciarBanco() {
        Database.init(diretorioTemporario.resolve("teste.db").toString());
    }

    /**
     * Insere uma vara mínima e devolve o id gerado.
     *
     * @param nome nome da vara
     * @return id da vara criada
     */
    protected long criarVara(String nome) {
        return Database.insert("INSERT INTO vara (nome) VALUES (?)", nome);
    }

    /**
     * Insere um juiz mínimo e devolve o id gerado.
     *
     * @param nome nome do juiz
     * @return id do juiz criado
     */
    protected long criarJuiz(String nome) {
        return Database.insert("INSERT INTO juiz (nome) VALUES (?)", nome);
    }

    /**
     * Insere um promotor mínimo e devolve o id gerado.
     *
     * @param nome nome do promotor
     * @return id do promotor criado
     */
    protected long criarPromotor(String nome) {
        return Database.insert("INSERT INTO promotor (nome) VALUES (?)", nome);
    }

    /**
     * Insere uma pauta mínima (com vara, juiz e promotor novos) e devolve
     * o id gerado.
     *
     * @param data data da pauta no formato {@code yyyy-MM-dd}
     * @return id da pauta criada
     */
    protected long criarPauta(String data) {
        long varaId = criarVara("VARA DA PAUTA");
        long juizId = criarJuiz("JUIZ DA PAUTA");
        long promotorId = criarPromotor("PROMOTOR DA PAUTA");
        return Database.insert(
                "INSERT INTO pauta (data, vara_id, juiz_id, promotor_id) VALUES (?, ?, ?, ?)",
                data, varaId, juizId, promotorId);
    }

    /**
     * Insere uma pessoa mínima e devolve o id gerado.
     *
     * @param nome nome da pessoa
     * @return id da pessoa criada
     */
    protected long criarPessoa(String nome) {
        return Database.insert("INSERT INTO pessoa (nome, cpf) VALUES (?, ?)", nome, "111.222.333-44");
    }

    /**
     * Insere um advogado mínimo e devolve o id gerado.
     *
     * @param nome nome do advogado
     * @return id do advogado criado
     */
    protected long criarAdvogado(String nome) {
        return Database.insert("INSERT INTO advogado (nome, oab) VALUES (?, ?)", nome, "SP999999");
    }

    /**
     * Monta o corpo mínimo válido de uma audiência para os testes.
     *
     * @param varaId vara da audiência
     * @param data   data no formato {@code yyyy-MM-dd}
     * @param hora   horário de início no formato {@code HH:mm}
     * @return mapa com os campos obrigatórios preenchidos
     */
    protected Map<String, Object> corpoAudiencia(long varaId, String data, String hora) {
        return new java.util.LinkedHashMap<>(Map.of(
                "numeroProcesso", "1234567-89.2026.8.26.0001",
                "dataAudiencia", data,
                "horarioInicio", hora,
                "duracao", 60,
                "status", "PENDENTE",
                "tipoAudiencia", "INSTRUCAO_DEBATES_JULGAMENTO",
                "competencia", "CRIMINAL",
                "formato", "PRESENCIAL",
                "varaId", varaId));
    }
}
