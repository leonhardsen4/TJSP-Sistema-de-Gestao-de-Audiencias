import React, { useState } from 'react';
import './AlterarSenhaForm.css';

const AlterarSenhaForm = ({ usuario, onSenhaAlterada, onCancelar }) => {
    const [formData, setFormData] = useState({
        senhaAtual: '',
        novaSenha: '',
        confirmarSenha: ''
    });
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Limpar mensagens ao digitar
        if (erro) setErro('');
        if (sucesso) setSucesso('');
    };

    const validarFormulario = () => {
        if (!formData.senhaAtual.trim()) {
            setErro('Senha atual é obrigatória');
            return false;
        }
        if (!formData.novaSenha.trim()) {
            setErro('Nova senha é obrigatória');
            return false;
        }
        if (formData.novaSenha.length < 6) {
            setErro('Nova senha deve ter no mínimo 6 caracteres');
            return false;
        }
        if (!formData.confirmarSenha.trim()) {
            setErro('Confirmação de senha é obrigatória');
            return false;
        }
        if (formData.novaSenha !== formData.confirmarSenha) {
            setErro('Nova senha e confirmação não coincidem');
            return false;
        }
        if (formData.senhaAtual === formData.novaSenha) {
            setErro('A nova senha deve ser diferente da senha atual');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validarFormulario()) {
            return;
        }

        setLoading(true);
        setErro('');
        setSucesso('');

        try {
            const response = await fetch(`/api/usuarios/${usuario.id}/alterar-senha`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    senhaAtual: formData.senhaAtual,
                    novaSenha: formData.novaSenha
                })
            });

            const data = await response.json();

            if (response.ok) {
                setSucesso('Senha alterada com sucesso!');
                setFormData({
                    senhaAtual: '',
                    novaSenha: '',
                    confirmarSenha: ''
                });
                
                // Atualizar dados do usuário no localStorage
                const usuarioAtualizado = { ...usuario, primeiroAcesso: false };
                localStorage.setItem('usuario', JSON.stringify(usuarioAtualizado));
                localStorage.setItem('primeiroAcesso', 'false');
                
                // Após 2 segundos, chamar callback de sucesso
                setTimeout(() => {
                    if (onSenhaAlterada) {
                        onSenhaAlterada(usuarioAtualizado);
                    }
                }, 2000);
            } else {
                setErro(data.erro || 'Erro ao alterar senha');
            }
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            setErro('Erro de conexão. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="alterar-senha-container">
            <div className="alterar-senha-card">
                <div className="alterar-senha-header">
                    <h2>Alterar Senha</h2>
                    <p>Olá, {usuario.nomeCompleto}</p>
                    {usuario.primeiroAcesso && (
                        <div className="primeiro-acesso-info">
                            <strong>Primeiro acesso detectado!</strong><br />
                            Por segurança, você deve alterar sua senha temporária.
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="alterar-senha-form">
                    <div className="form-group">
                        <label htmlFor="senhaAtual">Senha Atual *</label>
                        <input
                            type="password"
                            id="senhaAtual"
                            name="senhaAtual"
                            value={formData.senhaAtual}
                            onChange={handleChange}
                            placeholder="Digite sua senha atual"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="novaSenha">Nova Senha *</label>
                        <input
                            type="password"
                            id="novaSenha"
                            name="novaSenha"
                            value={formData.novaSenha}
                            onChange={handleChange}
                            placeholder="Digite sua nova senha"
                            minLength="6"
                            required
                        />
                        <small>Mínimo de 6 caracteres</small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmarSenha">Confirmar Nova Senha *</label>
                        <input
                            type="password"
                            id="confirmarSenha"
                            name="confirmarSenha"
                            value={formData.confirmarSenha}
                            onChange={handleChange}
                            placeholder="Confirme sua nova senha"
                            required
                        />
                    </div>

                    {erro && <div className="error-message">{erro}</div>}
                    {sucesso && <div className="success-message">{sucesso}</div>}

                    <div className="form-actions">
                        {!usuario.primeiroAcesso && (
                            <button
                                type="button"
                                onClick={onCancelar}
                                className="btn-secondary"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                        )}
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Alterando...' : 'Alterar Senha'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AlterarSenhaForm;