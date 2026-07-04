package br.jus.tjsp.audiencias.model.enums;

import java.util.Set;

/**
 * Papel de um participante em uma audiência.
 *
 * <p>Os papéis de {@link #partesPrincipais()} identificam a pessoa contra
 * quem o processo corre (réu, indiciado, averiguado, autor do fato ou
 * querelado, no caso de queixa-crime): toda audiência deve ter ao menos um
 * participante com um desses papéis, e a ausência gera pendência no
 * controle de alertas.</p>
 */
public enum TipoParticipacao {
    AUTOR("Autor"),
    AUTOR_DO_FATO("Autor do Fato"),
    AVERIGUADO("Averiguado"),
    BENEFICIADO_28A("Beneficiado 28-A CPP"),
    GENITOR("Genitor(a)"),
    INDICIADO("Indiciado"),
    INFORMANTE("Informante"),
    OUTROS("Outros"),
    PERITO("Perito"),
    QUERELADO("Querelado"),
    QUERELANTE("Querelante"),
    REPRESENTANTE_LEGAL("Representante Legal"),
    REPRESENTANTE_VITIMA("Representante da Vítima"),
    REU("Réu"),
    TERCEIRO("Terceiro"),
    TESTEMUNHA_ACUSACAO("Testemunha de Acusação"),
    TESTEMUNHA_COMUM("Testemunha Comum"),
    TESTEMUNHA_DEFESA("Testemunha de Defesa"),
    TESTEMUNHA_MENOR("Testemunha (Menor)"),
    TESTEMUNHA_PROTEGIDA("Testemunha Protegida"),
    VITIMA("Vítima"),
    VITIMA_MENOR("Vítima (Menor)");

    /** Descrição em português exibida ao usuário. */
    private final String descricao;

    /**
     * Cria o valor do enum com sua descrição.
     *
     * @param descricao texto exibido ao usuário
     */
    TipoParticipacao(String descricao) {
        this.descricao = descricao;
    }

    /**
     * Devolve a descrição em português.
     *
     * @return descrição para exibição
     */
    public String getDescricao() {
        return descricao;
    }

    /**
     * Papéis que caracterizam a parte principal da audiência criminal.
     *
     * @return conjunto imutável com réu, indiciado, averiguado, autor do
     *         fato e querelado
     */
    public static Set<TipoParticipacao> partesPrincipais() {
        return Set.of(REU, INDICIADO, AVERIGUADO, AUTOR_DO_FATO, QUERELADO);
    }
}
