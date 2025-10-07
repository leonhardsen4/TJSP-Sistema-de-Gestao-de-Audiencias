package br.jus.tjsp.audiencias.model.enums;

public enum FormatoAudiencia {
    VIRTUAL("Virtual"),
    PRESENCIAL("Presencial"),
    HIBRIDA("Híbrida");
    
    private final String descricao;
    
    FormatoAudiencia(String descricao) {
        this.descricao = descricao;
    }
    
    public String getDescricao() {
        return descricao;
    }
}