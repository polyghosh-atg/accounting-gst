$g = (Invoke-WebRequest "http://localhost:3100/settings/company" -UseBasicParsing -TimeoutSec 120).Content
Write-Output ('details inputs: ' + ($g.Contains('name="company_name"') -and $g.Contains('name="mobile"') -and $g.Contains('name="country_id"') -and $g.Contains('name="whatsapp_no"') -and $g.Contains('name="address_line1"') -and $g.Contains('name="pincode"')))
Write-Output ('gst tab in flight: ' + ($g.Contains('gst_registration_type') -and $g.Contains('Not Registered')))
Write-Output ('invoice tab in flight: ' + ($g.Contains('payment_duration_for_sale')))
Write-Output ('upi tab in flight: ' + ($g.Contains('show_qr_code_in_proforma') -and $g.Contains('company_based')))
Write-Output ('logo tab in flight: ' + ($g.Contains('multipart') -or $g.Contains('form-data')))
