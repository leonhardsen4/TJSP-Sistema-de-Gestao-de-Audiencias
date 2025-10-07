import * as Yup from 'yup';

// Validação para CPF
export const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
};

// Schemas de validação usando Yup
export const audienciaSchema = Yup.object().shape({
  dataHora: Yup.date()
    .required('Data e hora são obrigatórias')
    .min(new Date(), 'Data deve ser futura'),
  varaId: Yup.number()
    .required('Vara é obrigatória')
    .positive('Selecione uma vara válida'),
  juizId: Yup.number()
    .required('Juiz é obrigatório')
    .positive('Selecione um juiz válido'),
  promotorId: Yup.number()
    .required('Promotor é obrigatório')
    .positive('Selecione um promotor válido'),
  observacoes: Yup.string()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
});

export const varaSchema = Yup.object().shape({
  nome: Yup.string()
    .required('Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  comarca: Yup.string()
    .required('Comarca é obrigatória')
    .min(2, 'Comarca deve ter pelo menos 2 caracteres')
    .max(100, 'Comarca deve ter no máximo 100 caracteres'),
  endereco: Yup.string()
    .max(200, 'Endereço deve ter no máximo 200 caracteres'),
  telefone: Yup.string()
    .matches(/^(\(\d{2}\)\s?)?\d{4,5}-?\d{4}$/, 'Formato de telefone inválido'),
  email: Yup.string()
    .email('Email inválido')
    .max(100, 'Email deve ter no máximo 100 caracteres')
});

export const juizSchema = Yup.object().shape({
  nome: Yup.string()
    .required('Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: Yup.string()
    .email('Email inválido')
    .max(100, 'Email deve ter no máximo 100 caracteres'),
  telefone: Yup.string()
    .matches(/^(\(\d{2}\)\s?)?\d{4,5}-?\d{4}$/, 'Formato de telefone inválido')
});

export const promotorSchema = Yup.object().shape({
  nome: Yup.string()
    .required('Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: Yup.string()
    .email('Email inválido')
    .max(100, 'Email deve ter no máximo 100 caracteres'),
  telefone: Yup.string()
    .matches(/^(\(\d{2}\)\s?)?\d{4,5}-?\d{4}$/, 'Formato de telefone inválido')
});

export const advogadoSchema = Yup.object().shape({
  nome: Yup.string()
    .required('Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  numeroOAB: Yup.string()
    .required('Número OAB é obrigatório')
    .min(3, 'Número OAB deve ter pelo menos 3 caracteres')
    .max(20, 'Número OAB deve ter no máximo 20 caracteres'),
  email: Yup.string()
    .email('Email inválido')
    .max(100, 'Email deve ter no máximo 100 caracteres'),
  telefone: Yup.string()
    .matches(/^(\(\d{2}\)\s?)?\d{4,5}-?\d{4}$/, 'Formato de telefone inválido')
});

export const pessoaSchema = Yup.object().shape({
  nome: Yup.string()
    .required('Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  cpf: Yup.string()
    .test('cpf-valid', 'CPF inválido', (value) => {
      if (!value) return true; // CPF não é mais obrigatório
      return validateCPF(value);
    }),
  email: Yup.string()
    .email('Email inválido')
    .max(100, 'Email deve ter no máximo 100 caracteres'),
  telefone: Yup.string()
    .matches(/^(\(\d{2}\)\s?)?\d{4,5}-?\d{4}$/, 'Formato de telefone inválido'),
  observacoes: Yup.string()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
});

// Função para formatar CPF
export const formatCPF = (value: string): string => {
  const cleanValue = value.replace(/[^\d]/g, '');
  const match = cleanValue.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/);
  if (match) {
    return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`;
  }
  return cleanValue;
};

// Função para formatar telefone
export const formatPhone = (value: string): string => {
  const cleanValue = value.replace(/[^\d]/g, '');
  if (cleanValue.length <= 10) {
    const match = cleanValue.match(/^(\d{2})(\d{4})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
  } else {
    const match = cleanValue.match(/^(\d{2})(\d{5})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
  }
  return cleanValue;
};