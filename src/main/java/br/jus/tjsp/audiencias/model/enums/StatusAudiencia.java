package br.jus.tjsp.audiencias.model.enums;

/**
 * Status de uma audiência, simplificado em três situações.
 *
 * <p>Audiências {@code PENDENTE} com data já passada precisam ser
 * atualizadas para {@code REALIZADA} ou {@code NAO_REALIZADA} — o
 * controle de pendências alerta sobre elas no Dashboard.</p>
 */
public enum StatusAudiencia {

    /** Audiência agendada, ainda não ocorrida (ou aguardando atualização). */
    PENDENTE("Pendente"),

    /** Audiência realizada. */
    REALIZADA("Realizada"),

    /** Audiência que não se realizou (cancelada, redesignada, partes ausentes etc.). */
    NAO_REALIZADA("Não Realizada");

    /** Descrição em português exibida ao usuário. */
    private final String descricao;

    /**
     * Cria o valor do enum com sua descrição.
     *
     * @param descricao texto exibido ao usuário
     */
    StatusAudiencia(String descricao) {
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
