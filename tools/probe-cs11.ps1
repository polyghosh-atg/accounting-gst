$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
$tok=$m.Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$tok;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$b=@{from_date='01-04-2024';to_date='26-10-2026';pid='';action_type='';submit='Search';csrf_zivaan_pro=$tok}
$r=Invoke-WebRequest "$base/report/closing_stock" -Method Post -Body $b -UseBasicParsing -WebSession $s -TimeoutSec 90
$html=$r.Content
$pats = @('No data','Warning','Notice','Undefined','Please select','required','Fatal')
foreach($pat in $pats){
  $n=[regex]::Matches($html,$pat).Count
  if($n -gt 0){ Write-Output ("FOUND [$pat] x$n") }
}
$i=$html.IndexOf('stock-value-body')
$seg=$html.Substring([Math]::Max(0,$i-500), [Math]::Min(4000,$html.Length-$i+500))
$seg | Out-File "E:\DEVELOP WITH AI\ACCOUNTING GST\data\parsed\closing_stock_seg.txt" -Encoding utf8
Write-Output "seg saved"
