$g = (Invoke-WebRequest "http://localhost:3100/settings/company" -UseBasicParsing -TimeoutSec 120).Content
Write-Output ('has gst_registration_type: ' + $g.Contains('gst_registration_type'))
Write-Output ('has Not Registered: ' + $g.Contains('Not Registered'))
Write-Output ('has Registered: ' + $g.Contains('Registered'))
