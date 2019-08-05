const Discord = require('discord.js');
const auth = require('./dev-auth.json');
const fetch = require('node-fetch');

const client = new Discord.Client();
const prefix = '!';

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

module.exports = { matchResult: playerGameResult };
client.login(auth.token || process.env.BOT_TOKEN);