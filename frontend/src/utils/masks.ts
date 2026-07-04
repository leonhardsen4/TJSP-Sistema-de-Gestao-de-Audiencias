/**
 * Máscaras de entrada aplicadas enquanto o usuário digita.
 *
 * Todas trabalham de forma progressiva: aceitam o valor parcial do campo,
 * descartam caracteres inválidos e devolvem o texto já formatado. Assim os
 * campos só aceitam os caracteres corretos (ex.: apenas números no CPF) e o
 * usuário vê a máscara se formar conforme digita.
 */

/** Remove tudo que não for dígito. */
export const somenteDigitos = (valor: string): string => valor.replace(/\D/g, '');

/**
 * Máscara de CPF: 000.000.000-00 (11 dígitos, apenas numerais).
 *
 * @param valor texto atual do campo
 * @returns CPF parcialmente formatado
 */
export const maskCPF = (valor: string): string => {
  const d = somenteDigitos(valor).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
};

/**
 * Máscara do número de processo no padrão CNJ:
 * NNNNNNN-DD.AAAA.J.TR.OOOO (20 dígitos, apenas numerais).
 *
 * @param valor texto atual do campo
 * @returns número parcialmente formatado
 */
export const maskProcessoCNJ = (valor: string): string => {
  const d = somenteDigitos(valor).slice(0, 20);
  let resultado = d.slice(0, 7);
  if (d.length > 7) resultado += '-' + d.slice(7, 9);
  if (d.length > 9) resultado += '.' + d.slice(9, 13);
  if (d.length > 13) resultado += '.' + d.slice(13, 14);
  if (d.length > 14) resultado += '.' + d.slice(14, 16);
  if (d.length > 16) resultado += '.' + d.slice(16, 20);
  return resultado;
};

/**
 * Máscara de telefone: (00) 0000-0000 ou (00) 00000-0000
 * (10 ou 11 dígitos, apenas numerais).
 *
 * @param valor texto atual do campo
 * @returns telefone parcialmente formatado
 */
export const maskTelefone = (valor: string): string => {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

/**
 * Máscara do número de OAB: apenas dígitos (até 8), com UF opcional
 * ao final (ex.: 123456/SP). Letras são convertidas para maiúsculas.
 *
 * @param valor texto atual do campo
 * @returns OAB normalizada
 */
export const maskOAB = (valor: string): string => {
  const limpo = valor.toUpperCase().replace(/[^0-9A-Z/]/g, '');
  const partes = limpo.split('/');
  const numero = somenteDigitos(partes[0]).slice(0, 8);
  if (partes.length > 1) {
    const uf = partes[1].replace(/[^A-Z]/g, '').slice(0, 2);
    return `${numero}/${uf}`;
  }
  return numero;
};

/**
 * Transforma o texto em MAIÚSCULAS enquanto é digitado, para padronizar
 * nomes e observações dos cadastros.
 *
 * @param valor texto atual do campo
 * @returns texto em maiúsculas
 */
export const toUpper = (valor: string): string => valor.toUpperCase();

/**
 * Verifica se o CPF é válido pelos dígitos verificadores.
 *
 * @param cpf CPF com ou sem máscara
 * @returns true se válido (ou vazio, pois o CPF é opcional)
 */
export const cpfValido = (cpf: string): boolean => {
  const d = somenteDigitos(cpf);
  if (d.length === 0) return true;
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (quantidade: number): number => {
    let soma = 0;
    for (let i = 0; i < quantidade; i++) {
      soma += parseInt(d.charAt(i)) * (quantidade + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === parseInt(d.charAt(9)) && digito(10) === parseInt(d.charAt(10));
};

/**
 * Verifica se o número de processo tem os 20 dígitos do padrão CNJ.
 *
 * @param processo número com ou sem máscara
 * @returns true se completo
 */
export const processoCNJCompleto = (processo: string): boolean =>
  somenteDigitos(processo).length === 20;
