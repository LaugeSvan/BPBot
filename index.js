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

async function updateRoles(guild, roleMessage) {
    await guild.members.fetch();

    const rolesWithKeyword = guild.roles.cache.filter(role => 
        role.name.toLowerCase().includes(keyword.toLowerCase()) &&
        role.members.size > 0
    );

    const embed = new EmbedBuilder()
        .setTitle(`Alle i 0.- 9. ${keyword}`)
        .setColor(0x00FF00)
        .setTimestamp();

    rolesWithKeyword.forEach(role => {
        const membersWithRole = role.members.map(member => `<@${member.id}>`);
        let memberList = membersWithRole.join(", ");
        if (memberList.length > 1024) memberList = memberList.slice(0, 1021) + "...";

        embed.addFields({
            name: role.name,
            value: memberList
        });
    });

    if (embed.data.fields.length === 0) {
        embed.setDescription("rolesWithMembers.404");
    }

    // Limit to 25 fields
    if (embed.data.fields.length > 25) {
        embed.data.fields = embed.data.fields.slice(0, 25);
        embed.setFooter({ text: 'roleAmountExceeded.403' });
    }

    await roleMessage.edit({ 
        embeds: [embed],
        allowedMentions: { parse: ['users'] }
    });
}

// Updated event name for v15
client.once('clientReady', async () => {
    console.log(`logIn.${client.user.tag}.success`);

    const guild = client.guilds.cache.get('1417409908495749132'); // your server ID
    if (!guild) return console.log('guild.404');

    const roleChannel = guild.channels.cache.get('1418893819667157063'); // your channel ID
    if (!roleChannel) return console.log('roleChannel.404');

    const recentMessages = await roleChannel.messages.fetch({ limit: 10 });
    let roleMessage = recentMessages.find(msg => msg.author.id === client.user.id);

    if (!roleMessage) {
        const loadingEmbed = new EmbedBuilder()
            .setTitle(`rolesMatching.${keyword}`)
            .setColor(0x00FF00)
            .setDescription("loadRolesMembers...");

        roleMessage = await roleChannel.send({ embeds: [loadingEmbed] });
    }

    // Update immediately and every minute
    updateRoles(guild, roleMessage);
    setInterval(() => updateRoles(guild, roleMessage), 60 * 1000);
});

client.login(token);