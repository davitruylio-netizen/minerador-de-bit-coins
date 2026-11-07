
/* =========================================================
   SCRATCH UNIVERSE
   SISTEMA PRINCIPAL — JAVASCRIPT
   Versão 2.0
========================================================= */

"use strict";

/* =========================================================
   1. CONFIGURAÇÕES GERAIS
========================================================= */

const CONFIG = {
    api: "https://trampoline.turbowarp.org/api",
    officialApi: "https://api.scratch.mit.edu",

    thumbnail: "https://cdn2.scratch.mit.edu/get_image/project/",

    resultsPerPage: 24,
    maxResults: 40,

    requestTimeout: 15000,

    language: "pt",

    cacheDuration: 3 * 60 * 1000
};

/* =========================================================
   2. ELEMENTOS DO SITE
========================================================= */

const elements = {
    searchInput: document.getElementById("searchInput"),

    popularGames: document.getElementById("popularGames"),

    searchResults: document.getElementById("searchResults"),

    resultsTitle: document.getElementById("resultsTitle"),

    resultsDescription: document.getElementById("resultsDescription"),

    modal: document.getElementById("gameModal"),

    modalTitle: document.getElementById("modalTitle"),

    modalAuthor: document.getElementById("modalAuthor"),

    gameFrame: document.getElementById("gameFrame"),

    externalLink: document.getElementById("externalLink"),

    navigation: document.getElementById("navigation")
};

/* =========================================================
   3. ESTADO DA APLICAÇÃO
========================================================= */

const state = {
    currentQuery: "",
    currentMode: "trending",

    popular: [],

    search: [],

    activeCategory: "",

    requestCounter: 0,

    cache: new Map()
};

/* =========================================================
   4. UTILIDADES
========================================================= */

function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);

}


function formatNumber(value) {

    const number = Number(value) || 0;

    return Intl.NumberFormat("pt-BR", {
        notation: number >= 10000 ? "compact" : "standard",
        maximumFractionDigits: 1
    }).format(number);

}


function getThumbnail(id) {

    return `${CONFIG.thumbnail}${encodeURIComponent(id)}_480x360.png`;

}


function getProjectURL(id) {

    return `https://scratch.mit.edu/projects/${encodeURIComponent(id)}/`;

}


function showLoading(container, message = "Buscando jogos...") {

    container.innerHTML = `
        <div class="status-message">
            <div class="loader"></div>
            <h3>${escapeHTML(message)}</h3>
            <p>Estamos explorando o universo do Scratch.</p>
        </div>
    `;

}


function showError(container, title, description) {

    container.innerHTML = `
        <div class="status-message">
            <h3>⚠️ ${escapeHTML(title)}</h3>
            <p>${escapeHTML(description)}</p>
        </div>
    `;

}


/* =========================================================
   5. SISTEMA DE REQUISIÇÕES
========================================================= */

async function requestJSON(url) {

    const controller = new AbortController();

    const timer = setTimeout(
        () => controller.abort(),
        CONFIG.requestTimeout
    );

    try {

        const response = await fetch(url, {
            method: "GET",

            headers: {
                "Accept": "application/json"
            },

            signal: controller.signal
        });

        if (!response.ok) {

            throw new Error(
                `Servidor respondeu com HTTP ${response.status}`
            );

        }

        const data = await response.json();

        if (!Array.isArray(data) && typeof data !== "object") {

            throw new Error("Resposta inválida do servidor.");

        }

        return data;

    } finally {

        clearTimeout(timer);

    }

}


/* =========================================================
   6. CACHE TEMPORÁRIO
========================================================= */

function getCache(key) {

    const cached = state.cache.get(key);

    if (!cached) return null;

    if (Date.now() - cached.time > CONFIG.cacheDuration) {

        state.cache.delete(key);

        return null;

    }

    return cached.data;

}


function saveCache(key, data) {

    state.cache.set(key, {
        data,
        time: Date.now()
    });

}


/* =========================================================
   7. NORMALIZAÇÃO DOS JOGOS
========================================================= */

