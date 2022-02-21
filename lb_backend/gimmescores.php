<?php

$servername = "localhost";
$username = "?";
$password = "?";
$dbname = "?";

// Create connection
$conn = new mysqli($servername,$username,$password,$dbname);
// Check connection
if ($conn->connect_error) {
    die("Connection failed: ".$conn->connect_error);
    echo "Connection failed";
}

echo "<h1>AC3D Leaderboard</h1>";

function listScores($table) {
    global $conn;

    // retrieve score
    $sql = "SELECT * FROM " . $table . " ORDER BY score DESC";
    $result = $conn->query($sql);

    if ($conn->query($sql)===FALSE) {
        echo "error while get <br />";
        return;
    }

    $result_length = $result->num_rows;
    if ($result_length > 0) {
        echo "<table style=\"float:left; margin:10px\">";
        echo "<tr><th colspan=\"3\">" . $table . ": " . $result_length . "</th></tr>";
        for($i = 0; $i < $result_length; $i++) {
            $result->data_seek($i);
            $row = $result->fetch_array(MYSQLI_ASSOC);
            
            $result->data_seek($i);
            $row = $result->fetch_array(MYSQLI_ASSOC);
            echo "<tr><td><strong>" . $row["score"] . "</strong></td><td>" . $row["player"] . "</td><td>" . $row["v"] . "</td></tr>";

            // limit length
            if ($i == 50) {
                return;
            }
        }
        echo "</table>";
    } else {
        echo "no score found";
    }
}

listScores("lb_grasslands");
listScores("lb_lava");
listScores("lb_desert");
listScores("lb_space");

$result->free();
$conn->close();

?>