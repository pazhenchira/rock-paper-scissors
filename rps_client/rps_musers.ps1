./rps_cleanup.ps1
sleep 1
$c = 10
if ($Args.Count -ne 0) {
$c = $Args[0]
}
$jobs = @()
while ($c -ne 0) {
  $jobs += Start-Job -filepath ./rps_user.ps1
  $c--;
}

$jobs | receive-job -AutoRemoveJob -Wait

