import React, { useState } from 'react';
import './LoginForm.css';

const LoginForm = ({ onLoginSucesso, onIrParaCadastro }) => {
    const [formData, setFormData] = useState({
        emailOuMatricula: '',
        senha: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Limpar mensagens ao digitar
        if (error) setError('');
        if (success) setSuccess('');
    };

    const validateForm = () => {
        if (!formData.emailOuMatricula.trim()) {
            setError('Email ou matrícula é obrigatório');
            return false;
        }
        if (!formData.senha.trim()) {
            setError('Senha é obrigatória');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await fetch('/api/usuarios/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    login: formData.emailOuMatricula,
                    senha: formData.senha
                })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('Login realizado com sucesso!');
                
                // Chamar callback de sucesso passando os dados do usuário
                if (onLoginSucesso) {
                    onLoginSucesso(data.usuario, data.primeiroAcesso);
                }
                
                // Resetar formulário
                setFormData({
                    emailOuMatricula: '',
                    senha: ''
                });
                
            } else {
                setError(data.erro || 'Erro ao fazer login');
            }
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            setError('Erro de conexão. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="logo-container">
                        <img 
                            src="/Logotipo_TJSP.png" 
                            alt="TJSP - Tribunal de Justiça do Estado de São Paulo" 
                            className="tjsp-logo"
                        />
                    </div>
                    <h2>Sistema de Gestão de Audiências</h2>
                    <p>Tribunal de Justiça do Estado de São Paulo</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="emailOuMatricula">Email ou Matrícula</label>
                        <input
                            type="text"
                            id="emailOuMatricula"
                            name="emailOuMatricula"
                            value={formData.emailOuMatricula}
                            onChange={handleChange}
                            placeholder="Digite seu email ou matrícula"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="senha">Senha</label>
                        <input
                            type="password"
                            id="senha"
                            name="senha"
                            value={formData.senha}
                            onChange={handleChange}
                            placeholder="Digite sua senha"
                            required
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}
                    {success && <div className="success-message">{success}</div>}

                    <button
                        type="submit"
                        className="btn-login"
                        disabled={loading}
                    >
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>Não possui cadastro?</p>
                    <button
                        type="button"
                        onClick={onIrParaCadastro}
                        className="btn-cadastro"
                        disabled={loading}
                    >
                        Cadastre-se aqui
                    </button>
                    
                    <div className="recuperar-senha">
                        <button
                            type="button"
                            className="btn-recuperar-senha"
                            onClick={() => alert('Funcionalidade de recuperação de senha será implementada em breve!')}
                        >
                            Esqueceu sua senha?
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;