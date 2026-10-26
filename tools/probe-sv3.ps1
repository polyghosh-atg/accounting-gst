$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
$tok=$m.Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$tok;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$hdr=@{'X-Requested-With'='XMLHttpRequest';'Referer'=$base}
foreach($u in @('product/ajax_list','stock/ajax_list')){
  try{
    $body="draw=1&start=0&length=5&search%5Bvalue%5D=&order%5B0%5D%5Bcolumn%5D=0&order%5B0%5D%5Bdir%5D=asc&csrf_zivaan_pro=$tok"
    $r=Invoke-WebRequest "$base/$u" -Method Post -Body $body -ContentType 'application/x-www-form-urlencoded' -Headers $hdr -UseBasicParsing -WebSession $s -TimeoutSec 60
    $j=$r.Content|ConvertFrom-Json
    Write-Output ("AJAX $u total=" + $j.recordsTotal + " filtered=" + $j.recordsFiltered)
    if($j.data.Count -gt 0){ $row=($j.data[0] -join ' || '); Write-Output ("  ROW0: " + $row.Substring(0,[Math]::Min(400,$row.Length))) }
  }catch{ Write-Output ("$u FAIL " + $_.Exception.Message) }
}
