(function (app) {

    var lb_message;
    var xhttp;
    var request = 0;

    function openConnection(stageIndex, stage) {
        xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            // console.log('xhttp', this.readyState, this.status);
            if (this.readyState == 4) {
                if (this.status == 200) {
                    if (stage) { // get
                        let tag = document.getElementById(stage);
                        var response_object = JSON.parse(this.responseText);
                        // console.log(response_object)
                        if (response_object) {
                            if (response_object.score == "error") {
                                tag.innerHTML = response_object.message;
                            } else if (response_object.score == "lb_online") {
                                // check leadership
                                let leader = 0;
                                if (response_object.rank == 1) {
                                    leader = 1;
                                }
                                if (leader != app.playerObject.mpLeader) {
                                    // leadership changed
                                    app.playerObject.mpLeader = leader;
                                    app.file_read(true);
                                }

                                var result_table = "<table>";
                                if (response_object.p2 != undefined) {
                                    result_table +=
                                        `<tr>
                                            <td># ` + (response_object.rank - 2) + `</td>
                                            <td>` + response_object.p2 + `</td>
                                            <td>` + response_object.p2Nick + `</td>
                                        </tr>`
                                }
                                if (response_object.p1 != undefined) {
                                    result_table +=
                                        `<tr>
                                            <td># ` + (response_object.rank - 1) + `</td>
                                            <td>` + response_object.p1 + `</td>
                                            <td>` + response_object.p1Nick + `</td>
                                        </tr>`
                                }
                                result_table +=
                                    `<tr class="you">
                                        <td># ` + response_object.rank + `</td>
                                        <td>` + response_object.you + `</td>
                                        <td>` + response_object.yourNick + `</td>
                                    </tr>`
                                if (response_object.n1 != undefined) {
                                    result_table +=
                                        `<tr>
                                            <td># ` + (response_object.rank + 1) + `</td>
                                            <td>` + response_object.n1 + `</td>
                                            <td>` + response_object.n1Nick + `</td>
                                        </tr>`
                                }
                                if (response_object.n2 != undefined) {
                                    result_table +=
                                        `<tr>
                                            <td># ` + (response_object.rank + 2) + `</td>
                                            <td>` + response_object.n2 + `</td>
                                            <td>` + response_object.n2Nick + `</td>
                                        </tr>`
                                }
                                result_table += "</table>";
                                tag.innerHTML = result_table;
                            } else {
                                var result_table = "<table>";
                                if (response_object.p2) {
                                    result_table +=
                                        `<tr>
                                            <td># ` + (response_object.rank - 2) + `</td>
                                            <td>` + response_object.p2 + `</td>
                                        </tr>`
                                }
                                if (response_object.p1) {
                                    result_table +=
                                        `<tr>
                                            <td># ` + (response_object.rank - 1) + `</td>
                                            <td>` + response_object.p1 + `</td>
                                        </tr>`
                                }
                                result_table +=
                                    `<tr class="you">
                                        <td># ` + response_object.rank + `</td>
                                        <td>` + response_object.you + `</td>
                                    </tr>`
                                if (response_object.n1) {
                                    result_table +=
                                        `<tr>
                                            <td># ` + (response_object.rank + 1) + `</td>
                                            <td>` + response_object.n1 + `</td>
                                        </tr>`
                                }
                                if (response_object.n2) {
                                    result_table +=
                                        `<tr>
                                            <td># ` + (response_object.rank + 2) + `</td>
                                            <td>` + response_object.n2 + `</td>
                                        </tr>`
                                }
                                result_table += "</table>";
                                tag.innerHTML = result_table;
                            }
                        }
                    } else { // store
                        lb_message.className = '';
                        lb_message.innerHTML = "all scores updated";
                        // refresh
                        get(stageIndex);
                    }
                } else {
                    lb_message.className = 'error';
                    lb_message.innerHTML = "can't reach server: " + this.status;
                }
            }
        };
        xhttp.open("POST", "http://[DOMAIN]/score_json.php", true);
    }

    function store(stageIndex, score) {
        // console.log('store score in db', stageIndex, score);
        var stage = null;
        switch (stageIndex) {
            case 0:
                stage = "lb_grasslands";
                break;
            case 1:
                stage = "lb_lava";
                break;
            case 2:
                stage = "lb_desert";
                break;
            case 3:
                stage = "lb_space";
                break;
        }
        openConnection(stageIndex);
        request = 0;

        if (app.playerID == null) return;

        score = app.playerID - score;

        var myFormData = new FormData();
        myFormData.append("table", stage);
        myFormData.append("player", app.playerID);
        myFormData.append("score", score);
        myFormData.append("version", parseInt(app.version));
        myFormData.append("request", request);

        xhttp.send(myFormData);
    }

    document.addEventListener("DOMContentLoaded", function () {
        lb_message = document.getElementById("lb_message");
    });

    function get(stageIndex) {
        // console.log('get score from db', stageIndex, app.playerID);
        var stage = null;
        switch (stageIndex) {
            case 0:
                stage = "lb_grasslands";
                break;
            case 1:
                stage = "lb_lava";
                break;
            case 2:
                stage = "lb_desert";
                break;
            case 3:
                stage = "lb_space";
                break;
            case 4:
                stage = "lb_online";
                break;
        }
        openConnection(stageIndex, stage);
        request = 1;

        var levelID = localStorage.getItem("levelID");
        if (levelID == null) {
            localStorage.setItem('levelID', app.start_levelID);
        }

        // fix broken levelID of 1.3.2
        var app_version = parseInt(localStorage.getItem('version') || 0);
        if (levelID == "2432837" && app_version <= 10302) {
            let currentHash = app.hashCode(localStorage.getItem('levelScores') || '0');
            localStorage.setItem('levelID', currentHash);
        }

        var myFormData = new FormData();
        myFormData.append("table", stage);
        myFormData.append("player", app.playerID);
        myFormData.append("request", request);
        myFormData.append("version", app.version);

        xhttp.send(myFormData);
    }

    app.lb_get = function () {
        lb_message.className = '';
        lb_message.innerHTML = '';
        let storedVersion = localStorage.getItem('version');
        if (parseInt(storedVersion) < 10100) {
            lb_message.className = 'error';
            lb_message.innerHTML = "save game too old!<br/> please reset the game</div>";
            return;
        }
        for (let i = 0; i < 5; i++) {
            get(i);
        }
    }

    app.upload_lb_score = function () {
        let storedVersion = localStorage.getItem('version');
        if (parseInt(storedVersion) < 10100) return;

        let currentHash = app.hashCode(localStorage.getItem('levelScores') || '0');
        let storedHash = localStorage.getItem('levelID') || '0';
        storedHash = parseInt(storedHash);
        // console.log(currentHash, storedHash);
        if (currentHash != storedHash) {
            localStorage.setItem('levelID', '2432837');
            lb_message.className = 'error';
            lb_message.innerHTML = "can't upload score";
            return;
        }

        // upload all stages
        if (app.totalScore == 0 && app.playerObject.killScore == 0) {
            lb_message.className = 'error';
            lb_message.innerHTML = "your current score is 0";
            return;
        }

        for (let i = 0; i < 4; i++) {
            var range = app.get_levelRange(i);
            var stageScore = 0;
            for (let i = range[0]; i <= range[1]; i++) {
                stageScore += app.levelScores[i];
            }
            if (stageScore > 0) store(i, stageScore);
        }

        // update online score
        get(4);
    }

    return app;
}(MODULE));