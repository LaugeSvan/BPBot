require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const token = process.env.BOT_TOKEN;

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Keyword to match in role names
const keyword = "klasse";

// Konfiguration af roller
// Triggers: De navne rollerne skal indeholde
// targetId: ID'et på den overordnede rolle (Udskoling, Mellemtrin, Indskoling)
const roleMappings = [
    { 
        targetId: "1440977010095689778", // Udskolingen
        triggers: ["9. klasse", "8. klasse", "7. klasse"] 
    },
    { 
        targetId: "1440977085387640875", // Mellemtrinnet
        triggers: ["6. klasse", "5. klasse", "4. klasse"] 
    },
    { 
        targetId: "1440977142908321823", // Indskolingen
        triggers: ["3. klasse", "2. klasse", "1. klasse", "0. klasse"] 
    }
];

async function updateRoles(guild, roleMessage) {
    // Henter alle medlemmer for at sikre, cachen er opdateret
    await guild.members.fetch();

    // --- DEL 1: SYNKRONISERING AF ROLLER (TILDEL / FJERN) ---
    // Vi gennemgår alle medlemmer for at tjekke, om deres roller stemmer overens
    guild.members.cache.forEach(member => {
        roleMappings.forEach(mapping => {
            // Har brugeren en af "klasse" rollerne, der hører til denne gruppe?
            const hasClassRole = member.roles.cache.some(r => 
                mapping.triggers.some(trigger => r.name.toLowerCase().includes(trigger.toLowerCase()))
            );

            // Har brugeren allerede target-rollen (f.eks. Udskolingen)?
            const hasTargetRole = member.roles.cache.has(mapping.targetId);

            if (hasClassRole && !hasTargetRole) {
                // 1. Brugeren har en klasse, men mangler fælles-rollen -> TILDEL
                member.roles.add(mapping.targetId)
                    .catch(err => console.error(`Fejl ved tildeling til ${member.user.tag}:`, err));
            } 
            else if (!hasClassRole && hasTargetRole) {
                // 2. Brugeren har IKKE længere en klasse, men har stadig fælles-rollen -> FJERN
                member.roles.remove(mapping.targetId)
                    .catch(err => console.error(`Fejl ved fjernelse fra ${member.user.tag}:`, err));
            }
        });
    });

    // --- DEL 2: OPDATERING AF EMBED ---
    const rolesWithKeyword = guild.roles.cache.filter(role => 
        role.name.toLowerCase().includes(keyword.toLowerCase()) &&
        role.members.size > 0
    );

    const embed = new EmbedBuilder()
        .setTitle(`Alle i 0.- 9. ${keyword}`)
        .setColor(0x00FF00)
        .setTimestamp();

    // Sorter rollerne alfabetisk eller efter navn (valgfrit, her tager vi dem bare som de kommer)
    const sortedRoles = [...rolesWithKeyword.values()].sort((a, b) => b.name.localeCompare(a.name));

    for (const role of sortedRoles) {
        const membersWithRole = role.members.map(member => `<@${member.id}>`);
        let memberList = membersWithRole.join(", ");
        
        if (memberList.length > 1024) memberList = memberList.slice(0, 1021) + "...";

        embed.addFields({
            name: role.name,
            value: memberList
        });
    }

    if (embed.data.fields && embed.data.fields.length === 0) {
        embed.setDescription("Ingen medlemmer fundet i disse klasser.");
    }

    // Limit to 25 fields (Discord begrænsning)
    if (embed.data.fields && embed.data.fields.length > 25) {
        embed.data.fields = embed.data.fields.slice(0, 25);
        embed.setFooter({ text: 'Der er flere roller end der kan vises (max 25).' });
    }

    await roleMessage.edit({ 
        embeds: [embed],
        allowedMentions: { parse: ['users'] }
    });
}

client.once('ready', async () => {
    console.log(`Logged ind som ${client.user.tag}`);

    const guild = client.guilds.cache.get('1417409908495749132'); 
    if (!guild) return console.log('Kunne ikke finde serveren (Guild ID forkert?)');

    const roleChannel = guild.channels.cache.get('1418893819667157063'); 
    if (!roleChannel) return console.log('Kunne ikke finde kanalen (Channel ID forkert?)');

    const recentMessages = await roleChannel.messages.fetch({ limit: 10 });
    let roleMessage = recentMessages.find(msg => msg.author.id === client.user.id);

    if (!roleMessage) {
        const loadingEmbed = new EmbedBuilder()
            .setTitle(`Oversigt over ${keyword}`)
            .setColor(0x00FF00)
            .setDescription("Indlæser data...");

        roleMessage = await roleChannel.send({ embeds: [loadingEmbed] });
    }

    // Kør med det samme og derefter hvert minut
    updateRoles(guild, roleMessage);
    setInterval(() => updateRoles(guild, roleMessage), 60 * 1000);
});

client.login(token);