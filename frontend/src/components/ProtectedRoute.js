import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from './LoginForm';
import CadastroForm from './CadastroForm';
import AlterarSenhaForm from './AlterarSenhaForm';

const ProtectedRoute = ({ children }) => {
    const { usuario, primeiroAcesso, loading, login, atualizarUsuario } = useAuth();
    const [mostrarCadastro, setMostrarCadastro] = React.useState(false);

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}>
                <div style={{
                    color: 'white',
                    fontSize: '18px',
                    textAlign: 'center'
                }}>
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            border: '4px solid rgba(255,255,255,0.3)',
                            borderTop: '4px solid white',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto'
                        }}></div>
                    </div>
                    Carregando...
                </div>
            </div>
        );
    }

    // Se não está autenticado, mostrar login ou cadastro
    if (!usuario) {
        if (mostrarCadastro) {
            return (
                <CadastroForm
                    onCadastroSucesso={() => setMostrarCadastro(false)}
                    onVoltarLogin={() => setMostrarCadastro(false)}
                />
            );
        }
        
        return (
            <LoginForm
                onLoginSucesso={login}
                onIrParaCadastro={() => setMostrarCadastro(true)}
            />
        );
    }

    // Se é primeiro acesso, forçar alteração de senha
    if (primeiroAcesso) {
        return (
            <AlterarSenhaForm
                usuario={usuario}
                onSenhaAlterada={atualizarUsuario}
                onCancelar={null} // Não permitir cancelar no primeiro acesso
            />
        );
    }

    // Usuário autenticado e senha já alterada, mostrar conteúdo protegido
    return children;
};

export default ProtectedRoute;