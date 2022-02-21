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
        echo "table " . $table . "<br />";
        echo "player " . $player . "<br />";
        echo "score " . $score . "<br />";
        echo "version " . $version . "<br />";
        
        // intert or update score
        $sql = "SELECT * FROM " . $table . " WHERE player = " . $player;
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
            echo "score added";
        } else {
            echo "error while store <br />";
        }
    } else {
        // retrieve score

        //online score
        if (strcasecmp($table, "lb_online") == 0) {
            $getOnlineScore = true;
        }

        if ($getOnlineScore == true) {
            $sql = "SELECT * FROM online_score ORDER BY kills DESC";
        } else {
            $sql = "SELECT * FROM " . $table . " ORDER BY score DESC";
        }
        $result = $conn->query($sql);

        if ($conn->query($sql)===FALSE) {
            echo "error while get <br />";
            return;
        }
        
        $result_length = $result->num_rows;
        if ($result_length > 0) {
            // echo "table " . $table . "<br />";
            // echo "player " . $player . "<br />";
            
            for($i = 0; $i < $result_length; $i++) {
                $result->data_seek($i);
                $row = $result->fetch_array(MYSQLI_ASSOC);
                if($row["player"] == $player) {
                    if ($i > 0) {
                        $prev = $i - 1;
                        $result->data_seek($prev);
                        $row = $result->fetch_array(MYSQLI_ASSOC);
                        if ($getOnlineScore == true) {
                            echo "# " . ($prev + 1) . ": " . $row["kills"] . ", " . $row["nick"] . "<br />";
                        } else {
                            echo "# " . ($prev + 1) . ": " . $row["score"] . "<br />";
                        }
                    }

                    $result->data_seek($i);
                    $row = $result->fetch_array(MYSQLI_ASSOC);
                    if ($getOnlineScore == true) {
                        echo "<span class=\"you\"># " . ($i + 1) . ": " . $row["kills"] . ", " . $row["nick"] . "</span><br />";
                    } else {
                        echo "<span class=\"you\"># " . ($i + 1) . ": " . $row["score"] . "</span><br />";
                    }
                    if ($i < $result_length - 1) {
                        $next = $i + 1;
                        $result->data_seek($next);
                        $row = $result->fetch_array(MYSQLI_ASSOC);
                        if ($getOnlineScore == true) {
                            echo "# " . ($next + 1) . ": " . $row["kills"] . ", " . $row["nick"];
                        } else {
                            echo "# " . ($next + 1) . ": " . $row["score"];
                        }
                    }
                    return;
                }
            }
            echo "no score found";
        } else {
            echo "no score found";
        }
        $result->free();
    }

    $conn->close();
} else {
    echo "wrong origin";
}

?>