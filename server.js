const express = require("express");
const cors = require("cors");
const fs = require("fs");
const axios = require("axios");
const app = express();

app.use(cors());

const CLIENT_ID = "fx2wjzdh5wbpmzctipvsroz922cgy3"; // 🔹 Substitua pelo seu Client ID da IGDB
const CLIENT_SECRET = "mdx4wuoxm9saxx8gmho2ubuyki11l1"; // 🔹 Substitua pelo seu Client Secret
const TOKEN = "ihpf8e1qingr69gsvum4n5cdriov67"; // 🔹 Gere um token com o comando curl acima

const IGDB_URL = "https://api.igdb.com/v4/games";

const plataformas = {
    "Nintendo 8Bits": 18,
    "Super Nintendo": 19,
    "Nintendo 64": 4,
    "GameCube": 21,
    "Wii": 5,
    "WiiU": 41,
    "Switch": 130,
    "GameBoy": 33,
    "GameBoy Color": 22,
    "GameBoy Advance": 24,
    "Nintendo DS": 20,
    "Nintendo 3DS": 37,
    "Master System": 64,
    "Mega Drive": 29,
    "Saturn": 32,
    "Dreamcast": 23,
    "PS1": 7,
    "PS2": 8,
    "PS3": 9,
    "PS4": 48,
    "PSP": 38,
    "Xbox": 11,
    "Xbox 360": 12,
    "Xbox One": 49
};

async function fetchAllGamesFromIGDB(platformId) {
    let allGames = [];
    let offset = 0;
    const limit = 50;

    try {
        console.log(`🔹 Buscando TODOS os jogos para plataforma ID ${platformId}...`);

        while (true) {
            const response = await axios.post(
                IGDB_URL,
                `fields name, cover.url, genres.name, first_release_date, summary, platforms; 
                where platforms = (${platformId}) & category = 0 & cover != null; 
                limit ${limit}; offset ${offset};`,
                {
                    headers: {
                        "Client-ID": CLIENT_ID,
                        "Authorization": `Bearer ${TOKEN}`,
                        "Accept": "application/json"
                    }
                }
            );

            if (response.data.length === 0) break;

            console.log(`📀 Obtidos ${response.data.length} jogos (offset ${offset})`);
            allGames = allGames.concat(response.data);
            offset += limit;
        }

        return allGames.map(game => ({
            id: game.id,
            nome: game.name,
            plataforma: Object.keys(plataformas).find(key => plataformas[key] === platformId),
            capa: game.cover ? game.cover.url.replace("t_thumb", "t_cover_big") : "",
            genero: game.genres ? game.genres.map(g => g.name).join(", ") : "Desconhecido",
            anoLancamento: game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : "Desconhecido",
            sinopse: game.summary || "Sem descrição disponível"
        }));
    } catch (error) {
        console.error("🚨 Erro ao buscar jogos da IGDB:", error.response?.data || error.message);
        return [];
    }
}

async function generateAllGamesOnStart() {
    if (fs.existsSync("jogos.json")) {
        console.log("✅ Arquivo jogos.json encontrado! Usando os dados salvos.");
        return;
    }

    let allGamesByPlatform = {};
    console.log("🔄 Buscando TODOS os jogos ao iniciar o servidor...");
    for (const [platformName, platformId] of Object.entries(plataformas)) {
        console.log(`📀 Buscando jogos para ${platformName}...`);
        const games = await fetchAllGamesFromIGDB(platformId);
        allGamesByPlatform[platformName] = games;
    }

    fs.writeFileSync("jogos.json", JSON.stringify(allGamesByPlatform, null, 2));
    console.log("✅ Jogos salvos automaticamente ao iniciar o servidor!");
}

generateAllGamesOnStart();

app.get("/games", (req, res) => {
    try {
        const platform = req.query.platform;
        if (!platform || !plataformas[platform]) {
            return res.status(400).json({ message: "Plataforma inválida ou não especificada." });
        }

        console.log(`🔍 Buscando jogos salvos para ${platform}...`);
        const allGames = JSON.parse(fs.readFileSync("jogos.json", "utf8"));

        if (!allGames[platform] || allGames[platform].length === 0) {
            return res.status(404).json({ message: "Nenhum jogo encontrado para essa plataforma." });
        }

        res.json(allGames[platform]);
    } catch (error) {
        console.error("🚨 Erro ao acessar jogos no JSON:", error);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
});


// 🔍 Listar todas as rotas disponíveis no servidor
app._router.stack.forEach((r) => {
    if (r.route && r.route.path) {
        console.log(`✅ Rota disponível: ${r.route.path}`);
    }
});



app.listen(3000, () => {
    console.log("✅ Servidor rodando na porta 3000");
});
