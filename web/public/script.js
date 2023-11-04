const PA_SPARET_UPDATE = (function () {
    'use strict';

    const PA_SPARET_PROXY_URL = "/data-2023-11-04.json";

    function plot(graphElem, data) {
        graphElem.innerHTML = "";

        // "userId" => User
        let users = new Map();
        for (const userData of data["users"]) {
            users.set(userData.user_id, {
                userId: userData.user_id,
                username: userData.username,
                firstName: userData.first_name,
                lastName: userData.last_name,
                profile: {
                    color: userData.profile.color,
                    imageUrl: userData.profile.image_url,
                }
            });
        }

        // Episodes with data. Assume no missing episodes => length is OK.
        const numEpisodes = data["episode_scores"].filter(e => e.scores.length > 0).length
        const episodes = [...Array(numEpisodes).keys()];

        // "userId" => [scoreEp1, scoreEp2, ...]
        let userScores = new Map(
            Array.from(users.keys()).map(userId => 
                [userId, Array(numEpisodes).fill(0)]
        ));
        for (const episodeScoreData of data["episode_scores"]) {
            const episodeIdx = episodeScoreData.episode - 1;
            for (const userScoreData of episodeScoreData.scores) {
                const userId = userScoreData.user_id;
                const score = userScoreData.score;
                let userScore = userScores.get(userId);
                userScore[episodeIdx] = score;
                userScores.set(userId, userScore);
            }
        }

        const sum = function sum(vs) {
            return vs.reduce((acc, v) => acc + v, 0)
        }
        
        // Filter users with 0 total score.
        userScores = new Map([...userScores].filter(([_, scores]) => sum(scores) > 0));

        // Sort by highest total score.
        userScores = new Map([...userScores].sort((a, b) => b[1] - a[1]));

        const maxUserScore = sum(userScores.values().next().value);

        let plotData = [];
        let scoreHTML = '';
        for (let [userId, episodeScores] of userScores) {
            let user = users.get(userId);
            let totalScore = sum(episodeScores);
            let displayName = `${user.firstName} ${user.lastName[0]}`;
            let percentageMaxScore = Math.floor((totalScore / maxUserScore) * 100);
            let fontColor = user.profile.color === "#424852" ? "#ddd" : "#222"
            plotData.push({
                x: episodes,
                y: episodeScores,
                type: 'line',
                // SPACES??? YES I DONT KNOW
                name: `${displayName} [${totalScore}]                      `,
            })
            scoreHTML += `
                <div class="player-score" style="background-color: ${user.profile.color}; border-color: ${user.profile.color}; color: ${fontColor}; width: ${percentageMaxScore}%;">
                    <img class="profile-image" src="${user.profile.imageUrl}" />
                    <h2 class="profile-name">${displayName}</h2>
                    <p class="profile-user-score">${totalScore}</p>
                </div>`
        }
        document.getElementById('player-score-container').innerHTML = scoreHTML;

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

// Toggle graph button.
(function() {
    let graphShown = false;
    const toggleBtn = document.getElementById('btn-toggle-graph');
    const graphContainer = document.getElementById('graph-container');

    toggleBtn.innerText = "Show Episode Graph";
    toggleBtn.addEventListener('click', function() {
        if (graphShown) {
            graphContainer.style.display = 'none';
            toggleBtn.innerText = "Show Episode Graph"
        } else {
            graphContainer.style.display = 'block';
            toggleBtn.innerText = "Hide Episode Graph"
            // Force plotly to redraw... 🙃.
            window.dispatchEvent(new Event('resize'));
        }
        graphShown = !graphShown;
    });
})();

