package br.jus.tjsp.audiencias.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Testes dos utilitários de normalização e validação de textos.
 */
class TextosTest {

    /**
     * Textos livres devem ir para MAIÚSCULAS, com espaços aparados.
     */
    @Test
    void maiusculasDeveNormalizarTexto() {
        assertEquals("JOÃO DA SILVA", Textos.maiusculas("  joão da Silva "));
        assertNull(Textos.maiusculas(null));
        assertNull(Textos.maiusculas("   "));
    }

    /**
     * CPFs válidos devem ser aceitos com ou sem máscara.
     */
    @Test
    void cpfValidoDeveAceitarComESemMascara() {
        assertTrue(Textos.cpfValido("529.982.247-25"));
        assertTrue(Textos.cpfValido("52998224725"));
    }

    /**
     * CPFs com dígito verificador errado, tamanho errado ou todos os
     * dígitos iguais devem ser rejeitados.
     */
    @Test
    void cpfInvalidoDeveSerRejeitado() {
        assertFalse(Textos.cpfValido("529.982.247-26"));
        assertFalse(Textos.cpfValido("123"));
        assertFalse(Textos.cpfValido("111.111.111-11"));
        assertFalse(Textos.cpfValido(null));
    }

    /**
     * O CPF deve ser gravado sempre com a máscara padrão.
     */
    @Test
    void formatarCpfDeveAplicarMascara() {
        assertEquals("529.982.247-25", Textos.formatarCpf("52998224725"));
        assertEquals("529.982.247-25", Textos.formatarCpf("529.982.247-25"));
    }

    /**
     * Telefones fixos e celulares devem receber a máscara correspondente.
     */
    @Test
    void formatarTelefoneDeveAplicarMascara() {
        assertEquals("(11) 4616-1234", Textos.formatarTelefone("1146161234"));
        assertEquals("(11) 99999-8888", Textos.formatarTelefone("11999998888"));
    }

    /**
     * O número de processo com 20 dígitos deve ganhar a máscara CNJ.
     */
    @Test
    void formatarProcessoDeveAplicarPadraoCnj() {
        assertEquals("1234567-89.2026.8.26.0001", Textos.formatarProcessoCnj("12345678920268260001"));
        assertEquals("1234567-89.2026.8.26.0001", Textos.formatarProcessoCnj("1234567-89.2026.8.26.0001"));
        // Com quantidade errada de dígitos o texto volta como veio (a validação acusa depois).
        assertEquals("123", Textos.formatarProcessoCnj("123"));
    }
}
