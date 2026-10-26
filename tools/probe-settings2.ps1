$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$m.Groups[1].Value;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$hdr=@{'X-Requested-With'='XMLHttpRequest';'Referer'=$base}
$draw=1
foreach($u in @('custom_field/ajax_list','discount/ajax_list','item/ajax_list','whatsapp_template/ajax_list','email_template/ajax_list')){
  try{
    $b="draw=$draw&start=0&length=5&search%5Bvalue%5D=&order%5B0%5D%5Bcolumn%5D=0&order%5B0%5D%5Bdir%5D=asc"
    $r=Invoke-WebRequest "$base/$u" -Method Post -Body $b -ContentType 'application/x-www-form-urlencoded' -Headers $hdr -UseBasicParsing -WebSession $s -TimeoutSec 40
    $j=$r.Content|ConvertFrom-Json
    Write-Output ("AJAX " + $u + " total=" + $j.recordsTotal + " filtered=" + $j.recordsFiltered + " rows=" + $j.data.Count)
    if($j.data.Count -gt 0){ Write-Output ("  ROW0: " + (($j.data[0] | ForEach-Object { $_ }) -join ' || ').Substring(0, [Math]::Min(600, (($j.data[0] | ForEach-Object { $_ }) -join ' || ').Length))) }
  }catch{ Write-Output ($u + " FAIL " + $_.Exception.Message) }
  $draw++
}
foreach($u in @('discount/add','item/add','expense_category/add','currency/add','tax/add','custom_field/add')){
  try{
    $r=Invoke-WebRequest "$base/$u" -UseBasicParsing -WebSession $s -TimeoutSec 40
    $html=$r.Content
    try{ $o=$html|ConvertFrom-Json; $html=($o.PSObject.Properties|ForEach-Object{$_.Value}) -join "`n" }catch{}
    $f = [regex]::Matches($html,'(?is)<label\b[^>]*>(.*?)</label>|<(input|select|textarea)\b([^>]*)>') | ForEach-Object { if($_.Groups[1].Success){ $t=(($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim()); if($t){"[$t]"} } else { $n=[regex]::Match($_.Groups[3].Value,'name="([^"]*)"').Groups[1].Value; if($n){$n} } } | Where-Object { $_ } | Select-Object -Unique
    Write-Output ("ADD " + $u + " :: " + ($f -join ' '))
  }catch{ Write-Output ($u + " FAIL") }
}
