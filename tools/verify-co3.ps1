$g = (Invoke-WebRequest "http://localhost:3100/settings/company" -UseBasicParsing -TimeoutSec 120).Content
Write-Output ("prefixes in flight data: " + ($g.Contains('credit_debit_note') -and $g.Contains('proforma_invoice')))
$cdn = [regex]::Match($g, 'credit_debit_note.{0,120}').Value
Write-Output ("cdn ctx: " + $cdn.Substring(0,[Math]::Min(150,$cdn.Length)))
Write-Output ("details inputs: " + ($g.Contains('name=\"company_name\"') -and $g.Contains('name=\"mobile\"') -and $g.Contains('name=\"country_id\"') -and $g.Contains('name=\"whatsapp_no\"')))
Write-Output ("save button: " + ($g.Contains('>Save<')))
Write-Output ("upi radios: " + ($g.Contains('name=\"upi_status\"') -or $g.Contains('upi_address')))
