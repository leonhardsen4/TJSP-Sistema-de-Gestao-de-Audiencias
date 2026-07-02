package br.jus.tjsp.audiencias.web;

import br.jus.tjsp.audiencias.AudienciasApplication;
import br.jus.tjsp.audiencias.TesteBase;
import io.javalin.testtools.JavalinTest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Testes de fumaça das rotas HTTP: garantem que o contrato usado pelo
 * frontend (caminhos, códigos de status e formato das respostas) está
 * registrado corretamente, com e sem o prefixo {@code /api}.
 */
class RoutesTest extends TesteBase {

    /**
     * O ciclo criar/listar de varas deve funcionar via HTTP, nos dois
     * prefixos de rota.
     */
    @Test
    void crudDeVarasDeveResponderNosDoisPrefixos() {
        JavalinTest.test(AudienciasApplication.criarApp(), (servidor, cliente) -> {
            var criacao = cliente.post("/varas", java.util.Map.of("nome", "1ª Vara"));
            assertEquals(201, criacao.code());

            var semPrefixo = cliente.get("/varas");
            assertEquals(200, semPrefixo.code());
            assertTrue(semPrefixo.body().string().contains("1ª Vara"));

            var comPrefixo = cliente.get("/api/varas");
            assertEquals(200, comPrefixo.code());
            assertTrue(comPrefixo.body().string().contains("1ª Vara"));
        });
    }

    /**
     * Erros de validação devem devolver 400 com o mapa {@code errors}.
     */
    @Test
    void validacaoDeveDevolver400ComErrors() {
        JavalinTest.test(AudienciasApplication.criarApp(), (servidor, cliente) -> {
            var resposta = cliente.post("/varas", java.util.Map.of("comarca", "X"));
            assertEquals(400, resposta.code());
            String corpo = resposta.body().string();
            assertTrue(corpo.contains("\"errors\""));
            // A message deve detalhar os campos, pois é ela que as telas exibem
            assertTrue(corpo.contains("\"message\":\"Campo obrigatório\""));
        });
    }

    /**
     * Recursos inexistentes devem devolver 404 com a mensagem no corpo.
     */
    @Test
    void idInexistenteDeveDevolver404() {
        JavalinTest.test(AudienciasApplication.criarApp(), (servidor, cliente) -> {
            var resposta = cliente.get("/juizes/999");
            assertEquals(404, resposta.code());
            assertTrue(resposta.body().string().contains("não encontrado"));
        });
    }

    /**
     * O fluxo completo de audiência usado pelo formulário deve funcionar:
     * criar apoios, criar audiência, checar conflito, adicionar e limpar
     * participantes.
     */
    @Test
    void fluxoCompletoDeAudienciaDeveFuncionar() {
        JavalinTest.test(AudienciasApplication.criarApp(), (servidor, cliente) -> {
            cliente.post("/varas", java.util.Map.of("nome", "Vara"));
            cliente.post("/pessoas", java.util.Map.of("nome", "Carlos"));

            var criacao = cliente.post("/audiencias", java.util.Map.of(
                    "numeroProcesso", "1234567-89.2026.8.26.0001",
                    "dataAudiencia", "2026-07-06",
                    "horarioInicio", "10:00",
                    "duracao", 60,
                    "status", "DESIGNADA",
                    "tipoAudiencia", "JURI",
                    "competencia", "CRIMINAL",
                    "formato", "PRESENCIAL",
                    "varaId", 1));
            assertEquals(201, criacao.code());
            assertTrue(criacao.body().string().contains("\"horarioFim\":\"11:00\""));

            var conflito = cliente.get(
                    "/api/audiencias/verificar-conflitos?data=2026-07-06&horarioInicio=10:30&duracao=60&varaId=1");
            assertEquals(200, conflito.code());
            assertTrue(conflito.body().string().contains("\"temConflito\":true"));

            var participante = cliente.post("/audiencias/1/participantes",
                    java.util.Map.of("pessoaId", 1, "tipo", "REU"));
            assertEquals(201, participante.code());

            var limpeza = cliente.delete("/audiencias/1/participantes");
            assertEquals(204, limpeza.code());

            var lista = cliente.get("/audiencias/1/participantes");
            assertEquals("[]", lista.body().string());
        });
    }

    /**
     * Login com sucesso devolve {@code usuario} e {@code primeiroAcesso};
     * com senha errada devolve 401 com o campo {@code erro} lido pela tela.
     */
    @Test
    void loginDeveSeguirOContratoDaTela() {
        JavalinTest.test(AudienciasApplication.criarApp(), (servidor, cliente) -> {
            var cadastro = cliente.post("/api/usuarios/cadastrar", java.util.Map.of(
                    "nomeCompleto", "Admin",
                    "email", "admin@tjsp.jus.br",
                    "telefone", "11999998888",
                    "matricula", "ADM123",
                    "senha", "segredo123"));
            assertEquals(201, cadastro.code());

            var login = cliente.post("/api/usuarios/login",
                    java.util.Map.of("login", "ADM123", "senha", "segredo123"));
            assertEquals(200, login.code());
            String corpo = login.body().string();
            assertTrue(corpo.contains("\"usuario\""));
            assertTrue(corpo.contains("\"primeiroAcesso\""));

            var falha = cliente.post("/api/usuarios/login",
                    java.util.Map.of("login", "ADM123", "senha", "errada"));
            assertEquals(401, falha.code());
            assertTrue(falha.body().string().contains("\"erro\""));
        });
    }

    /**
     * A pauta em PDF deve responder com o content-type correto.
     */
    @Test
    void pautaPdfDeveResponderComContentTypeDePdf() {
        JavalinTest.test(AudienciasApplication.criarApp(), (servidor, cliente) -> {
            var resposta = cliente.get("/pauta/pdf?data=2026-07-06");
            assertEquals(200, resposta.code());
            assertNotNull(resposta.header("Content-Type"));
            assertTrue(resposta.header("Content-Type").contains("application/pdf"));
        });
    }

    /**
     * O dashboard deve devolver todos os contadores esperados pela tela.
     */
    @Test
    void dashboardDeveTerTodosOsContadores() {
        JavalinTest.test(AudienciasApplication.criarApp(), (servidor, cliente) -> {
            var resposta = cliente.get("/estatisticas/dashboard");
            assertEquals(200, resposta.code());
            String corpo = resposta.body().string();
            for (String campo : new String[]{"totalAudiencias", "audienciasHoje", "totalVaras",
                    "totalJuizes", "totalPromotores", "totalAdvogados", "totalPessoas"}) {
                assertTrue(corpo.contains(campo), "faltou o campo " + campo);
            }
        });
    }
}
