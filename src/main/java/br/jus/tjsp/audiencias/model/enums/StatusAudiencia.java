package br.jus.tjsp.audiencias.model.enums;

public enum StatusAudiencia {
    DESIGNADA("Designada"),
    REALIZADA("Realizada"),
    PARCIALMENTE_REALIZADA("Parcialmente Realizada"),
    CANCELADA("Cancelada"),
    REDESIGNADA("Redesignada");
    
    private final String descricao;
    
    StatusAudiencia(String descricao) {
        this.descricao = descricao;
    }
    
    public String getDescricao() {
        return descricao;
    }
}