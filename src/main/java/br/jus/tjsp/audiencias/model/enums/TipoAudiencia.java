package br.jus.tjsp.audiencias.model.enums;

public enum TipoAudiencia {
    INSTRUCAO_DEBATES_JULGAMENTO("Instrução, Debates e Julgamento"),
    APRESENTACAO("Apresentação"),
    JUSTIFICACAO("Justificação"),
    SUSPENSAO_CONDICIONAL_PROCESSO("Suspensão Condicional do Processo"),
    ACORDO_NAO_PERSECUCAO_PENAL("Acordo de Não Persecução Penal"),
    JURI("Júri"),
    OUTROS("Outros");
    
    private final String descricao;
    
    TipoAudiencia(String descricao) {
        this.descricao = descricao;
    }
    
    public String getDescricao() {
        return descricao;
    }
}