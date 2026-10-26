Start-Sleep 12
$g = (Invoke-WebRequest "http://localhost:3100/settings/company" -UseBasicParsing -TimeoutSec 120).Content
Write-Output ("page 200, len=" + $g.Length)
Write-Output ("banner gradient: " + ($g.Contains('from-indigo-700') -and $g.Contains('Zivaan Solutions')))
Write-Output ("gstin badge: " + ($g.Contains('02BINPK2730F1ZN')))
Write-Output ("icon tabs sticky: " + ($g.Contains('sticky top-2') -and $g.Contains('Invoice Setting')))
Write-Output ("section head + sub: " + ($g.Contains('Identity, contact') -or $g.Contains('printed on every bill')) -and ($g.Contains('Company Settings')))
Write-Output ("save button: " + ($g.Contains('Save') -and $g.Contains('Changes apply')))
Write-Output ("details fields intact: " + ($g.Contains('name="company_name"') -and $g.Contains('name="mobile"') -and $g.Contains('name="whatsapp_no"')))
Write-Output ("flight props intact: " + ($g.Contains('credit_debit_note') -and $g.Contains('gst_registration_type')))
Write-Output "--- server errors ---"
Get-Content "E:\DEVELOP WITH AI\ACCOUNTING GST\accounting\server.log" -ErrorAction SilentlyContinue | Select-String "Error|TypeError" | Select-Object -First 5
