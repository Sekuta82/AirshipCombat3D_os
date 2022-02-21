<?php
$validOrigin = "app://airshipcombat3d_os";

// debug
header('Access-Control-Allow-Origin: *');
// production
// header('Access-Control-Allow-Origin: ' . $validOrigin);

$request = $_POST["request"];
$table = $_POST["table"];
$player = $_POST["player"];
$score = $_POST["score"];
$version = $_POST["version"];
$origin = $_SERVER['HTTP_ORIGIN'];

$getOnlineScore = false;

$servername = "localhost";
$username = "?";
$password = "?";
$dbname = "?";

// echo "o: " . $origin . "<br />";

if (strcasecmp($validOrigin, $origin) == 0) {
    // Create connection
    $conn = new mysqli($servername,$username,$password,$dbname);
    // Check connection
    if ($conn->connect_error) {
        die("Connection failed: ".$conn->connect_error);
    }
    
    if($request == 0) {
        // store score
        // decode score
        $score = $player - $score;
        
        // debug output
        // echo "table " . $table . "<br />";
        // echo "player " . $player . "<br />";
        // echo "score " . $score . "<br />";
        // echo "version " . $version . "<br />";
        
        // intert or update score
        $sql = "SELECT player FROM " . $table . " WHERE player = " . $player;
        $result = $conn->query($sql);

        if ($result->num_rows > 0) {
            // compare to previous score
            while($row = $result->fetch_assoc()) {
                if($row["score"] >= $score) {
                    return;
                }
            }
            $sql = "UPDATE " . $table . " SET score = " .$score . ", v = " . $version . " WHERE " . $table . ".player = " . $player; 
        } else {
            $sql = "INSERT INTO " . $table . " (player, score, v) VALUES (" . $player . ", " . $score . ", " . $version . ")";
        }
        
        if ($conn->query($sql)===TRUE) {
            // echo "{\"score\": \"error\", \"message\": \"score added\"}";
        } else {
            echo "{\"score\": \"error\", \"message\": \"error while store\"}";
        }
    } else {
        // retrieve score

        //online score
        if (strcasecmp($table, "lb_online") == 0) {
            $getOnlineScore = true;
        }

        // sort table
        if ($getOnlineScore == true) {
            $sql = "ALTER TABLE online_score ORDER BY kills DESC"; 
        } else {
            $sql = "ALTER TABLE " . $table . " ORDER BY score DESC"; 
        }
        if ($conn->query($sql)===FALSE) {
            echo "{\"score\": \"error\", \"message\": \"error while sorting\"}";
            return;
        }

        // get score
        if ($getOnlineScore == true) {
            $sql = "SELECT player, nick, kills FROM online_score";
        } else {
            $sql = "SELECT player, score FROM " . $table;
        }
        $result = $conn->query($sql);

        if ($conn->query($sql)===FALSE) {
            echo "{\"score\": \"error\", \"message\": \"error while get\"}";
            return;
        }
        
        $result_length = $result->num_rows;
        if ($result_length > 0) {
            
            for($i = 0; $i < $result_length; $i++) {
                $result->data_seek($i);
                $row = $result->fetch_array(MYSQLI_ASSOC);
                $response = "{\"score\": \"" . $table . "\"";
                if($row["player"] == $player) {
                    if ($i > 1) {
                        $prev = $i - 2;
                        $result->data_seek($prev);
                        $row = $result->fetch_array(MYSQLI_ASSOC);
                        if ($getOnlineScore == true) {
                            $response = $response . ", \"p2\": " . $row["kills"] . ", \"p2Nick\": \"" . $row["nick"] . "\"";
                        } else {
                            $response = $response . ", \"p2\": " . $row["score"];
                        }
                    }
                    if ($i > 0) {
                        $prev = $i - 1;
                        $result->data_seek($prev);
                        $row = $result->fetch_array(MYSQLI_ASSOC);
                        if ($getOnlineScore == true) {
                            $response = $response . ", \"p1\": " . $row["kills"] . ", \"p1Nick\": \"" . $row["nick"] . "\"";
                        } else {
                            $response = $response . ", \"p1\": " . $row["score"];
                        }
                    }

                    $result->data_seek($i);
                    $row = $result->fetch_array(MYSQLI_ASSOC);
                    if ($getOnlineScore == true) {
                        $response = $response . ", \"rank\": " . ($i + 1) . ", \"you\": " . $row["kills"] . ", \"yourNick\": \"" . $row["nick"] . "\"";
                    } else {
                        $response = $response . ", \"rank\": " . ($i + 1) . ", \"you\": " . $row["score"];
                    }
                    if ($i < $result_length - 1) {
                        $next = $i + 1;
                        $result->data_seek($next);
                        $row = $result->fetch_array(MYSQLI_ASSOC);
                        if ($getOnlineScore == true) {
                            $response = $response . ", \"n1\": " . $row["kills"] . ", \"n1Nick\": \"" . $row["nick"] . "\"";
                        } else {
                            $response = $response . ", \"n1\": " . $row["score"];
                        }
                    }
                    if ($i < $result_length - 2) {
                        $next = $i + 2;
                        $result->data_seek($next);
                        $row = $result->fetch_array(MYSQLI_ASSOC);
                        if ($getOnlineScore == true) {
                            $response = $response . ", \"n2\": " . $row["kills"] . ", \"n2Nick\": \"" . $row["nick"] . "\"";
                        } else {
                            $response = $response . ", \"n2\": " . $row["score"];
                        }
                    }
                    $response = $response . "}";
                    echo $response;
                    return;
                }
            }
            echo "{\"score\": \"error\", \"message\": \"no score found\"}";
        } else {
            echo "{\"score\": \"error\", \"message\": \"no score found\"}";
        }
        $result->free();
    }

    $conn->close();
} else {
    echo "{\"score\": \"error\", \"message\": \"wrong origin\"}";
}

?>