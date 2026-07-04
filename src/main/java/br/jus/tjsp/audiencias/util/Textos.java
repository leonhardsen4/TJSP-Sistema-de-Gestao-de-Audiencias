package br.jus.tjsp.audiencias.util;

import java.util.Locale;

/**
 * Utilitários de normalização e validação de textos dos cadastros.
 *
 * <p>Garante que os dados sejam gravados de forma uniforme (nomes em
 * MAIÚSCULAS, CPF/telefone/nº de processo com máscara padrão), mesmo que
 * o cliente da API envie valores sem formatação.</p>
 */
public final class Textos {

    /** Locale brasileiro usado na conversão para maiúsculas. */
    private static final Locale PT_BR = Locale.forLanguageTag("pt-BR");

    private Textos() {
        // Classe utilitária: não instanciável.
    }

    /**
     * Normaliza um texto livre: remove espaços das pontas e converte
     * para maiúsculas.
     *
     * @param texto texto de entrada (pode ser nulo)
     * @return texto em maiúsculas, ou {@code null} se a entrada for nula/vazia
     */
    public static String maiusculas(String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        return texto.strip().toUpperCase(PT_BR);
    }

    /**
     * Remove tudo que não for dígito.
     *
     * @param texto texto de entrada (pode ser nulo)
     * @return somente os dígitos, ou {@code ""} se a entrada for nula
     */
    public static String somenteDigitos(String texto) {
        return texto == null ? "" : texto.replaceAll("\\D", "");
    }

    /**
     * Valida um CPF pelos dígitos verificadores.
     *
     * @param cpf CPF com ou sem máscara
     * @return {@code true} se o CPF for válido
     */
    public static boolean cpfValido(String cpf) {
        String digitos = somenteDigitos(cpf);
        if (digitos.length() != 11 || digitos.chars().distinct().count() == 1) {
            return false;
        }
        return digitoVerificador(digitos, 9) == digitos.charAt(9) - '0'
                && digitoVerificador(digitos, 10) == digitos.charAt(10) - '0';
    }

    /**
     * Calcula um dígito verificador do CPF.
     *
     * @param digitos    os 11 dígitos do CPF
     * @param quantidade quantos dígitos entram no cálculo (9 para o primeiro
     *                   verificador, 10 para o segundo)
     * @return valor esperado do dígito verificador
     */
    private static int digitoVerificador(String digitos, int quantidade) {
        int soma = 0;
        for (int i = 0; i < quantidade; i++) {
            soma += (digitos.charAt(i) - '0') * (quantidade + 1 - i);
        }
        int resto = (soma * 10) % 11;
        return resto == 10 ? 0 : resto;
    }

    /**
     * Formata um CPF com a máscara {@code 000.000.000-00}.
     *
     * @param cpf CPF com ou sem máscara (deve ter 11 dígitos)
     * @return CPF formatado, ou o texto original se não tiver 11 dígitos
     */
    public static String formatarCpf(String cpf) {
        String digitos = somenteDigitos(cpf);
        if (digitos.length() != 11) {
            return cpf == null ? null : cpf.strip();
        }
        return digitos.substring(0, 3) + "." + digitos.substring(3, 6) + "."
                + digitos.substring(6, 9) + "-" + digitos.substring(9);
    }

    /**
     * Formata um telefone com a máscara {@code (00) 0000-0000} ou
     * {@code (00) 00000-0000}.
     *
     * @param telefone telefone com ou sem máscara
     * @return telefone formatado, ou o texto original se não tiver 10/11 dígitos
     */
    public static String formatarTelefone(String telefone) {
        String digitos = somenteDigitos(telefone);
        if (digitos.length() == 10) {
            return "(" + digitos.substring(0, 2) + ") " + digitos.substring(2, 6) + "-" + digitos.substring(6);
        }
        if (digitos.length() == 11) {
            return "(" + digitos.substring(0, 2) + ") " + digitos.substring(2, 7) + "-" + digitos.substring(7);
        }
        return telefone == null ? null : telefone.strip();
    }

    /**
     * Formata um número de processo no padrão CNJ
     * ({@code NNNNNNN-DD.AAAA.J.TR.OOOO}) a partir dos 20 dígitos.
     *
     * @param processo número com ou sem máscara
     * @return processo formatado, ou o texto original se não tiver 20 dígitos
     */
    public static String formatarProcessoCnj(String processo) {
        String digitos = somenteDigitos(processo);
        if (digitos.length() != 20) {
            return processo == null ? null : processo.strip();
        }
        return digitos.substring(0, 7) + "-" + digitos.substring(7, 9) + "." + digitos.substring(9, 13)
                + "." + digitos.charAt(13) + "." + digitos.substring(14, 16) + "." + digitos.substring(16);
    }
}
