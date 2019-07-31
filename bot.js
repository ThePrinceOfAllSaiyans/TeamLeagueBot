const Discord = require('discord.js');
const auth = require('./dev-auth.json');
const fetch = require('node-fetch');

const client = new Discord.Client();
const prefix = '!';

const dateDisplayOptions = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric'};

const matchMappings = {αx: 5589, ax: 5589, ris3n: 5594, ash3s: 5599, gru: 5604, nwas: 5608, fxb: 5611, pigpan: 5614, cryptc: 5617};

client.once('ready', () => {
    console.log('Ready!');
});

client.on('message', async message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'match') {
        if (!args.length) {
            return message.channel.send('You need to supply a search match number or the keyword "vs".');
        }

        var matchID = args[0] == "vs" ? matchMappings[args[1].toLowerCase()] : args[0]

        var data = await fetch("https://alpha.tl/api?match=" + matchID).then(response => response.json());

        if (data.error) {
            return message.channel.send(`No results found for match **${args.join(' ')}**.`);
        }
        
        message.channel.send(displayMatchStats(data));
    }

    if (command === 'standings') {
        var data = await fetch("https://alpha.tl/api?tournament=50").then(response => response.json());

        if (data.error) {
            return message.channel.send(data.error);
        }
        
        message.channel.send(displayStandings(data));
    } 
});

function displayMatchStats(matchData){
    var breakDown = matchData.team1.name + "   vs   " + matchData.team2.name + "\n";
    if(matchData.lineup1 == []){
        if(matchData.datetime !== null){
            var matchDateTime = new Date(matchData.datetime);
            matchDateTime.setHours(matchDateTime.getHours() + matchDateTime.getTimezoneOffset()/60 - 3)
            breakDown += "This match is currently upcoming and scheduled for: " + matchDateTime.toLocaleString("en-US", dateDisplayOptions) + " ADT\n\nMatch Maps:";
            for(var i=0;i<matchData.maps.length;i++){
                breakDown += "\n   " + matchData.maps[i];
            }
        }
        breakDown += "\n------------------------------------------\n";
    }else{
        breakDown += "Score: " + matchData.score + "\n------------------------------------------\n";
        var listLength = matchData.games ? matchData.games.length : 4;
        for(var i=0;i<listLength;i++){
            breakDown += "Map: " + matchData.maps[i] + "\n"
            breakDown += buildPlayerString(matchData.lineup1[i]) + " " + playerMatchResult(1, i, matchData.games) +  "   vs   " + playerMatchResult(2, i, matchData.games) + " " + buildPlayerString(matchData.lineup2[i]) + "\n\n";
        }
    }
    breakDown += "\nWebpage:\nhttps://alpha.tl/match/" + matchData.matchid;
    return breakDown;
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

function playerMatchResult(playerTeam, game, games){
    if(!games){
        return '';
    }
    if(playerTeam == games[game]){
        return "Win";
    }else{
        return "Loss";
    }
}

function displayStandings(standingData){
    var groupLetters = ['A', 'B'];
    var standingString = "";
    for(var i=0;i<standingData.groups.length;i++){
        standingString += displayGroupStandings(standingData.groups[i], groupLetters[i]) + "\n"
    }
    standingString += "Webpage:\n"
    return standingString + "https://alpha.tl/americasamateur";
}

function displayGroupStandings(group, letter){
    var groupString = "Group " + letter + "\n"
    var currentGroup;
    for(var i=0;i<group.length;i++){
        currentTeam = group[i];
        groupString += (i+1).toString() + ". " + "MP: " + currentTeam.games + ", MS: " + currentTeam.wins + "-" + currentTeam.loses + ", SS: " + currentTeam.winsets + "-" + currentTeam.losesets + ", T: " + currentTeam.clan.tag + "\n";
    }
    return groupString;
}

client.login(auth.token || process.env.BOT_TOKEN);