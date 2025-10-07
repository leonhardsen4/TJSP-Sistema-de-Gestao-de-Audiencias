package br.jus.tjsp.audiencias.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    
    private final JavaMailSender mailSender;
    
    @Value("${spring.mail.username:sistema@tjsp.jus.br}")
    private String remetente;
    
    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }
    
    public void enviarSenhaPorEmail(String destinatario, String nomeUsuario, String senha) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(remetente);
            message.setTo(destinatario);
            message.setSubject("Bem-vindo ao Sistema de Gestão de Audiências - TJSP");
            
            String corpo = String.format(
                "Olá %s,\n\n" +
                "Seu cadastro no Sistema de Gestão de Audiências do TJSP foi realizado com sucesso!\n\n" +
                "Seus dados de acesso são:\n" +
                "Login: %s\n" +
                "Senha temporária: %s\n\n" +
                "IMPORTANTE: Por segurança, você deverá alterar sua senha no primeiro acesso ao sistema.\n\n" +
                "Acesse o sistema em: http://localhost:3000\n\n" +
                "Atenciosamente,\n" +
                "Equipe TJSP - Sistema de Gestão de Audiências",
                nomeUsuario, destinatario, senha
            );
            
            message.setText(corpo);
            
            mailSender.send(message);
            logger.info("Email enviado com sucesso para: {}", destinatario);
            
        } catch (Exception e) {
            logger.error("Erro ao enviar email para {}: {}", destinatario, e.getMessage());
            // Em ambiente de desenvolvimento, apenas loggar o erro
            // Em produção, você pode querer lançar uma exceção ou implementar retry
            logger.warn("Email não pôde ser enviado. Senha temporária: {}", senha);
        }
    }
}