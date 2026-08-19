const { Bot, Keyboard, InlineKeyboard } = require('grammy');
const http = require('http');
const pool = require('./db');
require('dotenv').config();

const bot = new Bot(process.env.BOT_TOKEN);
const userSessions = new Map();

// Admin ID ከ .env ፋይል ይነበባል
const ADMIN_ID = process.env.ADMIN_ID ? parseInt(process.env.ADMIN_ID) : null;

// ==================== RENDER DUMMY HTTP SERVER ====================
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Broker Bot is active and healthy!\n');
}).listen(PORT, () => {
    console.log(`🌐 Dummy HTTP server running on port ${PORT}`);
});

// ==================== ቋንቋዎች (TRANSLATIONS) ====================
const i18n = {
    am: {
        welcome: "እንኳን ወደ አዲሱ የቤት እና የመኪና አደራራጊ (Broker) ቦት በደህና መጡ! 🇪🇹\n\nከታች ካሉት አማራጮች አንዱን ይምረጡ፡",
        btn_search: "🏠 ቤቶች / 🚗 መኪኖች ፈልግ",
        btn_add: "➕ ንብረት መመዝገብ (ለደላሎች)",
        btn_profile: "👤 አካውንቴ / ፕሮፋይል",
        btn_lang: "🌐 Change Language / ቋንቋ ቀይር",
        select_lang: "እባክዎ የሚፈልጉትን ቋንቋ ይምረጡ / Please select your language:",
        lang_updated: "✅ ቋንቋው ወደ አማርኛ ተቀይሯል!",
        search_type: "ምን አይነት ንብረት መፈለግ ይፈልጋሉ?",
        search_filter_opt: "🔍 እንዴት መፈለግ ይፈልጋሉ?",
        btn_all: "📋 ሁሉንም አሳይ",
        btn_by_price: "💰 በዋጋ Range",
        btn_by_rooms: "🛏️ በመኝታ ክፍል ብዛት",
        enter_max_price: "እባክዎ ከፍተኛውን ዋጋ በ ETB ያስገቡ (ምሳሌ፦ 5000000)፡",
        enter_rooms: "እባክዎ የሚፈልጉትን የመኝታ ክፍል ብዛት ያስገቡ (ምሳሌ፦ 2)፡",
        no_result: "❌ በዚህ መስፈርት የተገኘ ምንም ንብረት አልተገኘም።",
        my_props: "📋 የእኔ ንብረቶች",
        no_props: "❌ እስካሁን ያስመዘገቡት ምንም ንብረት የለም።",
        deleted: "🗑️ ንብረቱ በትክክል ተሰርዟል።"
    },
    en: {
        welcome: "Welcome to the Real Estate & Car Broker Bot! 🇬🇧\n\nPlease select an option below:",
        btn_search: "🏠 Search Houses / 🚗 Cars",
        btn_add: "➕ Add Listing (Brokers)",
        btn_profile: "👤 My Profile",
        btn_lang: "🌐 Change Language / ቋንቋ ቀይር",
        select_lang: "Please select your language / እባክዎ የሚፈልጉትን ቋንቋ ይምረጡ፡",
        lang_updated: "✅ Language successfully set to English!",
        search_type: "What type of property are you looking for?",
        search_filter_opt: "🔍 How would you like to search?",
        btn_all: "📋 Show All",
        btn_by_price: "💰 By Price Range",
        btn_by_rooms: "🛏️ By Bedroom Count",
        enter_max_price: "Please enter the maximum price in ETB (e.g., 5000000):",
        enter_rooms: "Please enter the required number of bedrooms (e.g., 2):",
        no_result: "❌ No properties found matching your criteria.",
        my_props: "📋 My Properties",
        no_props: "❌ You have not listed any properties yet.",
        deleted: "🗑️ Property deleted successfully."
    }
};

// Helper: Get User Language
async function getUserLang(telegramId) {
    try {
        const [rows] = await pool.execute('SELECT language FROM users WHERE telegram_id = ?', [telegramId]);
        return rows.length > 0 && rows[0].language ? rows[0].language : 'am';
    } catch {
        return 'am';
    }
}

// ==================== COMMANDS & HEARS ====================

