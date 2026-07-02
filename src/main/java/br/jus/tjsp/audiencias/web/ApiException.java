package br.jus.tjsp.audiencias.web;

import java.util.Map;

/**
 * Exceção base para erros de API, carregando o código HTTP a devolver
 * e, opcionalmente, um mapa de erros de validação por campo.
 */
public class ApiException extends RuntimeException {

    /** Código de status HTTP associado ao erro. */
    private final int status;

    /** Erros de validação por campo (pode ser {@code null}). */
    private final Map<String, String> erros;

    /**
     * Cria uma exceção de API.
     *
     * @param status  código HTTP (ex.: 400, 404, 409)
     * @param mensagem mensagem descritiva do erro
     */
    public ApiException(int status, String mensagem) {
        this(status, mensagem, null);
    }

    /**
     * Cria uma exceção de API com erros de validação detalhados.
     *
     * @param status   código HTTP
     * @param mensagem mensagem descritiva do erro
     * @param erros    mapa campo → mensagem de validação
     */
    public ApiException(int status, String mensagem, Map<String, String> erros) {
        super(mensagem);
        this.status = status;
        this.erros = erros;
    }

    /**
     * @return código de status HTTP do erro
     */
    public int getStatus() {
        return status;
    }

    /**
     * @return mapa de erros de validação por campo, ou {@code null}
     */
    public Map<String, String> getErros() {
        return erros;
    }

    /**
     * Cria um erro 400 (requisição inválida) com detalhes por campo.
     *
     * @param erros mapa campo → mensagem
     * @return exceção pronta para lançamento
     */
    public static ApiException validacao(Map<String, String> erros) {
        return new ApiException(400, "Erro de validação", erros);
    }

    /**
     * Cria um erro 404 (não encontrado).
     *
     * @param mensagem descrição do recurso ausente
     * @return exceção pronta para lançamento
     */
    public static ApiException naoEncontrado(String mensagem) {
        return new ApiException(404, mensagem);
    }

    /**
     * Cria um erro 409 (conflito), usado por exemplo em violações de
     * integridade referencial.
     *
     * @param mensagem descrição do conflito
     * @return exceção pronta para lançamento
     */
    public static ApiException conflito(String mensagem) {
        return new ApiException(409, mensagem);
    }
}
