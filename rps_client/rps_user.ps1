function log($txt) {
  write-host  $txt
}

$H='http://10.121.245.6:8080'

# 1. Register
$c1 = invoke-restmethod -Uri $H -Method Get
if ($c1.name -eq $null) {
  log("Couldn't register")
  exit 1
}

log( "I am " + $c1.Name)

# 1.5 Initialize round to 0
$round = 0
$wn=""

while (!$wn.overallWinner) {
	# 2. Repeat next step until there's a plan for what's next; i.e. either new round && opponent available or overall winner 
	$wn = invoke-restmethod -Uri ($c1.HostIP + ":" + $c1.HostPort + "/whatsNext") -Method Get
	if ($round -ne $wn.round -and $wn.opponent) {
		log( $c1.Name + " playing against " + $wn.opponent.name)

		# 3. Make a move
		$mv = get-random -minimum 0 -maximum 3
		$move=invoke-restmethod -Uri ($c1.HostIP + ":" + $c1.HostPort + "/myMove?mv=" + $mv) -Method Get

		# 4. Get opponents move
		$oppMv = -1
		while ($oppMv -eq -1) {
		  $om = invoke-restmethod -Uri ($c1.HostIP + ":" + $c1.HostPort + "/getOpponentsMove") -Method Get
		  $oppMv = $om.opponentsMove
		  sleep 1 # half second sleep
	        }

		# 5. Get result
		$win = invoke-restmethod -Uri ($c1.HostIP + ":" + $c1.HostPort + "/didIWin") -Method Get

	        # 6. If won, jump to step 2
		if ($win.results) {
			if ($win.iwon -eq -1) {
				log( $c1.Name + " lost :( in round " + $wn.round)
				exit;
			}
			if ($win.iwon -eq 1) {
				$round++
				log( $c1.Name + " won this round " + $wn.round)
			} else {
				log( $c1.Name + " drew... trying again")
			}
		}
	} else {
           sleep 1
        }

}

log( $c1.Name + " is the champion....")
