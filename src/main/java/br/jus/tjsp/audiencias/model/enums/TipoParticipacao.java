package br.jus.tjsp.audiencias.model.enums;

public enum TipoParticipacao {
    AUTOR("Autor"),
    REU("Réu"),
    VITIMA("Vítima"),
    VITIMA_FATAL("Vítima Fatal"),
    REPRESENTANTE_LEGAL("Representante Legal"),
    TESTEMUNHA_COMUM("Testemunha Comum"),
    TESTEMUNHA_ACUSACAO("Testemunha de Acusação"),
    TESTEMUNHA_DEFESA("Testemunha de Defesa"),
    ASSISTENTE_ACUSACAO("Assistente de Acusação"),
    PERITO("Perito"),
    TERCEIRO("Terceiro"),
    OUTROS("Outros");
    
    private final String descricao;
    
    TipoParticipacao(String descricao) {
        this.descricao = descricao;
    }
    
    public String getDescricao() {
        return descricao;
    }
}