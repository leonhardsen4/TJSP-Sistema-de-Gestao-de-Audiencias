package br.jus.tjsp.audiencias.controller;

import br.jus.tjsp.audiencias.service.EstatisticasService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/estatisticas")
@CrossOrigin(origins = "*")
public class EstatisticasController {

    private final EstatisticasService estatisticasService;

    @Autowired
    public EstatisticasController(EstatisticasService estatisticasService) {
        this.estatisticasService = estatisticasService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Long>> obterEstatisticasDashboard() {
        Map<String, Long> estatisticas = estatisticasService.obterEstatisticasDashboard();
        return ResponseEntity.ok(estatisticas);
    }
}