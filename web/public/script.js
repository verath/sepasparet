const PA_SPARET_UPDATE = (function () {
    'use strict';

    const PA_SPARET_PROXY_URL = "https://pa-sparet-proxy.fly.dev/";

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

        const minEpisode = data["episode_scores"].reduce((min, e) => Math.min(min, e.episode), 1000);
        const maxEpisode = data["episode_scores"].reduce((max, e) => Math.max(max, e.episode), 0);
        const episodes = [];
        for (let i = minEpisode; i <= maxEpisode; i++) {
            episodes.push(i);
        }
        const numEpisodes = episodes.length;

        // "userId" => [scoreEp1, scoreEp2, ...]
        let userScores = new Map(
            Array.from(users.keys()).map(userId =>
                [userId, Array(numEpisodes).fill(null)]
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
            return vs.reduce((acc, v) => {
                v = (v == null) ? 0 : v;
                return acc + v
            }, 0);
        }

        // Filter users with 0 total score.
        userScores = new Map([...userScores].filter(([_, scores]) => sum(scores) > 0));

        // Sort by highest total score.
        userScores = new Map([...userScores].sort((a, b) => sum(b[1]) - sum(a[1])));

        const maxUserScore = sum(userScores.values().next().value);

        let playerScoreContainerElem = document.getElementById('player-score-container');
        playerScoreContainerElem.innerHTML = "";
        let plotData = [];
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
            // <div class="player-score">
            let playerScoreElem = document.createElement("div");
            playerScoreElem.classList.add("player-score");
            //  <img class="profile-image">
            let profileImageElem = document.createElement("img");
            profileImageElem.classList.add("profile-image");
            profileImageElem.src = user.profile.imageUrl;
            profileImageElem.referrerPolicy = 'no-referrer'
            playerScoreElem.appendChild(profileImageElem);
            //  <h2 class="profile-name">
            let profileNameElem = document.createElement("h2");
            profileNameElem.classList.add("profile-name")
            profileNameElem.innerText = displayName;
            playerScoreElem.appendChild(profileNameElem);
            //  <p class="profile-user-score">
            let profileUserScoreElem = document.createElement("p");
            profileUserScoreElem.classList.add("profile-user-score")
            profileUserScoreElem.innerText = totalScore;
            playerScoreElem.appendChild(profileUserScoreElem);

            playerScoreContainerElem.appendChild(playerScoreElem);
            requestAnimationFrame(() => {
                playerScoreElem.style.backgroundColor = user.profile.color;
                playerScoreElem.style.borderColor = user.profile.color;
                playerScoreElem.style.color = fontColor;
                playerScoreElem.style.width = `${percentageMaxScore}%`;
            });
        }

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
            },
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
        return fetch(PA_SPARET_PROXY_URL, {mode: 'cors', referrerPolicy: 'no-referrer'})
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
(function () {
    let graphShown = false;
    const toggleBtn = document.getElementById('btn-toggle-graph');
    const graphContainer = document.getElementById('graph-container');

    toggleBtn.innerText = "Show Episode Graph";
    toggleBtn.addEventListener('click', function () {
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