function normalizeGame(project) {

    const author = project.author || {};

    const stats = project.stats || {};

    const id = project.id;

    if (!id || !project.title) {

        return null;

    }

    return {

        id: String(id),

        title: String(project.title),

        author: String(
            project.username ||
            author.username ||
            project.author_name ||
            "Criador do Scratch"
        ),

        image:
            project.thumbnail_url ||
            getThumbnail(id),

        views: Number(
            stats.views ??
            project.views ??
            0
        ),

        loves: Number(
            stats.loves ??
            project.loves ??
            0
        ),

        favorites: Number(
            stats.favorites ??
            project.favorites ??
            0
        ),

        remixes: Number(
            stats.remixes ??
            project.remix_count ??
            0
        ),

        description: String(
            project.description || ""
        ),

        url: getProjectURL(id)

    };

}


/* =========================================================
   8. CONEXÃO COM A BUSCA DO SCRATCH
========================================================= */

async function searchScratch(query = "", mode = "trending") {

    const normalizedQuery = query.trim();

    const cacheKey = `${normalizedQuery}|${mode}`;

    const cached = getCache(cacheKey);

    if (cached) {

        return cached;

    }

    const params = new URLSearchParams({

        q: normalizedQuery,

        mode: mode,

        language: CONFIG.language,

        limit: String(CONFIG.maxResults),

        offset: "0"

    });

    const endpoint = `/search/projects?${params.toString()}`;

    const servers = [
        CONFIG.api + endpoint,
        CONFIG.officialApi + endpoint
    ];

    let lastError = null;

    for (const server of servers) {

        try {

            const data = await requestJSON(server);

            const list = Array.isArray(data)
                ? data
                : data.projects || data.results || [];

            const games = list
                .map(normalizeGame)
                .filter(Boolean);

            saveCache(cacheKey, games);

            return games;

        } catch (error) {

            console.warn(
                "Falha ao consultar:",
                server,
                error.message
            );

            lastError = error;

        }

    }

    throw new Error(
        lastError?.message ||
        "Não foi possível acessar os servidores."
    );

}


/* =========================================================
   9. CRIAÇÃO DOS CARDS
========================================================= */

function createGameCard(game) {

    const card = document.createElement("article");

    card.className = "game-card";

    card.tabIndex = 0;

    card.setAttribute(
        "aria-label",
        `Jogar ${game.title}`
    );

    card.innerHTML = `

        <img
            class="game-image"
            src="${escapeHTML(game.image)}"
            alt="Capa do jogo ${escapeHTML(game.title)}"
            loading="lazy"
        >

        <div class="game-info">

            <div class="game-title">
                ${escapeHTML(game.title)}
            </div>

            <div class="game-author">
                Criado por ${escapeHTML(game.author)}
            </div>

            <div class="game-stats">

                <span>👁 ${formatNumber(game.views)}</span>

                <span>❤️ ${formatNumber(game.loves)}</span>

                <span>⭐ ${formatNumber(game.favorites)}</span>

            </div>

            <span class="game-tag">
                PROJETO SCRATCH
            </span>

        </div>

    `;

    card.addEventListener("click", () => {

        openGame(game);

    });

    card.addEventListener("keydown", event => {

        if (event.key === "Enter" || event.key === " ") {

            event.preventDefault();

            openGame(game);

        }

    });

    const image = card.querySelector("img");

    image.addEventListener("error", () => {

        image.src =
            "https://placehold.co/480x360/191e35/ffffff?text=Scratch+Game";

    }, { once: true });

    return card;

}


/* =========================================================
   10. RENDERIZAÇÃO DOS JOGOS
========================================================= */

function renderGames(container, games) {

    container.replaceChildren();

    if (!games.length) {

        showError(
            container,
            "Nenhum jogo encontrado",
            "Tente pesquisar outro nome ou experimentar uma categoria diferente."
        );

        return;

    }

    const fragment = document.createDocumentFragment();

    games.forEach(game => {

        fragment.appendChild(
            createGameCard(game)
        );

    });

    container.appendChild(fragment);

}


/* =========================================================
   11. CARREGAR JOGOS POPULARES
========================================================= */

async function loadTrending() {

    showLoading(
        elements.popularGames,
        "Carregando jogos populares..."
    );

    state.currentMode = "trending";

    try {

        const games = await searchScratch("", "trending");

        state.popular = games;

        renderGames(
            elements.popularGames,
            games
        );

    } catch (error) {

        console.error(error);

        showError(
            elements.popularGames,
            "Não conseguimos carregar os jogos",
            error.message + ". Verifique a conexão e tente novamente."
        );

    }

}


