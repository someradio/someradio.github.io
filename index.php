<?php

function file_post_contents($url, $postdata) {
	$options = array('http' =>
        array(
            'method'  => 'POST',
            'header'  => 'Content-type: application/json',
            'content' => json_encode($postdata)
        )
    );
    $context = stream_context_create($options);
	$response = @file_get_contents($url, false, $context);
	return json_decode($response, true);
}

$title = "Valse Player - Best Music Visualizer";
$description = "View dance videos in sync with the tempo of the music. Listen in real time. Create your own AMV clips for any song. Supports all devices.";
$keywords = "music, video, visualizer, audio, visual, 3d, live, real, time, realtime, anime, dance, visual effect, family friendly, entertainment";
$url = "https://web.valse.me/";
$image = "https://web.valse.me/logo512.png";


if (isset($_GET['tid'])) {
	$tid = $_GET['tid'];
	$tid = preg_replace('/^t1-(\d+)-(\d+)$/','yandex-track-$1-$2', $tid);
	$tid = preg_replace('/^t2-(\d+)-(\d+)$/','deezer-track-$1-$2', $tid);
	$tid = preg_replace('/^t4-(\d+)-(\d+)$/','shared-track-$1-$2', $tid);
	$postdata = array('where' => array('id' => $tid), 'limit' => 1);
	$data = file_post_contents('https://web.valse.me/api/v1/tracks/find', $postdata);
	// var_dump($data);

	if ($data["success"] == true && count($data["items"])) {
		$track = $data["items"][0];
		// print_r($track);

		$title = $track["artist_title"] . ' - ' . $track["title"];
		if ($track["version"] != "") {
			$title .= ' (' . $track["version"] . ')';
		}

		$description = 'Listen to ' . $track["title"] . '. Song by ' . $track["artist_title"] . '. ' . $description;
		$keywords = $track["title"] . ', ' . $track["artist_title"] . ', ' . $keywords;
		$image = "https://web.valse.me/api/v1/music" . $track["root_path"] . $track["cover_path"];
	}
}

$content = file_get_contents("template.html");

$content = str_replace('VALSE_PLAYER_TITLE', htmlspecialchars($title), $content);
$content = str_replace('VALSE_PLAYER_DESCRIPTION', htmlspecialchars($description), $content);
$content = str_replace('VALSE_PLAYER_KEYWORDS', htmlspecialchars($keywords), $content);
$content = str_replace('VALSE_PLAYER_URL', $url, $content);
$content = str_replace('VALSE_PLAYER_IMAGE', $image, $content);

echo $content;

?>
