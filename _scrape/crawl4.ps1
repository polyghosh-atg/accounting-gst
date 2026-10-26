$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$out='E:\DEVELOP WITH AI\ACCOUNTING GST\_scrape'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$csrf=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"').Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$csrf;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null

$routes=@('report/balance_sheet','application_settings','gst_return','attendance','holiday','weekend','deduction','bonus','tax_deduction','advance_salary','leave','payroll','department','position','stock','ledger')

foreach($r in $routes){
  try{$resp=Invoke-WebRequest "$base/$r" -UseBasicParsing -WebSession $s -TimeoutSec 60}catch{"FAIL $r";continue}
  $h=$resp.Content
  $title=[regex]::Match($h,'(?is)<title>(.*?)</title>').Groups[1].Value.Trim()
  $cnt=[regex]::Match($h,'(?is)Showing[^<]*?of\s*([0-9,]+)\s*entries').Groups[1].Value
  if(-not $cnt){$cnt=[regex]::Match($h,'(?is)of\s*([0-9,]+)\s*entries').Groups[1].Value}
  $heads=[regex]::Matches($h,'(?is)<h[1-4][^>]*>(.*?)</h[1-4]>')|ForEach-Object{($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()}|Where-Object{$_ -and $_.Length -lt 60}|Select-Object -Unique
  $ths=[regex]::Matches($h,'(?is)<table\b[^>]*id="([^"]*)"[^>]*>(.*?)</table>')|ForEach-Object{
     $id=$_.Groups[1].Value; $inner=$_.Groups[2].Value
     $t=[regex]::Matches($inner,'(?is)<th\b[^>]*>(.*?)</th>')|ForEach-Object{($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()}|Where-Object{$_}
     if($t.Count -gt 0){"$id => $($t -join ' | ')"}
  }
  $ajax=[regex]::Matches(([regex]::Matches($h,'(?is)<script\b[^>]*>(.*?)</script>')|ForEach-Object{$_.Groups[1].Value}) -join "`n",'(?i)(?:url\s*:\s*["'']|fetch\(\s*["'']|\$\.(?:get|post)\(\s*["''])([^"''\s]+)')|ForEach-Object{$_.Groups[1].Value}|Sort-Object -Unique
  $exp=[regex]::Matches($h,'(?i)href="([^"]*(?:export|csv|xls)[^"]*)"')|ForEach-Object{$_.Groups[1].Value}|Sort-Object -Unique
  "===== $r | $title | count=$cnt"
  "H: $($heads -join ' ; ')"
  "TH: $($ths -join ' ;; ')"
  "AJAX: $($ajax -join ' , ')"
  "EXPORT: $($exp -join ' , ')"
}

"##### MODALS"
$eps=@('deduction/add','bonus/add','tax_deduction/add','advance_salary/add','leave/add','weekend/add','holiday/add','department/add','position/add')
foreach($e in $eps){
  try{$r=Invoke-WebRequest "$base/$e" -UseBasicParsing -WebSession $s -TimeoutSec 40}catch{"### $e FAIL";continue}
  $c=$r.Content; "### $e len=$($c.Length)"
  $html=$null; try{$o=$c|ConvertFrom-Json;$html=($o.PSObject.Properties|ForEach-Object{$_.Value}) -join "`n"}catch{$html=$c}
  if(-not $html){continue}
  $seq=@()
  foreach($f in [regex]::Matches($html,'(?is)<label\b[^>]*>(.*?)</label>|<(input|select|textarea)\b([^>]*)>')){
    if($f.Groups[1].Success){$t=($f.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim();if($t){$seq+="[$t]"}}
    else{$a=$f.Groups[3].Value;$n=[regex]::Match($a,'name="([^"]*)"').Groups[1].Value;if($n){$seq+=$n}}
  }
  "  $($seq -join ' ')"
}
