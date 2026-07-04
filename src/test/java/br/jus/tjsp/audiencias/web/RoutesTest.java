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
 * registrado corretamente sob o prefixo {@code /api}. Os demais caminhos
 * pertencem ao SPA e não devem responder como API.
 */
class RoutesTest extends TesteBase {

    /**
     * O ciclo criar/listar de varas deve funcionar via HTTP sob {@code /api},
     * e o mesmo caminho sem o prefixo NÃO deve responder como API (fica
     * reservado ao SPA, evitando colisão com as páginas do frontend).
     */
    @Test
    void crudDeVarasDeveResponderSomenteSobApi() {
        JavalinTest.test(AudienciasApplication.criarApp(), (servidor, cliente) -> {
            var criacao = cliente.post("/api/varas", java.util.Map.of("nome", "1ª Vara"));
            assertEquals(201, criacao.code());

            // Os textos são normalizados em MAIÚSCULAS na gravação.
            var comPrefixo = cliente.get("/api/varas");
            assertEquals(200, comPrefixo.code());
            assertTrue(comPrefixo.body().string().contains("1ª VARA"));

            // O caminho sem /api não é mais uma rota de API: não devolve o JSON
            // das varas (é território do SPA).
            var semPrefixo = cliente.get("/varas");
            assertTrue(semPrefixo.code() == 404
                            || !semPrefixo.body().string().contains("1ª VARA"),
                    "O caminho /varas (sem /api) não deve responder como API");
        });
    }

    /**
     * Erros de validação devem devolver 400 com o mapa {@code errors}.
     */
    @Test
    void validacaoDeveDevolver400ComErrors() {
        JavalinTest.test(AudienciasApplication.criarApp(), (servidor, cliente) -> {
            var resposta = cliente.post("/api/varas", java.util.Map.of("comarca", "X"));
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
            var resposta = cliente.get("/api/juizes/999");
            assertEquals(404, resposta.code());
            assertTrue(resposta.body().string().contains("não encontrado"));
        });
    }

