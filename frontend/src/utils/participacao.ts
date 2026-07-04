/**
 * Papéis de participação em audiência — fonte única para todas as telas.
 *
 * Ordem de exibição definida pelo usuário: réu, vítima e as testemunhas
 * (acusação, comum e defesa) na frente, por serem os papéis mais usados;
 * os demais em ordem alfabética.
 */
export const TIPOS_PARTICIPACAO: [string, string][] = [
  ['REU', 'Réu'],
  ['VITIMA', 'Vítima'],
  ['TESTEMUNHA_ACUSACAO', 'Testemunha de Acusação'],
  ['TESTEMUNHA_COMUM', 'Testemunha Comum'],
  ['TESTEMUNHA_DEFESA', 'Testemunha de Defesa'],
  // — demais papéis em ordem alfabética —
  ['AUTOR', 'Autor'],
  ['AUTOR_DO_FATO', 'Autor do Fato'],
  ['AVERIGUADO', 'Averiguado'],
  ['BENEFICIADO_28A', 'Beneficiado 28-A CPP'],
  ['GENITOR', 'Genitor(a)'],
  ['INDICIADO', 'Indiciado'],
  ['INFORMANTE', 'Informante'],
  ['OUTROS', 'Outros'],
  ['PERITO', 'Perito'],
  ['QUERELADO', 'Querelado'],
  ['QUERELANTE', 'Querelante'],
  ['REPRESENTANTE_VITIMA', 'Representante da Vítima'],
  ['REPRESENTANTE_LEGAL', 'Representante Legal'],
  ['TERCEIRO', 'Terceiro'],
  ['TESTEMUNHA_MENOR', 'Testemunha (Menor)'],
  ['TESTEMUNHA_PROTEGIDA', 'Testemunha Protegida'],
  ['VITIMA_MENOR', 'Vítima (Menor)']
];

/**
 * Papéis que caracterizam a parte principal da audiência criminal
 * (réu, indiciado, averiguado, autor do fato e querelado): toda
 * audiência deve ter ao menos um deles.
 */
export const PARTES_PRINCIPAIS = ['REU', 'INDICIADO', 'AVERIGUADO', 'AUTOR_DO_FATO', 'QUERELADO'];

/**
 * Devolve o rótulo em português de um papel de participação.
 *
 * @param tipo nome do enum (ex.: TESTEMUNHA_PROTEGIDA)
 * @returns rótulo para exibição, ou o próprio código se desconhecido
 */
export const rotuloTipoParticipacao = (tipo: string): string =>
  TIPOS_PARTICIPACAO.find(([valor]) => valor === tipo)?.[1] || tipo;
