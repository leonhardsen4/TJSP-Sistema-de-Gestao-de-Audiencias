import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

/**
 * Tela de Configurações do usuário: atualização dos dados de perfil (nome e
 * e-mail), troca de senha e backup do sistema (CSV das audiências + cópia do
 * banco na pasta de backups).
 *
 * Todas as chamadas usam a instância `api` (URL relativa), para funcionarem
 * de qualquer computador da rede local, não só do servidor.
 */

/** Situação da pasta de backups devolvida pela API. */
interface StatusBackup {
  pasta: string;
  quantidade: number;
  ultimoBackup: string | null;
}

/** Bloco visual padrão das seções da tela. */
const Cartao: React.FC<{ titulo: string; descricao?: string; children: React.ReactNode }> = ({
  titulo, descricao, children
}) => (
  <section className="bg-white shadow-md rounded-lg p-6">
    <h2 className="text-lg font-bold text-gray-800">{titulo}</h2>
    {descricao && <p className="text-sm text-gray-500 mt-0.5 mb-4">{descricao}</p>}
    <div className={descricao ? '' : 'mt-4'}>{children}</div>
  </section>
);

const INPUT = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';
const LABEL = 'block text-sm font-medium text-gray-700 mb-1';

const Configuracoes: React.FC = () => {
  const { usuario, atualizarUsuario } = useAuth();

  // --- Perfil ---
  const [nome, setNome] = useState<string>(usuario?.nomeCompleto || '');
  const [email, setEmail] = useState<string>(usuario?.email || '');
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [msgPerfil, setMsgPerfil] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  // --- Senha ---
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [msgSenha, setMsgSenha] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  // --- Backup ---
  const [statusBackup, setStatusBackup] = useState<StatusBackup | null>(null);
  const [gerandoBackup, setGerandoBackup] = useState(false);
  const [msgBackup, setMsgBackup] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    api.get<StatusBackup>('/backup')
      .then(res => setStatusBackup(res.data))
      .catch(err => console.error('Erro ao consultar backup:', err));
  }, []);

  const salvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario?.id) return;
    setSalvandoPerfil(true);
    setMsgPerfil(null);
    try {
      const res = await api.put(`/usuarios/${usuario.id}/perfil`, { nomeCompleto: nome, email });
      atualizarUsuario({ ...usuario, ...res.data });
      setMsgPerfil({ tipo: 'ok', texto: 'Dados atualizados com sucesso.' });
    } catch (err: any) {
      setMsgPerfil({ tipo: 'erro', texto: err.response?.data?.message || 'Não foi possível salvar os dados.' });
    } finally {
      setSalvandoPerfil(false);
    }
  };

  const alterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario?.id) return;
    setMsgSenha(null);
    if (novaSenha.length < 6) {
      setMsgSenha({ tipo: 'erro', texto: 'A nova senha deve ter ao menos 6 caracteres.' });
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setMsgSenha({ tipo: 'erro', texto: 'A nova senha e a confirmação não coincidem.' });
      return;
    }
    setSalvandoSenha(true);
    try {
      await api.post(`/usuarios/${usuario.id}/alterar-senha`, { senhaAtual, novaSenha });
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setMsgSenha({ tipo: 'ok', texto: 'Senha alterada com sucesso.' });
    } catch (err: any) {
      setMsgSenha({ tipo: 'erro', texto: err.response?.data?.message || 'Não foi possível alterar a senha.' });
    } finally {
      setSalvandoSenha(false);
    }
  };

  const fazerBackup = async () => {
    setGerandoBackup(true);
    setMsgBackup(null);
    try {
      const res = await api.post<StatusBackup>('/backup');
      setStatusBackup(res.data);
      setMsgBackup({ tipo: 'ok', texto: 'Backup gerado com sucesso.' });
    } catch (err: any) {
      setMsgBackup({ tipo: 'erro', texto: err.response?.data?.message || 'Não foi possível gerar o backup.' });
    } finally {
      setGerandoBackup(false);
    }
  };

  const aviso = (m: { tipo: 'ok' | 'erro'; texto: string } | null) =>
    m && (
      <div className={`px-4 py-2 rounded text-sm mb-3 ${
        m.tipo === 'ok'
          ? 'bg-green-50 border border-green-300 text-green-800'
          : 'bg-red-50 border border-red-300 text-red-700'
      }`}>
        {m.texto}
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Configurações</h1>

      <div className="space-y-6">
        {/* Perfil */}
        <Cartao titulo="Meus dados" descricao="Atualize seu nome e e-mail. A matrícula não pode ser alterada.">
          {aviso(msgPerfil)}
          <form onSubmit={salvarPerfil} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={LABEL} htmlFor="nome">Nome completo</label>
              <input id="nome" className={INPUT} value={nome} maxLength={100}
                     onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div>
              <label className={LABEL} htmlFor="email">E-mail</label>
              <input id="email" type="email" className={INPUT} value={email}
                     onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {usuario?.matricula && (
              <div>
                <label className={LABEL}>Matrícula</label>
                <input className={`${INPUT} bg-gray-100 text-gray-500`} value={usuario.matricula} disabled />
              </div>
            )}
            <div className="md:col-span-2">
              <button type="submit" disabled={salvandoPerfil}
                      className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded disabled:opacity-60">
                {salvandoPerfil ? 'Salvando...' : 'Salvar dados'}
              </button>
            </div>
          </form>
        </Cartao>

        {/* Senha */}
        <Cartao titulo="Trocar senha" descricao="Informe a senha atual e escolha uma nova (mínimo de 6 caracteres).">
          {aviso(msgSenha)}
          <form onSubmit={alterarSenha} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={LABEL} htmlFor="senhaAtual">Senha atual</label>
              <input id="senhaAtual" type="password" className={INPUT} value={senhaAtual}
                     onChange={(e) => setSenhaAtual(e.target.value)} required />
            </div>
            <div>
              <label className={LABEL} htmlFor="novaSenha">Nova senha</label>
              <input id="novaSenha" type="password" className={INPUT} value={novaSenha}
                     onChange={(e) => setNovaSenha(e.target.value)} required />
            </div>
            <div>
              <label className={LABEL} htmlFor="confirmarSenha">Confirmar nova senha</label>
              <input id="confirmarSenha" type="password" className={INPUT} value={confirmarSenha}
                     onChange={(e) => setConfirmarSenha(e.target.value)} required />
            </div>
            <div className="md:col-span-3">
              <button type="submit" disabled={salvandoSenha}
                      className="bg-blue-900 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded disabled:opacity-60">
                {salvandoSenha ? 'Alterando...' : 'Alterar senha'}
              </button>
            </div>
          </form>
        </Cartao>

        {/* Backup */}
        <Cartao
          titulo="Backup"
          descricao="Gera uma planilha CSV das audiências (abre no Excel) e uma cópia do banco na pasta de backups. Além do botão abaixo, um backup automático é feito toda semana enquanto o servidor estiver no ar."
        >
          {aviso(msgBackup)}
          <div className="bg-gray-50 border border-gray-200 rounded p-4 text-sm text-gray-700 mb-4 space-y-1">
            <p><strong>Pasta:</strong> {statusBackup?.pasta || '—'}</p>
            <p><strong>Último backup:</strong> {statusBackup?.ultimoBackup || 'nenhum ainda'}</p>
            <p><strong>Backups guardados:</strong> {statusBackup?.quantidade ?? 0}</p>
          </div>
          <button onClick={fazerBackup} disabled={gerandoBackup}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-4 rounded disabled:opacity-60">
            {gerandoBackup ? 'Gerando backup...' : 'Fazer backup agora'}
          </button>
          <p className="text-xs text-gray-400 mt-2">
            A pasta fica na máquina do servidor. A cópia do banco (.db) é o que permite restaurar o sistema; o CSV é para consulta.
          </p>
        </Cartao>
      </div>
    </div>
  );
};

export default Configuracoes;
