$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$csrf=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"').Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$csrf;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null

$eps=@('employee/add','promotion/add','pdc_receive/add','pdc_payment/add','email_template/add','whatsapp_template/add',
 'department/add','position/add','pdc_receive/add_deposit','pdc_payment/add_deposit','cash_bank_entry/bulk_entry',
 'scrap_issue/add','scrap_receive/add','scrap_entry/add','attendance/add','holiday/add','payroll/add')

foreach($e in $eps){
  try{$r=Invoke-WebRequest "$base/$e" -UseBasicParsing -WebSession $s -TimeoutSec 60}catch{"### $e FAIL"; continue}
  $c=$r.Content
  "### $e  len=$($c.Length)"
  $html=$null
  try{ $o=$c|ConvertFrom-Json; $html = ($o.PSObject.Properties | ForEach-Object { $_.Value }) -join "`n" }catch{ $html=$c }
  if(-not $html){ continue }
  $seq=@()
  foreach ($f in [regex]::Matches($html,'(?is)<label\b[^>]*>(.*?)</label>|<(input|select|textarea)\b([^>]*)>')) {
    if ($f.Groups[1].Success) { $t=($f.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim(); if($t){$seq+="[$t]"} }
    else { $a=$f.Groups[3].Value; $n=[regex]::Match($a,'name="([^"]*)"').Groups[1].Value; $req= if($a -match 'required'){'*'}else{''}; if($n){$seq+="$n$req"} }
  }
  "  $($seq -join ' ')"
}
