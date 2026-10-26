$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$csrf=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"').Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$csrf;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null

$routes=@('customer','supplier','product','product_category','warehouse','bank_account','expense','expense_category','auth/users','auth/user_roles','tax','discount','currency','item','quotation','proforma_invoice','purchase_order','purchase','sales_return','purchase_return','transfer','scrap_entry','scrap_issue','scrap_receive','scrap_product','pdc_receive','pdc_payment','credit_debit_note','promotion','email_template','whatsapp_template','employee','department','position','attendance','holiday','weekend','deduction','bonus','tax_deduction','advance_salary','leave','payroll','stock','bank_statement','cash_bank_entry','sale/add')
"table`trows`tbodyId"
foreach($r in $routes){
  try{$h=(Invoke-WebRequest "$base/$r" -UseBasicParsing -WebSession $s -TimeoutSec 60).Content}catch{"FAIL $r";continue}
  $best=0;$bestId=''
  foreach($m in [regex]::Matches($h,'(?is)<table\b[^>]*id="([^"]*)"[^>]*>(.*?)</table>')){
    $id=$m.Groups[1].Value; $inner=$m.Groups[2].Value
    $body=[regex]::Match($inner,'(?is)<tbody[^>]*>(.*?)</tbody>')
    $n=0
    if($body.Success){ $n=([regex]::Matches($body.Groups[1].Value,'(?is)<tr\b')).Count } else { $n=[Math]::Max(0,([regex]::Matches($inner,'(?is)<tr\b')).Count-1) }
    if($n -gt $best){$best=$n;$bestId=$id}
  }
  "$r`t$best`t$bestId"
}