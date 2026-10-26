$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$RawDir='E:\DEVELOP WITH AI\ACCOUNTING GST\data\raw'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$csrf=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"').Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$csrf;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$hdr=@{'X-Requested-With'='XMLHttpRequest';'Referer'="$base/customer";'Accept'='application/json, text/javascript, */*; q=0.01'}
$targets=@('currency','transfer','cash_bank_entry','bank_statement','pdc_receive','pdc_payment','email_template')
$terms=@('a','e','i','o','u','A','E','I','O','U','r','s','t','n','l','c','0','1','2','3','4','5','6','7','8','9','-','/','B','C','P','R','S','T','pay','Pay','rece','Rece','bank','Bank','cash','Cash','25','26','20')
foreach($m in $targets){
  $seen=@{}; $total=$null
  foreach($sv in $terms){
    try{
      $r=Invoke-WebRequest "$base/$m/ajax_list" -Method Post -Body @{draw='1';start='0';length='100';csrf_zivaan_pro=$csrf;'search[value]'=$sv} -Headers $hdr -UseBasicParsing -WebSession $s -TimeoutSec 60
    }catch{ continue }
    try{ $j=$r.Content|ConvertFrom-Json }catch{ continue }
    if($null -eq $total){ $total=$j.recordsTotal }
    if(-not $j.data){ continue }
    foreach($row in $j.data){
      $key = (($row | ForEach-Object { ($_ -replace '<[^>]+>',' ' -replace '\s+',' ').Trim() }) -join ' | ')
      if(-not $seen.ContainsKey($key)){ $seen[$key]=$row }
    }
    Start-Sleep -Milliseconds 80
  }
  # also keep original page-0 rows
  try{
    $old=Get-Content (Join-Path $RawDir "$m.json") -Raw | ConvertFrom-Json
    foreach($row in $old.data){
      $key = (($row | ForEach-Object { ($_ -replace '<[^>]+>',' ' -replace '\s+',' ').Trim() }) -join ' | ')
      if(-not $seen.ContainsKey($key)){ $seen[$key]=$row }
    }
  }catch{}
  $all=@($seen.Values)
  $out=[pscustomobject]@{draw=1;recordsTotal=$total;recordsFiltered=$all.Count;data=$all}
  $out|ConvertTo-Json -Depth 6|Set-Content (Join-Path $RawDir "$m.json") -Encoding UTF8
  Write-Host "SWEEP $m total=$total collected=$($all.Count)"
}
