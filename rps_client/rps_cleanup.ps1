$H='http://10.121.245.6:8080'
$H='http://10.121.244.233:8080'

invoke-restmethod -Uri $H/cleanUp -Method Get