    /**
     * O fluxo completo do fórum deve funcionar via HTTP: criar apoios,
     * criar a pauta do dia, criar a audiência dentro da pauta (herdando o
     * cabeçalho), checar conflito, gerenciar participantes e imprimir a
     * pauta simplificada.
     */
    @Test
    void fluxoCompletoDePautaEAudienciaDeveFuncionar() {
        JavalinTest.test(AudienciasApplication.criarApp(), (servidor, cliente) -> {
            cliente.post("/api/varas", java.util.Map.of("nome", "Vara"));
            cliente.post("/api/juizes", java.util.Map.of("nome", "Juiz"));
            cliente.post("/api/promotores", java.util.Map.of("nome", "Promotor"));
            cliente.post("/api/pessoas", java.util.Map.of("nome", "Carlos"));

            // Audiência avulsa não existe mais: nasce dentro da pauta.
            var pauta = cliente.post("/api/pautas", java.util.Map.of(
                    "data", "2026-07-06", "varaId", 1, "juizId", 1, "promotorId", 1,
                    "observacoes", "pauta de instrução"));
            assertEquals(201, pauta.code());

            var criacao = cliente.post("/api/pautas/1/audiencias", java.util.Map.of(
                    "numeroProcesso", "1234567-89.2026.8.26.0001",
                    "horarioInicio", "10:00",
                    "duracao", 60,
                    "status", "PENDENTE",
                    "tipoAudiencia", "JURI",
                    "competencia", "CRIMINAL",
                    "formato", "PRESENCIAL"));
            assertEquals(201, criacao.code());
            String corpoAudiencia = criacao.body().string();
            assertTrue(corpoAudiencia.contains("\"horarioFim\":\"11:00\""));
            // Herança rígida da pauta: data e vara vêm do cabeçalho.
            assertTrue(corpoAudiencia.contains("\"dataAudiencia\":\"2026-07-06\""));
            assertTrue(corpoAudiencia.contains("\"pautaId\":1"));

            var daPauta = cliente.get("/api/pautas/1/audiencias");
            assertEquals(200, daPauta.code());
            assertTrue(daPauta.body().string().contains("1234567-89.2026.8.26.0001"));

            var conflito = cliente.get(
                    "/api/audiencias/verificar-conflitos?data=2026-07-06&horarioInicio=10:30&duracao=60&varaId=1");
            assertEquals(200, conflito.code());
            assertTrue(conflito.body().string().contains("\"temConflito\":true"));

            var participante = cliente.post("/api/audiencias/1/participantes",
                    java.util.Map.of("pessoaId", 1, "tipo", "REU"));
            assertEquals(201, participante.code());

            var pdfDaPauta = cliente.get("/api/pautas/1/pdf");
            assertEquals(200, pdfDaPauta.code());
            assertTrue(pdfDaPauta.header("Content-Type").contains("application/pdf"));

            var limpeza = cliente.delete("/api/audiencias/1/participantes");
            assertEquals(204, limpeza.code());

            var lista = cliente.get("/api/audiencias/1/participantes");
            assertEquals("[]", lista.body().string());

            // Excluir a pauta leva junto as audiências (cascata).
            var exclusao = cliente.delete("/api/pautas/1");
            assertEquals(204, exclusao.code());
            assertEquals(404, cliente.get("/api/audiencias/1").code());
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
     * A pauta em PDF deve responder com o content-type correto, tanto na
     * forma antiga (por data) quanto na nova (por filtros).
     */
    @Test
    void pautaPdfDeveResponderComContentTypeDePdf() {
        JavalinTest.test(AudienciasApplication.criarApp(), (servidor, cliente) -> {
            var resposta = cliente.get("/api/pauta/pdf?data=2026-07-06");
            assertEquals(200, resposta.code());
            assertNotNull(resposta.header("Content-Type"));
            assertTrue(resposta.header("Content-Type").contains("application/pdf"));

            var comFiltros = cliente.get("/api/pauta/pdf?dataInicio=2026-07-01&dataFim=2026-07-31&status=DESIGNADA");
            assertEquals(200, comFiltros.code());
            assertTrue(comFiltros.header("Content-Type").contains("application/pdf"));
        });
    }

    /**
     * O fluxo do controle de mandados deve funcionar via HTTP: cadastrar
     * participante, listar mandados, atualizar a situação e consultar as
     * pendências.
     */
    @Test
    void fluxoDeMandadosEPendenciasDeveFuncionar() {
        JavalinTest.test(AudienciasApplication.criarApp(), (servidor, cliente) -> {
            cliente.post("/api/varas", java.util.Map.of("nome", "Vara"));
            cliente.post("/api/juizes", java.util.Map.of("nome", "Juiz"));
            cliente.post("/api/promotores", java.util.Map.of("nome", "Promotor"));
            cliente.post("/api/pessoas", java.util.Map.of("nome", "Maria"));
            cliente.post("/api/pautas", java.util.Map.of(
                    "data", "2099-07-06", "varaId", 1, "juizId", 1, "promotorId", 1));
            cliente.post("/api/pautas/1/audiencias", java.util.Map.of(
                    "numeroProcesso", "1234567-89.2026.8.26.0001",
                    "horarioInicio", "10:00",
                    "duracao", 60,
                    "status", "PENDENTE",
                    "tipoAudiencia", "JURI",
                    "competencia", "CRIMINAL",
                    "formato", "PRESENCIAL"));
            cliente.post("/api/audiencias/1/participantes", java.util.Map.of(
                    "pessoaId", 1, "tipo", "REU", "folhaIntimacao", "fls. 10"));

            var mandados = cliente.get("/api/mandados?statusMandado=PENDENTE");
            assertEquals(200, mandados.code());
            String corpoMandados = mandados.body().string();
            assertTrue(corpoMandados.contains("\"statusMandado\":\"PENDENTE\""));
            assertTrue(corpoMandados.contains("fls. 10"));

            var atualizacao = cliente.put("/api/mandados/1",
                    java.util.Map.of("statusMandado", "POSITIVO", "intimado", true));
            assertEquals(200, atualizacao.code());
            assertTrue(atualizacao.body().string().contains("\"statusMandado\":\"POSITIVO\""));

            var pendencias = cliente.get("/api/pendencias");
            assertEquals(200, pendencias.code());
            String corpoPendencias = pendencias.body().string();
            assertTrue(corpoPendencias.contains("audienciasSemParte"));
            assertTrue(corpoPendencias.contains("partesNaoIntimadas"));
            assertTrue(corpoPendencias.contains("mandadosComProblema"));
        });
    }

    /**
     * O dashboard deve devolver todos os contadores esperados pela tela.
     */
    @Test
    void dashboardDeveTerTodosOsContadores() {
        JavalinTest.test(AudienciasApplication.criarApp(), (servidor, cliente) -> {
            var resposta = cliente.get("/api/estatisticas/dashboard");
            assertEquals(200, resposta.code());
            String corpo = resposta.body().string();
            for (String campo : new String[]{"totalAudiencias", "audienciasHoje", "totalVaras",
                    "totalJuizes", "totalPromotores", "totalAdvogados", "totalPessoas"}) {
                assertTrue(corpo.contains(campo), "faltou o campo " + campo);
            }
        });
    }
}
