const Discord = require('discord.js');
const auth = require('./dev-auth.json');
const fetch = require('node-fetch');

const client = new Discord.Client();
const prefix = '!';
const dateDisplayOptions = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric'};

const MATCH_COMMAND = 'match';
const STANDINGS_COMMAND = 'standings';

const matchMappings = {αx: 5589, ax: 5589, ris3n: 5594, ash3s: 5599, gru: 5604, nwas: 5608, fxb: 5611, pigpan: 5614, cryptc: 5617};

client.once('ready', () => {
    console.log('Ready!');
});

client.on('message', channelInput => {
    if (!channelInput.content.startsWith(prefix) || channelInput.author.bot) return;
    processChannelInput(channelInput); 
});

async function processChannelInput(channelInput){
    const returnedBotMessage = await botResponse(channelInput.content);

    channelInput.channel.send(returnedBotMessage);
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
    var matchID;
    if(isGeneralMatchCommand(options)){
        matchID = options[0];
    }else if(isTeamSpecificMatchCommand(options)){
        let teamCode = options[1].toLowerCase();
        matchID = matchMappings[teamCode];
    }else{
        return 'You need to supply a valid match number or team name with the keyword "vs".';
    }
    return matchMessage(matchID);
}

function isGeneralMatchCommand(options){
    return options.length === 1 && isNumber(options[0]);
}

function isTeamSpecificMatchCommand(options){
    return options.length === 2 && options[0] == "vs" && options[1] in matchMappings;
}

async function matchMessage(matchID){
    var data = await fetchMatch(matchID);
    if (data.error) {
        return `No results found for match ${matchID}.`;
    }
    return displayMatchStats(data);
}

async function fetchMatch(matchID){
    return await fetch("https://alpha.tl/api?match=" + matchID).then(response => response.json());
}

async function standingsCommandResponse(){
    var data = await fetchStandings();
    if (data.error) {
        return data.error;
    }
    return displayStandings(data);
}

async function fetchStandings(){
    return await fetch("https://alpha.tl/api?tournament=50").then(response => response.json());
}

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

function isNumber(number){
    return !isNaN(number);
}

module.exports = { matchResult: playerMatchResult };
client.login(auth.token || process.env.BOT_TOKEN);