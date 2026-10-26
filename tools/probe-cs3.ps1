$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
$tok=$m.Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$tok;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$r=Invoke-WebRequest "$base/report/closing_stock" -UseBasicParsing -WebSession $s -TimeoutSec 40
$html=$r.Content
$form=[regex]::Match($html,'(?is)<form\b([^>]*)>(.*?)</form>').Groups[1].Value
Write-Output ("FORM: " + $form)
$ajax=[regex]::Matches($html,'\$\.ajax|ajax_list|url\s*:\s*"[^"]*"|report/closing[^\s"''<>]*') | ForEach-Object { $_.Value } | Select-Object -Unique | Select-Object -First 10
Write-Output ("AJAXREFS: " + ($ajax -join ' | '))
$pidopts=[regex]::Matches($html,'(?is)<select\b[^>]*name="pid"[^>]*>(.*?)</select>')
if($pidopts.Count -gt 0){
  $opts=[regex]::Matches($pidopts[0].Groups[1].Value,'(?is)<option\b[^>]*value="([^"]*)"[^>]*>(.*?)</option>') | Select-Object -First 12
  foreach($o in $opts){ Write-Output ("OPT: " + $o.Groups[1].Value + " = " + ((($o.Groups[2].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()))) }
}
