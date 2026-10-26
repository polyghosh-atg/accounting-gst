$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
$tok=$m.Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$tok;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$hdr=@{'X-Requested-With'='XMLHttpRequest';'Referer'="$base/sale"}
$body="draw=1&start=0&length=100&search%5Bvalue%5D=Umair&order%5B0%5D%5Bcolumn%5D=0&order%5B0%5D%5Bdir%5D=asc&csrf_zivaan_pro=$tok"
try{
  $r=Invoke-WebRequest "$base/sale/ajax_list" -Method Post -Body $body -ContentType 'application/x-www-form-urlencoded' -Headers $hdr -UseBasicParsing -WebSession $s -TimeoutSec 60
  $j=$r.Content|ConvertFrom-Json
  Write-Output ("total=" + $j.recordsTotal + " filtered=" + $j.recordsFiltered)
  foreach($row in $j.data){ Write-Output (($row -join ' || ').Substring(0,[Math]::Min(400,($row -join ' || ').Length))) }
}catch{ Write-Output ("FAIL " + $_.Exception.Message) }
