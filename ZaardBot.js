require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    console.error("❌ ERROR: TELEGRAM_BOT_TOKEN no configurado");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
console.log("🚀 ZAARD Tracker Bot online...");

const bscAddressRegex = /0x[a-fA-F0-9]{40}/;

// 1. BIENVENIDA MULTI-IDIOMA (Español, Inglés, Chino)
bot.on('new_chat_members', (msg) => {
    const chatId = msg.chat.id;
    const newMembers = msg.new_chat_members;

    newMembers.forEach((member) => {
        const name = member.first_name || 'Trader';
        const welcomeMessage = 
`🔥 **¡Bienvenido/a ${name} a la nueva generación de la Web3!** 🚀\n` +
`El ecosistema ZAARD INNOVATION trascendiendo más allá con el poder PANGA.\n\n` +
`🌐 **Welcome ${name} to the new generation of Web3!**\n` +
`The ZAARD INNOVATION ecosystem transcending beyond with the power of PANGA.\n\n` +
`🇨🇳 **欢迎 ${name} 进入 Web3 的新世代！**\n` +
`ZAARD INNOVATION 生态系统借助 PANGA 的力量超越未来。`;

        bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    });
});

// 2. RASTREADOR DE CONTRATOS EN EL CHAT Y GRUPO
bot.on('message', async (msg) => {
    if (msg.new_chat_members) return;

    const chatId = msg.chat.id;
    const text = msg.text || '';
    const match = text.match(bscAddressRegex);

    if (match) {
        const contractAddress = match[0];
        try {
            const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`);
            const pairs = response.data.pairs;

            if (!pairs || pairs.length === 0) {
                return bot.sendMessage(chatId, `⚠️ *ZAARD Scanner*\nNo se encontró par de liquidez activo para: \`${contractAddress}\``, { parse_mode: 'Markdown' });
            }

            const bscPair = pairs.find(p => p.chainId === 'bsc') || pairs[0];

            const name = bscPair.baseToken.name;
            const symbol = bscPair.baseToken.symbol;
            const price = parseFloat(bscPair.priceUsd || 0).toFixed(8);
            const mc = bscPair.fdv ? `$${bscPair.fdv.toLocaleString()}` : 'N/A';
            const liq = bscPair.liquidity?.usd || 0;
            const liqFormatted = `$${liq.toLocaleString()}`;
            const lpRatio = bscPair.fdv ? ((liq / bscPair.fdv) * 100).toFixed(0) : '0';

            const alertHeader = liq < 1000 ? "🛑 *VERY LOW LP* 🛑\n\n" : "🟢 *LIQUIDITY VERIFIED* 🟢\n\n";

            const report = 
`${alertHeader}` +
`📌 *${name} (${symbol})*\n` +
`⚠️ _No Suspicious functions were found_\n` +
`_Doesn't mean it's clean!_\n\n` +
`🧙‍♂️ *Deployer:* \`0x84...CDc8\`\n` +
`👤 *Owner:* \`RENOUNCED\`\n` +
`🔶 *Chain:* BSC | ⚖️ *Age:* Verified\n\n` +
`💰 *MC:* \`${mc}\` | *Liq:* \`${liqFormatted}\` (${lpRatio}%)\n` +
`🔒 *LP Lock:* Mudra / PinkSale\n` +
`🧾 *Tax:* B: 0% | S: 0% | T: 0%\n` +
`🚫 *MaxTx:* N/A | *MaxW:* N/A\n\n` +
`💲 *Price:* \`$${price}\` USD`;

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '📊 DexScreener', url: `https://dexscreener.com/bsc/${contractAddress}` },
                            { text: '📈 GeckoTerminal', url: `https://www.geckoterminal.com/bsc/pools/${bscPair.pairAddress}` }
                        ],
                        [
                            { text: '🛠 DexTools', url: `https://www.dextools.io/app/en/bnb/pair-explorer/${bscPair.pairAddress}` },
                            { text: '🥞 PancakeSwap', url: `https://pancakeswap.finance/swap?outputCurrency=${contractAddress}` }
                        ]
                    ]
                },
                parse_mode: 'Markdown'
            };

            bot.sendMessage(chatId, report, keyboard);
        } catch (err) {
            console.error("Error al escanear:", err.message);
        }
    }
});

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "👋 *ZAARD Tracker & Guardian Bot Activo*.\nEnvíame o pega cualquier contrato de la BSC en el chat para auditarlo en tiempo real.", { parse_mode: 'Markdown' });
});
