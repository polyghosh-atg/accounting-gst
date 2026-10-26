$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$csrf=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"').Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$csrf;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$hdr=@{'X-Requested-With'='XMLHttpRequest';'Referer'="$base/customer";'Accept'='application/json, text/javascript, */*; q=0.01'}
$mods=@('customer','supplier','product_core','product_category','warehouse','bank_account','expense','expense_category','tax','discount','currency','item','quotation','proforma_invoice','purchase_order','purchase','sale','sales_return','purchase_return','transfer','scrap_entry','scrap_issue','scrap_receive','scrap_product','pdc_receive','pdc_payment','credit_debit_note','promotion','email_template','whatsapp_template','employee','department','position','attendance','holiday','weekend','deduction','bonus','tax_deduction','advance_salary','leave','payroll','stock','bank_statement','cash_bank_entry','service','users','user_roles','ledger')
"module`ttotal`tlen`tendpoint"
foreach($m in $mods){
  $ep="$m/ajax_list"
  try{
    $r=Invoke-WebRequest "$base/$ep" -Method Post -Body @{draw='1';start='0';length='5';csrf_zivaan_pro=$csrf;'search[value]'='';'order[0][column]'='0';'order[0][dir]'='asc'} -Headers $hdr -UseBasicParsing -WebSession $s -TimeoutSec 40
    $j=$null
    try{$j=$r.Content|ConvertFrom-Json}catch{}
    if($j -and $null -ne $j.recordsTotal){ "$ep`t$($j.recordsTotal)`t$($r.Content.Length)`tOK" }
    else { "$ep`t?`t$($r.Content.Length)`tNONJSON: $($r.Content.Substring(0,60) -replace "`r|`n",' ')" }
  }catch{ "$ep`t-`t-`tFAIL $($_.Exception.Response.StatusCode.value__)" }
}
