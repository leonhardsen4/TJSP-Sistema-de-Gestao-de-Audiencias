package br.jus.tjsp.audiencias.model.enums;

public enum TipoRepresentacao {
    CONSTITUIDO("Constituído"),
    DATIVO("Dativo"),
    AD_HOC("Ad Hoc"),
    DEFESA("Defesa"),
    ASSISTENCIA_ACUSACAO("Assistência de Acusação");
    
    private final String descricao;
    
    TipoRepresentacao(String descricao) {
        this.descricao = descricao;
    }
    
    public String getDescricao() {
        return descricao;
    }
}