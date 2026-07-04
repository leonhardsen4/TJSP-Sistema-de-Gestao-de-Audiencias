package br.jus.tjsp.audiencias.model.enums;

/**
 * Situação do mandado de intimação de um participante da audiência.
 *
 * <p>Usada no controle de pendências: mandados {@code PENDENTE} ou
 * {@code NEGATIVO} geram alerta até a parte ser efetivamente intimada.</p>
 */
public enum StatusMandado {

    /** Mandado expedido e aguardando cumprimento pelo oficial de justiça. */
    PENDENTE("Pendente de cumprimento"),

    /** Mandado cumprido com êxito: a parte foi intimada. */
    POSITIVO("Cumprido - positivo"),

    /** Mandado devolvido sem êxito (parte não localizada etc.). */
    NEGATIVO("Cumprido - negativo"),

    /** Mandado desnecessário (ex.: parte intimada em audiência ou por outro meio). */
    DISPENSADO("Dispensado");

    /** Descrição em português exibida ao usuário. */
    private final String descricao;

    /**
     * Cria o valor do enum com sua descrição.
     *
     * @param descricao texto exibido ao usuário
     */
    StatusMandado(String descricao) {
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
}
