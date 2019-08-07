const Discord = require('discord.js');
const developerAuth = require('./dev-auth.json');
const fetch = require('node-fetch');

const client = new Discord.Client();
const prefix = '!';
const developerPrefix = '*';

const reactionChannelID = developerAuth.reaction_channel_id || process.env.REACTION_CHANNEL_ID;

const MATCH_COMMAND = 'match';
const STANDINGS_COMMAND = 'standings';

const matchMappings = {αx: 5589, ax: 5589, ris3n: 5594, ash3s: 5599, gru: 5604, nwas: 5608, fxb: 5611, pigpan: 5614, cryptc: 5617};

client.once('ready', () => {
    console.log('Ready!');
});

client.on('message', channelInput => {
    processChannelInput(channelInput);
});

client.on('messageReactionAdd', (reaction, user) => {
    let botMember = reaction.message.member;
    let userMember = botMember.guild.members.find(member => member.user === user);
    let emojiName = reaction._emoji.name;
    userMember.addRole(userMember.guild.roles.find(role => role.name === emojiName));
});
 
client.on('messageReactionRemove', (reaction, user) => {
    let botMember = reaction.message.member;
    let userMember = botMember.guild.members.find(member => member.user === user);
    let emojiName = reaction._emoji.name;
    userMember.removeRole(userMember.guild.roles.find(role => role.name === emojiName));
});

// Credit to https://github.com/AnIdiotsGuide/discordjs-bot-guide/blob/master/coding-guides/raw-events.md
client.on('raw', packet => {
    if (!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)) return;
    const channel = client.channels.get(packet.d.channel_id);
    if (channel.messages.has(packet.d.message_id) || channel.id !== reactionChannelID) return;
    channel.fetchMessage(packet.d.message_id).then(message => {
        const emoji = packet.d.emoji.id ? `${packet.d.emoji.name}:${packet.d.emoji.id}` : packet.d.emoji.name;
        const reaction = message.reactions.get(emoji);

        if (reaction) reaction.users.set(packet.d.user_id, client.guilds.users.get(packet.d.user_id));
        if (packet.t === 'MESSAGE_REACTION_ADD') {
            client.emit('messageReactionAdd', reaction, client.users.get(packet.d.user_id));
        }
        if (packet.t === 'MESSAGE_REACTION_REMOVE') {
            client.emit('messageReactionRemove', reaction, client.users.get(packet.d.user_id));
        }
    });
});

async function processChannelInput(channelInput){
    if(nonBotRelatedUserMessage(channelInput, developerAuth.token)){ return;}
    if(channelInput.author.bot){
        setupRaceReactionsOnMessage(channelInput);
    }else if(channelInput.channel.id === reactionChannelID){
        setupReactionRoleMessages(channelInput);
    }else{
        const returnedBotMessage = await botResponse(channelInput.content);
        channelInput.channel.send(returnedBotMessage);
    }
}

function nonBotRelatedUserMessage(channelInput, token){
    if(token){
        return !channelInput.content.startsWith(developerPrefix);
    }else{
        return !channelInput.content.startsWith(prefix);
    }
}

function setupRaceReactionsOnMessage(channelInput){
    if(channelInput.content.startsWith('>>> **Select your Race**')){
        let guild = channelInput.channel.guild;
        channelInput.react(getRaceEmoji(guild, "Terran").id);
        channelInput.react(getRaceEmoji(guild, "Protoss").id);
        channelInput.react(getRaceEmoji(guild, "Zerg").id);
        channelInput.react(getRaceEmoji(guild, "Random").id);
    }
}

function setupReactionRoleMessages(channelInput){
    if(channelInput.content.startsWith('setup')){
        let guild = channelInput.channel.guild;
        channelInput.channel.send(reactionRoleMessage(guild)); 
    }
}

function reactionRoleMessage(guild){
    return ">>> **Select your Race**\n" + 
            displayRaceEmoji(guild, "Terran") + " Terran   " +
            displayRaceEmoji(guild, "Protoss") + " Protoss\n\n" +
            displayRaceEmoji(guild, "Zerg") + " Zerg       " +
            displayRaceEmoji(guild, "Random")  + " Random";
}

function displayRaceEmoji(guild, race){
    let emojiID = getRaceEmoji(guild, race).id;
    return `<:${race}:${emojiID}>`;
}

function getRaceEmoji(guild, race){
    return guild.emojis.find(emoji => emoji.name === race);
}

function botResponse(message){
    const messageArgumentList = parseMessage(message);
    const command = messageArgumentList.shift().toLowerCase();

    return retrieveBotResponse(command, messageArgumentList);
}

function parseMessage(message){
    return message.slice(prefix.length).split(/ +/);
}

function retrieveBotResponse(command, options){
    switch(command){
        case MATCH_COMMAND:
            return matchCommandResponse(options);
        case STANDINGS_COMMAND:
            return standingsCommandResponse();
        default:
            return 'Invalid command entered.';
    }
}

function matchCommandResponse(options){
    if(isGeneralMatchCommand(options)){
        let matchID = options[0];
        return matchMessage(matchID);
    }else if(isTeamSpecificMatchCommand(options)){
        let teamCode = options[1].toLowerCase();
        let matchID = matchMappings[teamCode];
        return matchMessage(matchID);
    }else{
        return 'You need to supply a valid match number or team name with the keyword "vs".';
    }
}

