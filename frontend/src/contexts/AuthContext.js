import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [usuario, setUsuario] = useState(null);
    const [primeiroAcesso, setPrimeiroAcesso] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Verificar se há usuário logado no localStorage
        const usuarioSalvo = localStorage.getItem('usuario');
        const primeiroAcessoSalvo = localStorage.getItem('primeiroAcesso');
        
        if (usuarioSalvo) {
            try {
                const usuarioObj = JSON.parse(usuarioSalvo);
                setUsuario(usuarioObj);
                setPrimeiroAcesso(primeiroAcessoSalvo === 'true');
            } catch (error) {
                console.error('Erro ao carregar usuário do localStorage:', error);
                localStorage.removeItem('usuario');
                localStorage.removeItem('primeiroAcesso');
            }
        }
        
        setLoading(false);
    }, []);

    const login = (dadosUsuario, isPrimeiroAcesso) => {
        setUsuario(dadosUsuario);
        setPrimeiroAcesso(isPrimeiroAcesso);
        localStorage.setItem('usuario', JSON.stringify(dadosUsuario));
        localStorage.setItem('primeiroAcesso', isPrimeiroAcesso.toString());
    };

    const logout = () => {
        setUsuario(null);
        setPrimeiroAcesso(false);
        localStorage.removeItem('usuario');
        localStorage.removeItem('primeiroAcesso');
    };

    const atualizarUsuario = (dadosUsuario) => {
        setUsuario(dadosUsuario);
        setPrimeiroAcesso(false);
        localStorage.setItem('usuario', JSON.stringify(dadosUsuario));
        localStorage.setItem('primeiroAcesso', 'false');
    };

    const isAuthenticated = () => {
        return usuario !== null;
    };

    const value = {
        usuario,
        primeiroAcesso,
        loading,
        login,
        logout,
        atualizarUsuario,
        isAuthenticated
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};