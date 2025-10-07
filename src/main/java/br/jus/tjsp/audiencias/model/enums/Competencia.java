package br.jus.tjsp.audiencias.model.enums;

public enum Competencia {
    CRIMINAL("Criminal"),
    VIOLENCIA_DOMESTICA("Violência Doméstica"),
    INFANCIA_JUVENTUDE("Infância e Juventude");
    
    private final String descricao;
    
    Competencia(String descricao) {
        this.descricao = descricao;
    }
    
    public String getDescricao() {
        return descricao;
    }
}