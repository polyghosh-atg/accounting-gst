$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$RawDir='E:\DEVELOP WITH AI\ACCOUNTING GST\data\raw'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$csrf=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"').Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$csrf;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$hdr=@{'X-Requested-With'='XMLHttpRequest';'Referer'="$base/customer";'Accept'='application/json, text/javascript, */*; q=0.01'}
$targets=@('currency','transfer','cash_bank_entry','bank_statement','pdc_receive','pdc_payment','email_template')
foreach($m in $targets){
  $all=@(); $total=$null; $start=0; $len=10
  while($true){
    try{
      $r=Invoke-WebRequest "$base/$m/ajax_list" -Method Post -Body @{draw='1';start="$start";length="$len";csrf_zivaan_pro=$csrf;'search[value]'=''} -Headers $hdr -UseBasicParsing -WebSession $s -TimeoutSec 60
    }catch{ Write-Host "FAIL $m start=$start $($_.Exception.Message)"; break }
    $j=$r.Content|ConvertFrom-Json
    if($null -eq $total){ $total=$j.recordsTotal }
    if(-not $j.data -or $j.data.Count -eq 0){ break }
    $all += $j.data
    Write-Host "$m start=$start got=$($j.data.Count) acc=$($all.Count)/$total"
    $start += $j.data.Count
    if($all.Count -ge $total){ break }
    if($start -gt 5000){ break }
  }
  $out=[pscustomobject]@{draw=1;recordsTotal=$total;recordsFiltered=$total;data=$all}
  $out|ConvertTo-Json -Depth 6|Set-Content (Join-Path $RawDir "$m.json") -Encoding UTF8
  Write-Host "SAVED $m total=$total collected=$($all.Count)"
}
