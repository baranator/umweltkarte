<?php
error_reporting(E_ALL);
ini_set('display_errors', 'on');
$CONFIG=get_config();
$APIURL='http://'.$_SERVER['HTTP_HOST'].$_SERVER['PHP_SELF'];




function get_config(){
	// Get the contents of the JSON file
	if(file_exists("config.json")){
		$strJsonFileContents = file_get_contents("config.json");
		if($strJsonFileContents){
			$a=json_decode($strJsonFileContents, true);
			if($a!=null and isset($a['name']) 
						and isset($a['subtitle']) 
						and isset($a['description']) 
						and isset($a['date'])
						and isset($a['delivery_points'])
						and isset($a['mailfrom'])
						and isset($a['impressum'])
						and isset($a['center']) and is_array($a['center']) and count($a['center'])==3
						and isset($a['area_maxsize_qm']) and is_numeric($a['area_maxsize_qm'])
			){
				return $a;
			}
		}
		
	}
	
	exit_out("Kofiguration ungültig, Datei config.json auf Fehler prüfen!");
}



function set_h($scode,$ctype='Content-Type: application/json'){
	header($ctype);
	http_response_code($scode);
}

function exit_out($msg,$code=400,$type='Content-Type: application/json',$data=null){
	set_h($code,$type);
	if($type=='Content-Type: application/json'){
		$obj=[];
		$obj['msg']=$msg;
		$obj['status']=($code>=200 and $code<226)?"success":"error";
		$obj['code']=$code;
		if($data!=null){
			$obj['data']=$data;
		}
		echo json_encode($obj, JSON_PRETTY_PRINT);
	}else{
		echo $msg;
	}
	exit();
}



function validate_pflocks($p){
	$pf=json_decode($p);
	if($pf!=null and is_array($pf) and count($pf)>=3){
		foreach ($pf as $cpair) {
			if(!is_array($cpair) or count($cpair)!=2){
				exit_out("validation failed: coords not valid");
			}
			if(!is_numeric($cpair[0]) or $cpair[0]>90 or $cpair[0]<(-90) or
				!is_numeric($cpair[1]) or $cpair[1]>180 or $cpair[1]<(-180)
			){
				exit_out("validation failed: coords out of range");
			}
		}
	}
	return false;
}




