const PA_SPARET_UPDATE = (function () {
    'use strict';

    const PA_SPARET_PROXY_URL = "/data-2023-02-18.json";

    function plot(graphElem, data) {
        graphElem.innerHTML = "";
        // data.highscore
        // data.me_profile
        let me_profile = data.me_profile;
        let highscore = data.highscore;
        let meUserId = me_profile.userId;

        // userId => playerData
        let players = new Map();
        players.set(me_profile.userId, {
            firstName: me_profile.firstName,
            lastName: me_profile.lastName,
            userId: me_profile.userId,
            username: me_profile.username,
            profile: {
                color: me_profile.profile.color,
                imageUrl: me_profile.profile.imageUrl,
            }
        });

        for (let ep in highscore.highscores.byEpisode) {
            let episodeData = highscore.highscores.byEpisode[ep][0];
            episodeData.friends.forEach((playerData) => {
                players.set(playerData.userId, {
                    firstName: playerData.firstName,
                    lastName: playerData.lastName,
                    userId: playerData.userId,
                    username: playerData.username,
                    profile: {
                        color: playerData.profile.color,
                        imageUrl: playerData.profile.imageUrl,
                    }
                });
            })
        }
        let playerIds = [];
        players.forEach((_v, k) => playerIds.push(k));

        // "userId" => totalScore
        // For some reason this is not the same as the sum of all episode
        // scores for some players??
        let playerTotalScores = new Map(playerIds.map(pId => [pId, 0]));
        playerTotalScores.set(meUserId, highscore.highscores.forSeason[0].user.points);
        for (let i = 0; i < highscore.highscores.forSeason[0].friends.length; i++) {
            let friendData = highscore.highscores.forSeason[0].friends[i];
            playerTotalScores.set(friendData.userId, friendData.points);
        }
        const maxTotalPlayerScore = [...playerTotalScores].map(e => e[1]).sort((a, b) => b - a)[0];

        // "userId" => [scoreEp1, scoreEp2, ...]
        let playerScores = new Map(playerIds.map(pId => [pId, []]));
        let episodes = [];
        for (let ep in highscore.highscores.byEpisode) {
            let episodeData = highscore.highscores.byEpisode[ep][0];
            let meScore = episodeData.user.points || 0;
            let friendScores = episodeData.friends.map((friendData) =>
                [friendData.userId, friendData.points]
            );
            if (meScore == 0 && friendScores.length == 0) {
                continue; // This episode was not played by anyone.
            }
            episodes.push(ep);
            let episodeScores = [[meUserId, meScore]];
            episodeScores = episodeScores.concat(friendScores);
            // Add players that did not participate in this episode.
            let episodeUserIds = episodeScores.map(([id, _]) => id);
            let missingPlayerIds = playerIds.filter(pId => episodeUserIds.indexOf(pId) === -1);
            episodeScores = episodeScores.concat(missingPlayerIds.map(pId => [pId, NaN]));

            episodeScores.forEach(([id, score]) => {
                let s = playerScores.get(id) || [];
                s.push(score);
                playerScores.set(id, s);
            });
        }

        // Sort playerScores by highest total score
        playerScores = new Map([...playerScores].sort((a, b) => {
            let aTotalScore = playerTotalScores.get(a[0]) || 0;
            let bTotalScore = playerTotalScores.get(b[0]) || 0;
            return bTotalScore - aTotalScore;
        }));

        let plotData = [];
        let playerScoreHTML = '';
        for (let entry of playerScores) {
            let [userId, episodeScores] = entry;
            let player = players.get(userId);
            let totalScore = playerTotalScores.get(userId);
            let playerDisplayName = `${player.firstName} ${player.lastName[0]}`;
            let percentageMaxScore = Math.floor((totalScore / maxTotalPlayerScore) * 100);
            let playerFontColor = player.profile.color === "#424852" ? "#ddd" : "#222"
            plotData.push({
                x: episodes,
                y: episodeScores,
                type: 'line',
                // SPACES??? YES I DONT KNOW
                name: `${playerDisplayName} [${totalScore}]                      `,
            })
            playerScoreHTML += `
                <div class="player-score" style="background-color: ${player.profile.color}; border-color: ${player.profile.color}; color: ${playerFontColor}; width: ${percentageMaxScore}%;">
                    <img class="profile-image" src="${player.profile.imageUrl}" />
                    <h2 class="profile-name">${playerDisplayName}</h2>
                    <p class="profile-user-score">${totalScore}</p>
                </div>`
        }
        document.getElementById('player-score-container').innerHTML = playerScoreHTML;

        let layout = {
            autosize: true,
            plot_bgcolor: "#386767",
            paper_bgcolor: "#386767",
            font: {
                family: 'Roboto',
                color: '#DDB'
            },
            titlefont: {
                size: 18,
            },
            yaxis: {
                title: 'Score'
            },
            xaxis: {
                tickvals: episodes,
                ticktext: episodes.map(ep => `E${ep}`),
            }
        };

        let plot_options = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: [
                'toggleSpikelines',
                'zoom2d',
                'pan2d',
                'zoomIn2d',
                'zoomOut2d',
                'select2d',
                'lasso2d',
                'autoScale2d',
                'toImage']
        };
        Plotly.newPlot(graphElem, plotData, layout, plot_options);
    }

    function update(graphElem) {
        return fetch(PA_SPARET_PROXY_URL)
            .then(r => r.json())
            .then((data) => {
                plot(graphElem, data);
            })
            .catch(err => console.error("Error fetching på spåret", err));
    };
    return update;
})();


PA_SPARET_UPDATE(document.getElementById('graph-container'));
