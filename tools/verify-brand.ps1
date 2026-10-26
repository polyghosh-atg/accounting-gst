$g = (Invoke-WebRequest "http://localhost:3100/settings/company" -UseBasicParsing -TimeoutSec 120).Content
Write-Output ("len=" + $g.Length)
Write-Output ("banner Office ERP: " + ($g.Contains('>Office ERP<') -or $g.Contains('Office ERP')))
Write-Output ("company input value Office ERP: " + ($g.Contains('value="Office ERP"') -or $g.Contains('Office ERP')))