function do_add(){
	global $CONFIG;
	global $APIURL;
	if(!isset($_GET['name']) or !isset($_GET['mail']) or !isset($_GET['pflocks'])){
		exit_out("validation failed: data sent incomplete");
	}
	//check mail and set coordinates; validate_pflocks exits whole script on error automatically
	validate_pflocks($_GET['pflocks']);
	$mail=filter_var($_GET['mail'], FILTER_VALIDATE_EMAIL);

	
	if(!$mail){
		exit_out("validation failed: invalid mail");
	}

	$token=bin2hex(random_bytes(16));

	//TODO:protect from spam with gmail-dotted email-adresses
	if(false and (str_ends_with ($_GET['mail'], "@gmail.com") or str_ends_with ($_GET['mail'], "@googlemail.com" ))){
		$mailhash=md5(str_replace(".", "", $_GET['mail']));
	}else{
		$mailhash=md5($_GET['mail']);
	}
	
	//store entry to daba
	global $db;
	$db->exec('BEGIN');
	$stmt=$db->prepare('INSERT INTO
							cleanings
							(name,polygon,token,mailhash)
						VALUES
							(?,?,?,?)
	');
	$stmt->bindValue(1, $_GET['name']);
	$stmt->bindValue(2, $_GET['pflocks']);
	$stmt->bindValue(3, $token);
	$stmt->bindValue(4, $mailhash);
	$r=$stmt->execute();
	$db->exec('COMMIT');

	//do the mailing
	$headers   = array();
	$headers[] = "MIME-Version: 1.0";
	$headers[] = "Content-type: text/plain; charset=utf-8";
	$headers[] = "From: Umwelttag Friesoythe<umwelttag@spd-friesoythe.de>";
	$message="Moin ".$_GET['name'].",\nschön, dass du beim ".$CONFIG["name"]." am  ".$CONFIG["date"]." mitmachst!\n \n ";
	$message.= "\n - Bitte bestätige deine Teilnahme, in dem du auf den Link klickst: ".$APIURL."?action=verify&token=".$token." !";
	$message.= "\n - Wenn du mit dem Sammeln fertig bist, kannst du dein Gebiet als \"erledigt\" markieren. Klicke hierzu auf diesen Link: ".$APIURL."?action=confirm&token=".$token;
	$message.= "\n - Dir ist etwas dazwischengekommen? Entferne dein Gebiet mit diesem Link: ".$APIURL."?action=cancel&token=".$token;
	$message.= "\n \n Viele Grüße!";
	mail( $_GET['mail'] , "Bitte bestätigen: ".$CONFIG["name"] , $message, implode("\r\n",$headers));
	
	exit_out("alles tutti gelaufen ;)", 200);
}

function do_change_status($to){
	if(!isset($_GET['token']))
		exit_out('<html><head><title>error</title><meta http-equiv="refresh" content="5; url=//'.$_SERVER['HTTP_HOST'].'"></head><body><h1>Keinen Bestätigungscode erhalten!</h1><p> Du wirst in 5 Sekunden weitergeleitet!</p></body></html>',400,'Content-Type: text/html');
		
	global $db;
	$db->exec('BEGIN');
	$stmt=$db->prepare('UPDATE
							cleanings
						SET
							status=?
						WHERE
							token=?
	');
	$stmt->bindValue(1, $to);
	$stmt->bindValue(2, $_GET['token']);
	//$stmt->bindValue(3, $from);
	$r=$stmt->execute();
	$q=$db->exec('COMMIT');
	if(!$q || $db->changes()<=0){ //Before !=1
		exit_out('<html><head><title>error</title><meta http-equiv="refresh" content="5; url=//'.$_SERVER['HTTP_HOST'].'"></head><body><h1>Gebiet nicht gefunden oder bereits bestätigt!</h1><p> Du wirst in 5 Sekunden weitergeleitet!</p></body></html>',400,'Content-Type: text/html');
	}
	exit_out('<html><head><title>success</title><meta http-equiv="refresh" content="5; url=//'.$_SERVER['HTTP_HOST'].'"></head><body><h1>Aktion erfolgreich!</h1><p> Du wirst in 5 Sekunden weitergeleitet!</p></body></html>',200,'Content-Type: text/html');	
}

function do_verify(){
	do_change_status("verified");
}
	
function do_cancel(){
	do_change_status("canceled");
}
function do_confirm(){
	do_change_status("done");
}

function do_list(){
	global $db;
	$db->exec('BEGIN');
	$r=$db->query('SELECT name,polygon,status FROM cleanings WHERE status="verified" or status="done"');
	$db->exec('COMMIT');

	$obj = [];
	while ($row=($r->fetchArray(SQLITE3_ASSOC))){
		$row["polygon"]=json_decode($row["polygon"]);
		$obj[]= (object)$row;

	}
	
	exit_out("alles tutti gelaufen ;)", 200, 'Content-Type: application/json', $obj);
}


if(isset($_GET['action'])){
	
	$db = new SQLite3('umwelttag.sqlite', SQLITE3_OPEN_CREATE | SQLITE3_OPEN_READWRITE);
	$db->query('CREATE TABLE IF NOT EXISTS "cleanings" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "name" VARCHAR NOT NULL,
    "status" VARCHAR DEFAULT open,
	"token" VARCHAR,
	"polygon" VARCHAR,
	"mailhash" VARCHAR,
	"timestamp" DATETIME DEFAULT CURRENT_TIMESTAMP
)');

	
	
	
	
	switch($_GET['action']){
		case "add": 
			do_add();
			break;
		case "verify":
			do_verify();
			break;
		case "cancel":		
			do_cancel();
			break;
		case "confirm":		
			do_confirm();
			break;
		case "list":		
			do_list();
			break;
		case "get_config":	
			exit_out("alles tutti gelaufen ;)", 200, 'Content-Type: application/json', $CONFIG);
			break;
		default:  			
			exit_out("error: invalid action");
	}
}
?>
