$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
$tok=$m.Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$tok;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$r=Invoke-WebRequest "$base/settings" -UseBasicParsing -WebSession $s -TimeoutSec 60
$html=$r.Content
$html | Out-File "E:\DEVELOP WITH AI\ACCOUNTING GST\data\parsed\settings_page.html" -Encoding utf8
Write-Output ("saved settings len=" + $html.Length)
foreach($sel in @('country_id','state_id','city_id','whatsapp_country_code','currency_id')){
  $dd=[regex]::Match($html,'(?is)<select\b[^>]*name="' + $sel + '"[^>]*>(.*?)</select>').Groups[1].Value
  $opts=[regex]::Matches($dd,'(?is)<option\b[^>]*value="([^"]*)"[^>]*>(.*?)</option>')
  Write-Output ("SELECT $sel options=" + $opts.Count)
  $sel2=[regex]::Matches($dd,'(?is)<option\b[^>]*value="([^"]*)"[^>]*selected[^>]*>(.*?)</option>')
  foreach($o in $sel2){ Write-Output ("  SELECTED: " + $o.Groups[1].Value + " = " + ((($o.Groups[2].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()))) }
}