// /start command
bot.command('start', async (ctx) => {
    const telegramId = ctx.from.id;
    userSessions.delete(telegramId);

    const fullName = `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim();
    const lang = await getUserLang(telegramId);

    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
        if (rows.length === 0) {
            await pool.execute('INSERT INTO users (telegram_id, full_name, language) VALUES (?, ?, ?)', [telegramId, fullName, 'am']);
        }

        const mainMenu = new Keyboard()
            .text(i18n[lang].btn_search)
            .row()
            .text(i18n[lang].btn_add)
            .text(i18n[lang].btn_profile)
            .row()
            .text(i18n[lang].btn_lang)
            .resized();

        await ctx.reply(`${i18n[lang].welcome}`, { reply_markup: mainMenu });
    } catch (error) {
        console.error('Error in /start:', error);
    }
});

// Admin Command
bot.command('admin', async (ctx) => {
    if (ADMIN_ID && ctx.from.id !== ADMIN_ID) {
        return ctx.reply('⚠️ ይህ ክፍል ለአስተዳዳሪዎች ብቻ የተፈቀደ ነው!');
    }

    try {
        const [[userStats]] = await pool.execute('SELECT COUNT(*) as total_users FROM users');
        const [[propStats]] = await pool.execute('SELECT COUNT(*) as total_props FROM properties');

        const adminText = `⚙️ <b>የአድሚን መቆጣጠሪያ ፓነል / Admin Panel</b>\n\n` +
            `👥 <b>ጠቅላላ ተጠቃሚዎች:</b> ${userStats.total_users}\n` +
            `📦 <b>ጠቅላላ ንብረቶች:</b> ${propStats.total_props}\n\n` +
            `ከታች ካሉት አማራጮች ይምረጡ፦`;

        const adminMenu = new InlineKeyboard()
            .text('📢 Broadcast Message (ማስታወቂያ ላክ)', 'admin_broadcast')
            .row()
            .text('📊 ዘገባ (Stats Refresh)', 'admin_stats');

        await ctx.reply(adminText, { parse_mode: 'HTML', reply_markup: adminMenu });
    } catch (error) {
        console.error('Admin Panel Error:', error);
        await ctx.reply('❌ የአድሚን መረጃዎችን በማምጣት ላይ ስህተት ተፈጥሯል።');
    }
});

// Multi-Language Switcher
bot.hears(['🌐 Change Language / ቋንቋ ቀይር', '🌐 Change Language', '🌐 ቋንቋ ቀይር', i18n.am.btn_lang, i18n.en.btn_lang], async (ctx) => {
    const langMenu = new InlineKeyboard()
        .text('🇪🇹 አማርኛ', 'set_lang_am')
        .text('🇬🇧 English', 'set_lang_en');

    await ctx.reply('Please select your preferred language / እባክዎ የሚፈልጉትን ቋንቋ ይምረጡ፡', { reply_markup: langMenu });
});

bot.callbackQuery(['set_lang_am', 'set_lang_en'], async (ctx) => {
    const newLang = ctx.callbackQuery.data === 'set_lang_am' ? 'am' : 'en';
    const telegramId = ctx.from.id;

    await pool.execute('UPDATE users SET language = ? WHERE telegram_id = ?', [newLang, telegramId]);
    await ctx.answerCallbackQuery();

    const mainMenu = new Keyboard()
        .text(i18n[newLang].btn_search)
        .row()
        .text(i18n[newLang].btn_add)
        .text(i18n[newLang].btn_profile)
        .row()
        .text(i18n[newLang].btn_lang)
        .resized();

    await ctx.reply(i18n[newLang].lang_updated, { reply_markup: mainMenu });
});

// Profile Handler
bot.hears(['👤 አካውንቴ / ፕሮፋይል', '👤 My Profile', i18n.am.btn_profile, i18n.en.btn_profile], async (ctx) => {
    const telegramId = ctx.from.id;
    const lang = await getUserLang(telegramId);

    try {
        const [userRows] = await pool.execute('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
        const [propRows] = await pool.execute('SELECT COUNT(*) as total FROM properties WHERE user_id = ?', [telegramId]);

        const user = userRows[0];
        const totalListings = propRows[0] ? propRows[0].total : 0;

        const profileText = `👤 <b>${lang === 'am' ? 'የተጠቃሚ ፕሮፋይል' : 'User Profile'}</b>\n\n` +
            `👤 <b>${lang === 'am' ? 'ስም' : 'Name'}:</b> ${user ? user.full_name : ctx.from.first_name}\n` +
            `🆔 <b>Telegram ID:</b> <code>${telegramId}</code>\n` +
            `📦 <b>${lang === 'am' ? 'የተመዘገቡ ንብረቶች ብዛት' : 'Total Listings'}:</b> ${totalListings}\n`;

        const profileMenu = new InlineKeyboard().text(i18n[lang].my_props, 'my_properties');

        await ctx.reply(profileText, { parse_mode: 'HTML', reply_markup: profileMenu });
    } catch (error) {
        console.error('Error fetching profile:', error);
    }
});

// Add Listing Flow Trigger
bot.hears(['➕ ንብረት መመዝገብ (ለደላሎች)', '➕ Add Listing (Brokers)', i18n.am.btn_add, i18n.en.btn_add], async (ctx) => {
    userSessions.set(ctx.from.id, { step: 'SELECT_CATEGORY' });

    const categoryMenu = new InlineKeyboard()
        .text('🏠 House / ቤት', 'cat_house')
        .text('🚗 Car / መኪና', 'cat_car');

    await ctx.reply('እባክዎ የሚመዘግቡትን ንብረት ምድብ ይምረጡ / Please select category:', { reply_markup: categoryMenu });
});

// Search Trigger
bot.hears(['🏠 ቤቶች / 🚗 መኪኖች ፈልግ', '🏠 Search Houses / 🚗 Cars', i18n.am.btn_search, i18n.en.btn_search], async (ctx) => {
    const lang = await getUserLang(ctx.from.id);
    const searchMenu = new InlineKeyboard()
        .text('🏠 Houses / ቤቶች', 'search_cat_house')
        .text('🚗 Cars / መኪኖች', 'search_cat_car');

    await ctx.reply(i18n[lang].search_type, { reply_markup: searchMenu });
});

// ==================== CALLBACK QUERIES ====================

bot.callbackQuery('admin_stats', async (ctx) => {
    if (ADMIN_ID && ctx.from.id !== ADMIN_ID) return ctx.answerCallbackQuery('⚠️ ያልተፈቀደ ሙከራ!');

    try {
        const [[userStats]] = await pool.execute('SELECT COUNT(*) as total_users FROM users');
        const [[propStats]] = await pool.execute('SELECT COUNT(*) as total_props FROM properties');

        const adminText = `⚙️ <b>የአድሚን መቆጣጠሪያ ፓነል / Admin Panel</b>\n\n` +
            `👥 <b>ጠቅላላ ተጠቃሚዎች:</b> ${userStats.total_users}\n` +
            `📦 <b>ጠቅላላ ንብረቶች:</b> ${propStats.total_props}\n\n` +
            `ከታች ካሉት አማራጮች ይምረጡ፦`;

        await ctx.answerCallbackQuery('መረጃው ታድሷል!');
        await ctx.editMessageText(adminText, {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard().text('📢 Broadcast Message (ማስታወቂያ ላክ)', 'admin_broadcast').row().text('📊 ዘገባ (Stats Refresh)', 'admin_stats')
        });
    } catch (error) {
        console.error(error);
    }
});

bot.callbackQuery('admin_broadcast', async (ctx) => {
    if (ADMIN_ID && ctx.from.id !== ADMIN_ID) return ctx.answerCallbackQuery('⚠️ ያልተፈቀደ ሙከራ!');

    await ctx.answerCallbackQuery();
    userSessions.set(ctx.from.id, { step: 'AWAITING_BROADCAST_TEXT' });
    await ctx.reply('📢 እባክዎ ለሁሉም ተጠቃሚዎች የሚላከውን ማስታወቂያ/ጽሁፍ ያስገቡ፦');
});

bot.callbackQuery('my_properties', async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = ctx.from.id;
    const lang = await getUserLang(telegramId);

    try {
        const [rows] = await pool.execute('SELECT * FROM properties WHERE user_id = ? ORDER BY created_at DESC', [telegramId]);

        if (rows.length === 0) {
            return ctx.reply(i18n[lang].no_props);
        }

        for (const item of rows) {
            const priceETB = `${Number(item.price).toLocaleString()} ETB`;
            let caption = `<b>${item.title}</b>\n\n💰 <b>Price/ዋጋ:</b> ${priceETB}\n📍 <b>Location/ቦታ:</b> ${item.location}\n📞 <b>Phone:</b> ${item.phone_number}`;

            const deleteBtn = new InlineKeyboard().text('🗑️ Delete / ሰርዝ', `delete_${item.id}`);

            if (item.photo_id) {
                await ctx.replyWithPhoto(item.photo_id, { caption, parse_mode: 'HTML', reply_markup: deleteBtn });
            } else {
                await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: deleteBtn });
            }
        }
    } catch (error) {
        console.error('Error fetching user properties:', error);
    }
});

bot.callbackQuery(/^delete_(\d+)$/, async (ctx) => {
    const propertyId = ctx.match[1];
    const telegramId = ctx.from.id;
    const lang = await getUserLang(telegramId);

    try {
        await pool.execute('DELETE FROM properties WHERE id = ? AND user_id = ?', [propertyId, telegramId]);
        await ctx.answerCallbackQuery();
        await ctx.reply(i18n[lang].deleted);
    } catch (error) {
        console.error('Error deleting property:', error);
    }
});

bot.callbackQuery(['search_cat_house', 'search_cat_car'], async (ctx) => {
    await ctx.answerCallbackQuery();
    const lang = await getUserLang(ctx.from.id);
    const category = ctx.callbackQuery.data === 'search_cat_house' ? 'house' : 'car';

    userSessions.set(ctx.from.id, { search_category: category });

    const filterMenu = new InlineKeyboard()
        .text(i18n[lang].btn_all, 'filter_all')
        .text(i18n[lang].btn_by_price, 'filter_price');

    if (category === 'house') {
        filterMenu.row().text(i18n[lang].btn_by_rooms, 'filter_rooms');
    }

    await ctx.reply(i18n[lang].search_filter_opt, { reply_markup: filterMenu });
});

bot.callbackQuery('filter_all', async (ctx) => {
    await ctx.answerCallbackQuery();
    const session = userSessions.get(ctx.from.id) || {};
    executeSearch(ctx, 'SELECT * FROM properties WHERE category = ? ORDER BY created_at DESC LIMIT 10', [session.search_category]);
});

bot.callbackQuery('filter_price', async (ctx) => {
    await ctx.answerCallbackQuery();
    const lang = await getUserLang(ctx.from.id);
    const session = userSessions.get(ctx.from.id) || {};
    session.search_step = 'AWAITING_MAX_PRICE';
    userSessions.set(ctx.from.id, session);

    await ctx.reply(i18n[lang].enter_max_price);
});

bot.callbackQuery('filter_rooms', async (ctx) => {
    await ctx.answerCallbackQuery();
    const lang = await getUserLang(ctx.from.id);
    const session = userSessions.get(ctx.from.id) || {};
    session.search_step = 'AWAITING_ROOM_COUNT';
    userSessions.set(ctx.from.id, session);

    await ctx.reply(i18n[lang].enter_rooms);
});

async function executeSearch(ctx, query, params) {
    const lang = await getUserLang(ctx.from.id);
    try {
        const [rows] = await pool.execute(query, params);

        if (rows.length === 0) {
            return ctx.reply(i18n[lang].no_result);
        }

        for (const item of rows) {
            const priceETB = `${Number(item.price).toLocaleString()} ETB`;
            const priceUSD = item.price_usd ? ` (~$${Number(item.price_usd).toLocaleString()} USD)` : '';

            let caption = `<b>${item.title}</b>\n\n💰 <b>Price/ዋጋ:</b> ${priceETB}${priceUSD}\n📍 <b>Location/ቦታ:</b> ${item.location}\n`;

            if (item.category === 'house') {
                caption += `🛏️ <b>መኝታ:</b> ${item.bedrooms || 'N/A'} | 🚽 <b>መጸዳጃ:</b> ${item.bathrooms || 'N/A'} | 🛋️ <b>ሳሎን:</b> ${item.living_rooms || 'N/A'}\n`;
                caption += `📐 <b>ስፋት:</b> ${item.area_sqm ? item.area_sqm + ' m²' : 'N/A'} | 🏠 <b>ዕቃ:</b> ${item.furnished_status || 'N/A'}\n`;
            } else {
                caption += `🚘 <b>Make/Model:</b> ${item.make || ''} ${item.model || ''} (${item.year_built || ''})\n`;
                caption += `⚙️ <b>Trans:</b> ${item.transmission || 'N/A'} | ⛽ <b>Fuel:</b> ${item.fuel_type || 'N/A'}\n`;
                caption += `🛣️ <b>Mileage:</b> ${item.mileage ? Number(item.mileage).toLocaleString() + ' KM' : 'N/A'}\n`;
            }

            caption += `📞 <b>Phone:</b> ${item.phone_number}`;

            if (item.photo_id) {
                await ctx.replyWithPhoto(item.photo_id, { caption, parse_mode: 'HTML' });
            } else {
                await ctx.reply(caption, { parse_mode: 'HTML' });
            }
        }
    } catch (err) {
        console.error(err);
        await ctx.reply('Search error occurred.');
    }
}

bot.callbackQuery(['cat_house', 'cat_car'], async (ctx) => {
    const category = ctx.callbackQuery.data === 'cat_house' ? 'house' : 'car';
    const session = userSessions.get(ctx.from.id) || {};
    session.category = category;
    session.step = 'SELECT_TYPE';
    userSessions.set(ctx.from.id, session);

    await ctx.answerCallbackQuery();

    const typeMenu = new InlineKeyboard()
        .text('💰 For Sale / ለሽያጭ', 'type_sale')
        .text('🔑 For Rent / ለኪራይ', 'type_rent');

    await ctx.reply('የሽያጭ አይነት ይምረጡ / Select Listing Type:', { reply_markup: typeMenu });
});

bot.callbackQuery(['type_sale', 'type_rent'], async (ctx) => {
    const type = ctx.callbackQuery.data === 'type_sale' ? 'sale' : 'rent';
    const session = userSessions.get(ctx.from.id);
    if (!session) return ctx.answerCallbackQuery();

    session.type = type;
    session.step = 'AWAITING_TITLE';
    userSessions.set(ctx.from.id, session);

    await ctx.answerCallbackQuery();

    let promptMessage = session.category === 'house'
        ? 'እባክዎ የቤቱን መግለጫ/ርዕስ ያስገቡ (ምሳሌ፦ አዲስ የተሰራ G+2 ቪላ፣ አፓርታማ...)፡'
        : 'እባክዎ የመኪናውን መግለጫ/ርዕስ ያስገቡ (ምሳሌ፦ Toyota Corolla 2020፣ Hyundai Tucson...)፡';

    await ctx.reply(promptMessage);
});

bot.callbackQuery(['furn_yes', 'furn_no'], async (ctx) => {
    const session = userSessions.get(ctx.from.id);
    if (!session) return ctx.answerCallbackQuery();

    session.furnished_status = ctx.callbackQuery.data === 'furn_yes' ? 'Furnished' : 'Unfurnished';
    session.step = 'AWAITING_LOCATION';
    userSessions.set(ctx.from.id, session);

    await ctx.answerCallbackQuery();
    await ctx.reply('እባክዎ የቤቱን አድራሻ/ቦታ ያስገቡ (ምሳሌ፦ ቦሌ, አዲስ አበባ)፡');
});

bot.callbackQuery(['trans_auto', 'trans_manual'], async (ctx) => {
    const session = userSessions.get(ctx.from.id);
    if (!session) return ctx.answerCallbackQuery();

    session.transmission = ctx.callbackQuery.data === 'trans_auto' ? 'Automatic' : 'Manual';
    session.step = 'AWAITING_FUEL_TYPE';
    userSessions.set(ctx.from.id, session);

    await ctx.answerCallbackQuery();

    const fuelMenu = new InlineKeyboard()
        .text('⛽ Petrol (ቤንዚን)', 'fuel_petrol')
        .text('🛢️ Diesel (ዲዜል)', 'fuel_diesel')
        .row()
        .text('⚡ Electric (ኤሌክትሪክ)', 'fuel_ev');

    await ctx.reply('የነዳጅ/የጉልበት አይነት ይምረጡ / Select Fuel Type:', { reply_markup: fuelMenu });
});

bot.callbackQuery(['fuel_petrol', 'fuel_diesel', 'fuel_ev'], async (ctx) => {
    const session = userSessions.get(ctx.from.id);
    if (!session) return ctx.answerCallbackQuery();

    const mapFuel = { fuel_petrol: 'Petrol', fuel_diesel: 'Diesel', fuel_ev: 'Electric' };
    session.fuel_type = mapFuel[ctx.callbackQuery.data];
    session.step = 'AWAITING_MILEAGE';
    userSessions.set(ctx.from.id, session);

    await ctx.answerCallbackQuery();
    await ctx.reply('እባክዎ መኪናው የሄደውን ኪሎሜትር ያስገቡ (ምሳሌ፦ 45000)፡');
});

// ==================== GLOBAL MESSAGE LISTENER ====================

bot.on('message', async (ctx, next) => {
    if (ctx.message.text === '/start') {
        userSessions.delete(ctx.from.id);
        return next();
    }

    const session = userSessions.get(ctx.from.id);
    if (!session) return next();

    // --- Admin Broadcast Listener ---
    if (session.step === 'AWAITING_BROADCAST_TEXT' && ctx.message.text) {
        if (ADMIN_ID && ctx.from.id !== ADMIN_ID) return;

        const broadcastMsg = ctx.message.text;
        userSessions.delete(ctx.from.id);

        try {
            const [users] = await pool.execute('SELECT telegram_id FROM users');
            let successCount = 0;

            await ctx.reply(`🔄 ማስታወቂያውን ለ ${users.length} ተጠቃሚዎች በመላክ ላይ...`);

            for (const u of users) {
                try {
                    await bot.api.sendMessage(u.telegram_id, `📢 <b>ማስታወቂያ / Announcement</b>\n\n${broadcastMsg}`, { parse_mode: 'HTML' });
                    successCount++;
                } catch (e) {
                    // User blocked bot
                }
            }

            return ctx.reply(`✅ ማስታወቂያው ለ ${successCount} ተጠቃሚዎች በትክክል ደርሷል!`);
        } catch (error) {
            console.error('Broadcast Error:', error);
            return ctx.reply('❌ ማስታወቂያ በመላክ ላይ ስህተት ተፈጥሯል።');
        }
    }

    // --- Dynamic Search Handlers ---
    if (session.search_step === 'AWAITING_MAX_PRICE' && ctx.message.text) {
        const maxPrice = parseFloat(ctx.message.text.replace(/,/g, ''));
        if (isNaN(maxPrice)) {
            return ctx.reply('⚠️ እባክዎ ትክክለኛ ቁጥር ብቻ ያስገቡ (ምሳሌ፦ 5000000)፡');
        }

        delete session.search_step;
        userSessions.set(ctx.from.id, session);
        executeSearch(ctx, 'SELECT * FROM properties WHERE category = ? AND price <= ? ORDER BY price ASC LIMIT 10', [session.search_category, maxPrice]);
        return;
    }

    if (session.search_step === 'AWAITING_ROOM_COUNT' && ctx.message.text) {
        const rooms = parseInt(ctx.message.text);
        if (isNaN(rooms)) {
            return ctx.reply('⚠️ እባክዎ ትክክለኛ ቁጥር ብቻ ያስገቡ (ምሳሌ፦ 2)፡');
        }

        delete session.search_step;
        userSessions.set(ctx.from.id, session);
        executeSearch(ctx, 'SELECT * FROM properties WHERE category = "house" AND bedrooms = ? ORDER BY created_at DESC LIMIT 10', [rooms]);
        return;
    }

    // --- Add Property Form Steps ---

    if (session.step === 'AWAITING_TITLE' && ctx.message.text) {
        session.title = ctx.message.text;
        session.step = 'AWAITING_PRICE';
        userSessions.set(ctx.from.id, session);
        return ctx.reply('እባክዎ ዋጋ በ ETB ያስገቡ (ምሳሌ፦ 2500000)፡');
    }

    if (session.step === 'AWAITING_PRICE' && ctx.message.text) {
        const price = parseFloat(ctx.message.text.replace(/,/g, ''));
        if (isNaN(price)) {
            return ctx.reply('⚠️ እባክዎ ትክክለኛ የዋጋ ቁጥር ብቻ ያስገቡ (ምሳሌ፦ 2500000)፡');
        }

        session.price = price;

        if (session.category === 'house') {
            session.step = 'AWAITING_BEDROOMS';
            userSessions.set(ctx.from.id, session);
            return ctx.reply('እባክዎ የመኝታ ክፍል (Bedrooms) ብዛት ያስገቡ (ምሳሌ፦ 3)፡');
        } else {
            session.step = 'AWAITING_MAKE';
            userSessions.set(ctx.from.id, session);
            return ctx.reply('እባክዎ የመኪናውን ኩባንያ/ብራንድ ያስገቡ (ምሳሌ፦ Toyota, Hyundai, Suzuki)፡');
        }
    }

    // --- HOUSE SPECIFIC STEPS ---

    if (session.step === 'AWAITING_BEDROOMS' && ctx.message.text) {
        const bedrooms = parseInt(ctx.message.text);
        if (isNaN(bedrooms)) {
            return ctx.reply('⚠️ እባክዎ ትክክለኛ የመኝታ ክፍል ቁጥር ያስገቡ (ምሳሌ፦ 3)፡');
        }

        session.bedrooms = bedrooms;
        session.step = 'AWAITING_BATHROOMS';
        userSessions.set(ctx.from.id, session);
        return ctx.reply('እባክዎ የመጸዳጃ ቤት (Bathrooms) ብዛት ያስገቡ (ምሳሌ፦ 2)፡');
    }

    if (session.step === 'AWAITING_BATHROOMS' && ctx.message.text) {
        const bathrooms = parseInt(ctx.message.text);
        if (isNaN(bathrooms)) {
            return ctx.reply('⚠️ እባክዎ ትክክለኛ የመጸዳጃ ቤት ቁጥር ያስገቡ (ምሳሌ፦ 2)፡');
        }

        session.bathrooms = bathrooms;
        session.step = 'AWAITING_LIVING_ROOMS';
        userSessions.set(ctx.from.id, session);
        return ctx.reply('እባክዎ የሳሎን (Living Rooms) ብዛት ያስገቡ (ምሳሌ፦ 1)፡');
    }

    if (session.step === 'AWAITING_LIVING_ROOMS' && ctx.message.text) {
        const livingRooms = parseInt(ctx.message.text);
        if (isNaN(livingRooms)) {
            return ctx.reply('⚠️ እባክዎ ትክክለኛ የሳሎን ቁጥር ያስገቡ (ምሳሌ፦ 1)፡');
        }

        session.living_rooms = livingRooms;
        session.step = 'AWAITING_AREA';
        userSessions.set(ctx.from.id, session);
        return ctx.reply('እባክዎ የቤቱን ስፋት በካሬ ሜትር ያስገቡ (ምሳሌ፦ 150)፡');
    }

    if (session.step === 'AWAITING_AREA' && ctx.message.text) {
        const area = parseFloat(ctx.message.text);
        if (isNaN(area)) {
            return ctx.reply('⚠️ እባክዎ ትክክለኛ የካሬ ሜትር ቁጥር ያስገቡ (ምሳሌ፦ 150)፡');
        }

        session.area_sqm = area;
        session.step = 'AWAITING_FURNISHED';
        userSessions.set(ctx.from.id, session);

        const furnMenu = new InlineKeyboard()
            .text('🛋️ ዕቃ ያለው (Furnished)', 'furn_yes')
            .text('🏠 ዕቃ የሌለው (Unfurnished)', 'furn_no');

        return ctx.reply('ቤቱ ዕቃ አለው ወይስ የለውም?', { reply_markup: furnMenu });
    }

    // --- CAR SPECIFIC STEPS ---

    if (session.step === 'AWAITING_MAKE' && ctx.message.text) {
        session.make = ctx.message.text;
        session.step = 'AWAITING_MODEL';
        userSessions.set(ctx.from.id, session);
        return ctx.reply('እባክዎ የመኪናውን ሞዴል ያስገቡ (ምሳሌ፦ Corolla, Tucson, RAV4)፡');
    }

    if (session.step === 'AWAITING_MODEL' && ctx.message.text) {
        session.model = ctx.message.text;
        session.step = 'AWAITING_YEAR';
        userSessions.set(ctx.from.id, session);
        return ctx.reply('እባክዎ የተሰራበትን ዓመተ ምህረት ያስገቡ (ምሳሌ፦ 2022)፡');
    }

    if (session.step === 'AWAITING_YEAR' && ctx.message.text) {
        const year = parseInt(ctx.message.text);
        if (isNaN(year) || year < 1900 || year > 2027) {
            return ctx.reply('⚠️ እባክዎ ትክክለኛ የምርት ዓመተ ምህረት በቁጥር ያስገቡ (ምሳሌ፦ 2022)፡');
        }

        session.year_built = year;
        session.step = 'AWAITING_TRANSMISSION';
        userSessions.set(ctx.from.id, session);

        const transMenu = new InlineKeyboard()
            .text('⚙️ Automatic', 'trans_auto')
            .text('🕹️ Manual', 'trans_manual');

        return ctx.reply('የማርሽ አይነት ይምረጡ / Select Transmission:', { reply_markup: transMenu });
    }

    if (session.step === 'AWAITING_MILEAGE' && ctx.message.text) {
        const mileage = parseInt(ctx.message.text.replace(/,/g, ''));
        if (isNaN(mileage)) {
            return ctx.reply('⚠️ እባክዎ ትክክለኛ የኪሎሜትር ቁጥር ያስገቡ (ምሳሌ፦ 45000)፡');
        }

        session.mileage = mileage;
        session.step = 'AWAITING_LOCATION';
        userSessions.set(ctx.from.id, session);
        return ctx.reply('እባክዎ የመኪናውን አድራሻ/ቦታ ያስገቡ (ምሳሌ፦ ቦሌ, አዲስ አበባ)፡');
    }

    // --- COMMON STEPS ---

    if (session.step === 'AWAITING_LOCATION' && ctx.message.text) {
        session.location = ctx.message.text;
        session.step = 'AWAITING_PHONE';
        userSessions.set(ctx.from.id, session);

        const phoneKeyboard = new Keyboard().requestContact('📱 Share Phone Number / ስልክ አጋራ').resized().oneTime();
        return ctx.reply('እባክዎ ስልክ ቁጥር ያስገቡ / Enter Phone Number:', { reply_markup: phoneKeyboard });
    }

    if (session.step === 'AWAITING_PHONE') {
        let phoneNumber = ctx.message.contact ? ctx.message.contact.phone_number : ctx.message.text;
        if (!phoneNumber) return ctx.reply('እባክዎ ስልክ ቁጥር ያስገቡ።');

        session.phoneNumber = phoneNumber;
        session.step = 'AWAITING_PHOTO';
        userSessions.set(ctx.from.id, session);

        const lang = await getUserLang(ctx.from.id);
        const mainMenu = new Keyboard()
            .text(i18n[lang].btn_search)
            .row()
            .text(i18n[lang].btn_add)
            .text(i18n[lang].btn_profile)
            .row()
            .text(i18n[lang].btn_lang)
            .resized();

        return ctx.reply('እባክዎ ፎቶ ይላኩ (ወይም "Skip" ብለው ይጻፉ) / Send Photo (or type "Skip"):', { reply_markup: mainMenu });
    }

    if (session.step === 'AWAITING_PHOTO') {
        let photoId = ctx.message.photo ? ctx.message.photo[ctx.message.photo.length - 1].file_id : null;
        if (!photoId && ctx.message.text && ctx.message.text.toLowerCase() !== 'skip') {
            return ctx.reply('እባክዎ ፎቶ ይላኩ ወይም "Skip" ብለው ይጻፉ።');
        }

        const username = ctx.from.username || null;

        try {
            await pool.execute(
                `INSERT INTO properties (
                    user_id, category, type, title, price, location, phone_number, owner_username, photo_id,
                    bedrooms, bathrooms, living_rooms, area_sqm, furnished_status,
                    make, model, year_built, transmission, fuel_type, mileage
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    ctx.from.id, session.category, session.type, session.title, session.price, session.location, session.phoneNumber, username, photoId,
                    session.bedrooms || null, session.bathrooms || null, session.living_rooms || null, session.area_sqm || null, session.furnished_status || null,
                    session.make || null, session.model || null, session.year_built || null, session.transmission || null, session.fuel_type || null, session.mileage || null
                ]
            );

            userSessions.delete(ctx.from.id);
            await ctx.reply('✅ ንብረቱ ከነ ሙሉ መረጃው በትክክል ተመዝግቧል! / Listing saved successfully!');

            // Post to Channel
            if (process.env.CHANNEL_USERNAME) {
                const typeText = session.type === 'sale' ? 'ለሽያጭ / For Sale' : 'ለኪራይ / For Rent';

                let channelPost = '';
                if (session.category === 'house') {
                    channelPost = `🏠 <b>አዲስ ቤት (${typeText})</b>\n\n` +
                        `<b>${session.title}</b>\n\n` +
                        `💰 <b>ዋጋ:</b> ${Number(session.price).toLocaleString()} ETB\n` +
                        `📍 <b>ቦታ:</b> ${session.location}\n` +
                        `🛏️ <b>መኝታ:</b> ${session.bedrooms || 'N/A'} | 🚽 <b>መጸዳጃ:</b> ${session.bathrooms || 'N/A'} | 🛋️ <b>ሳሎን:</b> ${session.living_rooms || 'N/A'}\n` +
                        `📐 <b>ስፋት:</b> ${session.area_sqm ? session.area_sqm + ' m²' : 'N/A'} | 🏠 <b>ዕቃ:</b> ${session.furnished_status || 'N/A'}\n` +
                        `📞 <b>ስልክ:</b> ${session.phoneNumber}\n` +
                        (username ? `💬 <b>Telegram:</b> @${username}\n\n` : '\n') +
                        `🤖 <b>Bot:</b> @${bot.botInfo ? bot.botInfo.username : 'ethio_realestate_car_bot'}`;
                } else {
                    channelPost = `🚗 <b>አዲስ መኪና (${typeText})</b>\n\n` +
                        `<b>${session.title}</b>\n\n` +
                        `💰 <b>ዋጋ:</b> ${Number(session.price).toLocaleString()} ETB\n` +
                        `📍 <b>ቦታ:</b> ${session.location}\n` +
                        `🚘 <b>መኪና:</b> ${session.make || ''} ${session.model || ''} (${session.year_built || ''})\n` +
                        `⚙️ <b>ማርሽ:</b> ${session.transmission || 'N/A'} | ⛽ <b>ነዳጅ:</b> ${session.fuel_type || 'N/A'}\n` +
                        `🛣️ <b>ኪሎሜትር:</b> ${session.mileage ? Number(session.mileage).toLocaleString() + ' KM' : 'N/A'}\n` +
                        `📞 <b>ስልክ:</b> ${session.phoneNumber}\n` +
                        (username ? `💬 <b>Telegram:</b> @${username}\n\n` : '\n') +
                        `🤖 <b>Bot:</b> @${bot.botInfo ? bot.botInfo.username : 'ethio_realestate_car_bot'}`;
                }

                if (photoId) {
                    await bot.api.sendPhoto(process.env.CHANNEL_USERNAME, photoId, { caption: channelPost, parse_mode: 'HTML' });
                } else {
                    await bot.api.sendMessage(process.env.CHANNEL_USERNAME, channelPost, { parse_mode: 'HTML' });
                }
            }
        } catch (error) {
            console.error('Error saving property:', error);
            await ctx.reply('❌ ንብረቱን ለመመዝገብ ሲሞከር ስህተት ተፈጥሯል።');
        }
        return;
    }

    return next();
});

// ==================== BOT START ====================
bot.start({
    onStart: (botInfo) => console.log(`🚀 Broker Bot @${botInfo.username} running...`)
});