/* =========================================================
   12. PESQUISA INTELIGENTE
========================================================= */

async function searchGames() {

    const query = elements.searchInput.value.trim();

    if (query.length < 2) {

        elements.searchInput.focus();

        elements.resultsTitle.textContent = "Pesquisa";

        showError(
            elements.searchResults,
            "Digite pelo menos 2 caracteres",
            "Informe o nome de um jogo ou uma palavra-chave."
        );

        return;

    }

    const requestId = ++state.requestCounter;

    state.currentQuery = query;

    state.currentMode = "popular";

    elements.resultsTitle.textContent =
        `Resultados para "${query}"`;

    elements.resultsDescription.textContent =
        "Procurando projetos com nomes e conteúdos relacionados.";

    showLoading(
        elements.searchResults,
        "Procurando jogos..."
    );

    document.getElementById("resultados").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    try {

        const games = await searchScratch(query, "popular");

        // Evita que uma pesquisa antiga sobrescreva a mais recente.

        if (requestId !== state.requestCounter) {

            return;

        }

        state.search = games;

        renderGames(
            elements.searchResults,
            games
        );

        elements.resultsDescription.textContent =
            `${games.length} projeto(s) encontrado(s).`;

    } catch (error) {

        if (requestId !== state.requestCounter) {

            return;

        }

        console.error(error);

        showError(
            elements.searchResults,
            "Falha na pesquisa",
            error.message
        );

    }

}


/* =========================================================
   13. PESQUISAS RÁPIDAS
========================================================= */

function quickSearch(query) {

    elements.searchInput.value = query;

    searchGames();

}


/* =========================================================
   14. CATEGORIAS
========================================================= */

async function selectCategory(button, category) {

    document.querySelectorAll(".category").forEach(item => {

        item.classList.remove("selected");

    });

    button.classList.add("selected");

    state.activeCategory = category;

    if (!category) {

        await loadTrending();

        return;

    }

    elements.resultsTitle.textContent =
        `Categoria: ${category}`;

    elements.resultsDescription.textContent =
        "Projetos encontrados para esta categoria.";

    showLoading(
        elements.popularGames,
        "Explorando categoria..."
    );

    try {

        const games = await searchScratch(category, "popular");

        renderGames(
            elements.popularGames,
            games
        );

    } catch (error) {

        showError(
            elements.popularGames,
            "Categoria indisponível",
            error.message
        );

    }

}


/* =========================================================
   15. ABRIR JOGO
========================================================= */

function openGame(game) {

    if (!game || !game.id) return;

    const id = encodeURIComponent(game.id);

    elements.modalTitle.textContent = game.title;

    elements.modalAuthor.textContent =
        `Criado por ${game.author}`;

    elements.externalLink.href =
        getProjectURL(id);

    elements.gameFrame.src =
        `https://scratch.mit.edu/projects/${id}/embed`;

    elements.modal.classList.add("open");

    document.body.style.overflow = "hidden";

}


/* =========================================================
   16. FECHAR JOGO
========================================================= */

function closeGame() {

    elements.modal.classList.remove("open");

    elements.gameFrame.src = "about:blank";

    document.body.style.overflow = "";

}


elements.modal.addEventListener("click", event => {

    if (event.target === elements.modal) {

        closeGame();

    }

});


document.addEventListener("keydown", event => {

    if (event.key === "Escape") {

        closeGame();

    }

});


/* =========================================================
   17. MENU MOBILE
========================================================= */

function toggleMenu() {

    elements.navigation.classList.toggle("show");

}


/* =========================================================
   18. TECLADO DA PESQUISA
========================================================= */

elements.searchInput.addEventListener("keydown", event => {

    if (event.key === "Enter") {

        searchGames();

    }

});


/* =========================================================
   19. INICIALIZAÇÃO
========================================================= */

async function initializeUniverse() {

    console.log(
        "%cSCRATCH UNIVERSE",
        "font-size:25px;font-weight:bold;color:#a78bfa"
    );

    console.log(
        "Inicializando o universo de jogos..."
    );

    await loadTrending();

}


/* =========================================================
   20. INICIAR
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeUniverse
);
