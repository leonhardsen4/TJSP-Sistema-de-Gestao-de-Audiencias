import React, { useState } from 'react';
import './CadastroForm.css';

const CadastroForm = ({ onCadastroSucesso, onVoltarLogin }) => {
    const [formData, setFormData] = useState({
        nomeCompleto: '',
        email: '',
        telefone: '',
        matricula: '',
        senha: '',
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
        if (!formData.nomeCompleto.trim()) {
            setErro('Nome completo é obrigatório');
            return false;
        }
        if (formData.nomeCompleto.trim().length < 2) {
            setErro('Nome deve ter pelo menos 2 caracteres');
            return false;
        }
        if (!formData.email.trim()) {
            setErro('Email é obrigatório');
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setErro('Email inválido');
            return false;
        }
        if (!formData.telefone.trim()) {
            setErro('Telefone é obrigatório');
            return false;
        }
        if (formData.telefone.replace(/\D/g, '').length < 10) {
            setErro('Telefone deve ter pelo menos 10 dígitos');
            return false;
        }
        if (!formData.matricula.trim()) {
            setErro('Matrícula é obrigatória');
            return false;
        }
        const matriculaRegex = /^[a-zA-Z0-9]{6,}$/;
        if (!matriculaRegex.test(formData.matricula)) {
            setErro('Matrícula deve ter no mínimo 6 caracteres alfanuméricos');
            return false;
        }
        if (!formData.senha.trim()) {
            setErro('Senha é obrigatória');
            return false;
        }
        if (formData.senha.length < 6) {
            setErro('Senha deve ter no mínimo 6 caracteres');
            return false;
        }
        if (!formData.confirmarSenha.trim()) {
            setErro('Confirmação de senha é obrigatória');
            return false;
        }
        if (formData.senha !== formData.confirmarSenha) {
            setErro('Senha e confirmação não coincidem');
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
            const response = await fetch('/api/usuarios/cadastrar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                setSucesso('Cadastro realizado com sucesso! Você já pode fazer login com sua senha.');
                setFormData({
                    nomeCompleto: '',
                    email: '',
                    telefone: '',
                    matricula: '',
                    senha: '',
                    confirmarSenha: ''
                });
                
                // Após 3 segundos, chamar callback de sucesso
                setTimeout(() => {
                    if (onCadastroSucesso) {
                        onCadastroSucesso();
                    }
                }, 3000);
            } else {
                setErro(data.erro || 'Erro ao realizar cadastro');
            }
        } catch (error) {
            console.error('Erro ao cadastrar:', error);
            setErro('Erro de conexão. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const formatarTelefone = (value) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 10) {
            return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        } else {
            return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
    };

    const handleTelefoneChange = (e) => {
        const formatted = formatarTelefone(e.target.value);
        setFormData(prev => ({
            ...prev,
            telefone: formatted
        }));
        if (erro) setErro('');
        if (sucesso) setSucesso('');
    };

    return (
        <div className="cadastro-container">
            <div className="cadastro-card">
                <div className="cadastro-header">
                    <div className="logo-container">
                        <img 
                            src="/Logotipo_TJSP.png" 
                            alt="Logotipo TJSP" 
                            className="tjsp-logo"
                        />
                    </div>
                    <h2>Cadastro de Usuário</h2>
                    <p>Preencha os dados para criar sua conta no sistema</p>
                </div>

                <form onSubmit={handleSubmit} className="cadastro-form">
                    <div className="form-group">
                        <label htmlFor="nomeCompleto">Nome Completo *</label>
                        <input
                            type="text"
                            id="nomeCompleto"
                            name="nomeCompleto"
                            value={formData.nomeCompleto}
                            onChange={handleChange}
                            placeholder="Digite seu nome completo"
                            maxLength="100"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email *</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Digite seu email"
                            maxLength="100"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="telefone">Telefone *</label>
                        <input
                            type="text"
                            id="telefone"
                            name="telefone"
                            value={formData.telefone}
                            onChange={handleTelefoneChange}
                            placeholder="(11) 99999-9999"
                            maxLength="15"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="matricula">Matrícula *</label>
                        <input
                            type="text"
                            id="matricula"
                            name="matricula"
                            value={formData.matricula}
                            onChange={handleChange}
                            placeholder="Mínimo 6 caracteres alfanuméricos"
                            maxLength="20"
                            required
                        />
                        <small>Deve conter no mínimo 6 caracteres alfanuméricos</small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="senha">Senha *</label>
                        <input
                            type="password"
                            id="senha"
                            name="senha"
                            value={formData.senha}
                            onChange={handleChange}
                            placeholder="Mínimo 6 caracteres"
                            maxLength="50"
                            required
                        />
                        <small>Deve conter no mínimo 6 caracteres</small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmarSenha">Confirmar Senha *</label>
                        <input
                            type="password"
                            id="confirmarSenha"
                            name="confirmarSenha"
                            value={formData.confirmarSenha}
                            onChange={handleChange}
                            placeholder="Digite a senha novamente"
                            maxLength="50"
                            required
                        />
                    </div>

                    {erro && <div className="error-message">{erro}</div>}
                    {sucesso && <div className="success-message">{sucesso}</div>}

                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={onVoltarLogin}
                            className="btn-secondary"
                            disabled={loading}
                        >
                            Voltar ao Login
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Cadastrando...' : 'Cadastrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CadastroForm;