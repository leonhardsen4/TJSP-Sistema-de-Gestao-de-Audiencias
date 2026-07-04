package br.jus.tjsp.audiencias.service;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.draw.LineSeparator;

import java.awt.Color;
import java.io.IOException;
import java.io.InputStream;

/**
 * Cabeçalho institucional comum aos documentos em PDF do sistema.
 *
 * <p>Reproduz o timbre oficial: o brasão do Tribunal no canto superior
 * esquerdo, ao lado o nome "TRIBUNAL DE JUSTIÇA DE SÃO PAULO" e, abaixo,
 * "COMARCA DE COTIA", encerrados por um filete horizontal — o mesmo padrão
 * de papel timbrado usado nos expedientes forenses.</p>
 */
public final class CabecalhoPdf {

    /** Azul institucional usado no nome do Tribunal e no filete. */
    static final Color AZUL_TJ = new Color(0, 45, 95);

    /** Cinza sóbrio da linha da comarca. */
    private static final Color CINZA = new Color(90, 90, 90);

    /** Caminho do brasão no classpath (pasta resources). */
    private static final String RECURSO_LOGO = "/Logotipo_TJSP_Fundo_Branco_WEB.jpg";

    /** Bytes do brasão, lidos uma única vez (nulo se ausente). */
    private static byte[] logoCache;

    /** Marca que a leitura do brasão já foi tentada. */
    private static boolean logoTentado;

    private CabecalhoPdf() {
        // Classe utilitária: não instanciável.
    }

    /**
     * Adiciona o timbre institucional ao topo do documento: brasão + nome do
     * Tribunal e da comarca, seguidos de um filete horizontal.
     *
     * @param documento documento em construção (já aberto)
     */
    public static void adicionar(Document documento) {
        PdfPTable timbre = new PdfPTable(new float[]{1f, 7f});
        timbre.setWidthPercentage(100);
        timbre.addCell(celulaBrasao());
        timbre.addCell(celulaTitulos());
        documento.add(timbre);

        LineSeparator filete = new LineSeparator(1.2f, 100, AZUL_TJ, Element.ALIGN_CENTER, -3);
        documento.add(new Chunk(filete));
    }

    /** Célula do brasão (ou vazia, se o arquivo não estiver disponível). */
    private static PdfPCell celulaBrasao() {
        PdfPCell celula;
        byte[] bytes = logo();
        if (bytes != null) {
            try {
                Image brasao = Image.getInstance(bytes);
                brasao.scaleToFit(58, 58);
                celula = new PdfPCell(brasao, false);
            } catch (IOException e) {
                celula = new PdfPCell();
            }
        } else {
            celula = new PdfPCell();
        }
        celula.setBorder(Rectangle.NO_BORDER);
        celula.setHorizontalAlignment(Element.ALIGN_LEFT);
        celula.setVerticalAlignment(Element.ALIGN_MIDDLE);
        return celula;
    }

    /** Célula com o nome do Tribunal e da comarca, em fonte serifada. */
    private static PdfPCell celulaTitulos() {
        PdfPCell celula = new PdfPCell();
        celula.setBorder(Rectangle.NO_BORDER);
        celula.setVerticalAlignment(Element.ALIGN_MIDDLE);
        celula.setPaddingLeft(6);

        Paragraph nome = new Paragraph("TRIBUNAL DE JUSTIÇA DE SÃO PAULO",
                new Font(Font.TIMES_ROMAN, 15, Font.BOLD, AZUL_TJ));
        Paragraph comarca = new Paragraph("COMARCA DE COTIA",
                new Font(Font.TIMES_ROMAN, 12, Font.BOLD, CINZA));
        comarca.setSpacingBefore(1);
        celula.addElement(nome);
        celula.addElement(comarca);
        return celula;
    }

    /** Lê o brasão do classpath uma única vez. */
    private static synchronized byte[] logo() {
        if (!logoTentado) {
            logoTentado = true;
            try (InputStream in = CabecalhoPdf.class.getResourceAsStream(RECURSO_LOGO)) {
                if (in != null) {
                    logoCache = in.readAllBytes();
                }
            } catch (IOException e) {
                logoCache = null;
            }
        }
        return logoCache;
    }
}
