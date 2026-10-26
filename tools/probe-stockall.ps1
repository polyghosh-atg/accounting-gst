$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
$tok=$m.Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$tok;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$hdr=@{'X-Requested-With'='XMLHttpRequest';'Referer'=$base}
$body="draw=1&start=0&length=100&search%5Bvalue%5D=&order%5B0%5D%5Bcolumn%5D=0&order%5B0%5D%5Bdir%5D=asc&csrf_zivaan_pro=$tok"
$r=Invoke-WebRequest "$base/stock/ajax_list" -Method Post -Body $body -ContentType 'application/x-www-form-urlencoded' -Headers $hdr -UseBasicParsing -WebSession $s -TimeoutSec 60
$j=$r.Content|ConvertFrom-Json
Write-Output ("total=" + $j.recordsTotal + " got=" + $j.data.Count)
$out=@()
foreach($row in $j.data){
  $cells = $row | ForEach-Object { ((($_ -replace '<[^>]+>',' ' -replace '\s+',' ').Trim())) }
  $out += [pscustomobject]@{ wh=$cells[0]; prod=$cells[1]; qty=$cells[2]; uom=$cells[3]; cost=$cells[4]; price=$cells[5]; type=$cells[6]; date=$cells[7] }
}
$out | Group-Object prod | ForEach-Object {
  $in=($_.Group | Where-Object { $_.type -eq 'IN' } | Measure-Object -Property qty -Sum).Sum
  $outt=($_.Group | Where-Object { $_.type -eq 'OUT' } | Measure-Object -Property qty -Sum).Sum
  if($_.Name -match 'Attar|Kanha|Lava|Mukesh'){ Write-Output ("SRC " + $_.Name + " IN=" + $in + " OUT=" + $outt + " n=" + $_.Count) }
}
$out | ConvertTo-Json -Depth 3 | Out-File "E:\DEVELOP WITH AI\ACCOUNTING GST\data\parsed\stock_all.json" -Encoding utf8
Write-Output "saved"
