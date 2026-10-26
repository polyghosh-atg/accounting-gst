$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$m.Groups[1].Value;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
foreach($u in @('custom_field','discount','expense_category','currency','tax','item','email_template','whatsapp_template')){
  try{
    $r=Invoke-WebRequest "$base/$u" -UseBasicParsing -WebSession $s -TimeoutSec 40
    $ths = [regex]::Matches($r.Content,'(?is)<th\b[^>]*>(.*?)</th>') | ForEach-Object { (($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()) } | Where-Object { $_ } | Select-Object -Unique
    Write-Output ("THS " + $u + " :: " + ($ths -join ' | '))
  }catch{ Write-Output ($u + " FAIL") }
}
try{
  $r=Invoke-WebRequest "$base/email_setup" -UseBasicParsing -WebSession $s -TimeoutSec 40
  $f = [regex]::Matches($r.Content,'(?is)<label\b[^>]*>(.*?)</label>|<(input|select|textarea)\b([^>]*)>') | ForEach-Object { if($_.Groups[1].Success){ $t=(($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()); if($t){"[$t]"} } else { $n=[regex]::Match($_.Groups[3].Value,'name="([^"]*)"').Groups[1].Value; if($n){$n} } } | Where-Object { $_ } | Select-Object -Unique
  Write-Output ("SETUP FIELDS :: " + ($f -join ' '))
}catch{ Write-Output "email_setup FAIL" }
