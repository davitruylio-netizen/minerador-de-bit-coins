package com.scratchhub.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@SpringBootApplication
@RestController
@RequestMapping("/api/games")
@CrossOrigin(origins = "*") // Libera acesso para o HTML local
public class ScratchHubApplication {

    public static void main(String[] args) {
        SpringApplication.run(ScratchHubApplication.class, args);
    }

    // Modelo do Jogo
    public static class Game {
        private Long id;
        private String title;
        private String scratchId;
        private String category;

        public Game(Long id, String title, String scratchId, String category) {
            this.id = id;
            this.title = title;
            this.scratchId = scratchId;
            this.category = category;
        }

        public Long getId() { return id; }
        public String getTitle() { return title; }
        public String getScratchId() { return scratchId; }
        public String getCategory() { return category; }
    }

    // Banco de dados em memória
    private final List<Game> gamesList = new ArrayList<>() {{
        add(new Game(1L, "Jogo Exemplo Scratch", "10128407", "Plataforma"));
        add(new Game(2L, "Labirinto", "60917032", "Puzzle"));
    }};
    private final AtomicLong counter = new AtomicLong(3);

    // Endpoint 1: Listar todos os jogos
    @GetMapping
    public List<Game> getAllGames() {
        return gamesList;
    }

    // Endpoint 2: Cadastrar novo jogo
    @PostMapping
    public Game addGame(@RequestBody Game game) {
        Game newGame = new Game(counter.getAndIncrement(), game.getTitle(), game.getScratchId(), game.getCategory());
        gamesList.add(newGame);
        return newGame;
    }
}