function isGeneralMatchCommand(options){
    return options.length === 1 && isNumber(options[0]);
}

function isTeamSpecificMatchCommand(options){
    return options.length === 2 && options[0] == "vs" && options[1] in matchMappings;
}

async function matchMessage(matchID){
    var data = await fetchMatchFromAPI(matchID);
    if (data.error) {
        return `No results found for match ${matchID}.`;
    }
    return displayMatchStats(data);
}

async function fetchMatchFromAPI(matchID){
    return await fetch("https://alpha.tl/api?match=" + matchID).then(response => response.json());
}

function displayMatchStats(matchData){
    if(matchIsUpcoming(matchData.lineup1)){
        return upcomingMatchDisplay(matchData);
    }else if(matchIsInProgress(matchData.games)){
        return inProgressMatchDisplay(matchData);
    }else{
        return pastMatchDisplay(matchData);
    }
}

function matchIsUpcoming(lineup){
    return lineup.length === 0;
}

function matchIsInProgress(games){
    return !games;
}

function upcomingMatchDisplay(matchData){
    return teamVersusTeamHeader(matchData.team1.name, matchData.team2.name) + 
            matchDateDisplay(matchData.datetime) + 
            displayMaps(matchData.maps) + 
            displayDivider() + 
            matchPageLink(matchData.matchid);
}

function inProgressMatchDisplay(matchData){
    return teamVersusTeamHeader(matchData.team1.name, matchData.team2.name) + 
            displayDivider() + 
            displayResultSection(matchData) + 
            matchPageLink(matchData.matchid);
}

function pastMatchDisplay(matchData){
    return teamVersusTeamHeader(matchData.team1.name, matchData.team2.name) +
            displayScore(matchData.score) + 
            displayDivider() + 
            displayResultSection(matchData) + 
            matchPageLink(matchData.matchid);
}

function teamVersusTeamHeader(team1, team2){
    return team1 + "   vs   " + team2 + "\n";
}

function matchDateDisplay(datetime){
    if(datetime !== null){
        return "This match is currently upcoming and scheduled for: " + convertTimeToDisplayFormat(datetime) + " ADT\n";
    }else{
        return "";
    }
}

function convertTimeToDisplayFormat(datetime){
    let dateDisplayOptions = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric'};
    let matchDateTime = new Date(datetime);
    matchDateTime.setHours(matchDateTime.getHours() + matchDateTime.getTimezoneOffset()/60 - 3)
    return matchDateTime.toLocaleString("en-US", dateDisplayOptions);
}

function displayMaps(maps){
    return "\nMatch Maps:\n   " + maps.join("\n   ");
}

function displayDivider(){
    return "\n------------------------------------------\n";
}

function matchPageLink(matchID){
    return "\nWebpage:\nhttps://alpha.tl/match/" + matchID;
}

function displayScore(score){
    return "Score: " + score;
}

function displayResultSection(matchData){
    return matchData.games.map((winner, gameNum) => {
        let player1 = matchData.lineup1[gameNum];
        let player2 = matchData.lineup2[gameNum];
        return displayMap(matchData.maps[gameNum]) + displayGameResult(winner, player1, player2);
    }).join("");
}

function displayMap(map){
    return "Map: " + map + "\n";
}

function displayGameResult(winner, player1, player2){
    let player1Team = 0;
    let player2Team = 1;
    return buildPlayerString(player1) + " " + playerGameResult(winner, player1Team) +  "   vs   " + playerGameResult(winner, player2Team) + " " + buildPlayerString(player2) + "\n\n";
}

function buildPlayerString(player){
    var mmr = player.bnetdata === null ? "Unknown" : findMain(player.bnetdata.primaryRace, player.bnetdata.soloLadders);
    return player.nickname + " " + "(" + mmr + ")" + player.race;
}

function findMain(race, ladders){
    for(var i=0;i<ladders.length;i++){
        if(race === ladders[i].race){
            return ladders[i].mmr.toString();
        }
    }
    return "Unknown";
}

function playerGameResult(winner, player){
    if(winner === player){
        return "Win";
    }else{
        return "Loss";
    }
}

async function standingsCommandResponse(){
    var data = await fetchStandingsFromAPI();
    if (data.error) {
        return data.error;
    }
    return displayStandings(data);
}

async function fetchStandingsFromAPI(){
    return await fetch("https://alpha.tl/api?tournament=50").then(response => response.json());
}

function displayStandings(standingData){
    let groupA = standingData.groups[0];
    let groupB = standingData.groups[1];
    return displayGroupStandings("A", groupA) + displayGroupStandings("B", groupB) + tournamentPageLink();
}

function tournamentPageLink(){
    return "Webpage:\nhttps://alpha.tl/americasamateur";
}

function displayGroupStandings(letter, group){
    return groupHeader(letter) + groupTeamRows(group) + "\n";
}

function groupHeader(letter){
    return "Group " + letter + "\n";
}

function groupTeamRows(group){
    return group.map((team, rank) => {
        return (rank+1).toString() + ". " + "MP: " + team.games + ", MS: " + team.wins + "-" + team.loses + ", SS: " + team.winsets + "-" + team.losesets + ", T: " + team.clan.tag + "\n";
    }).join("");
}

function isNumber(number){
    return !isNaN(number);
}

module.exports = { matchResult: playerGameResult };
client.login(developerAuth.token || process.env.BOT_TOKEN);