$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$m=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"')
$tok=$m.Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$tok;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$r=Invoke-WebRequest "$base/report/inventory_product_added" -UseBasicParsing -WebSession $s -TimeoutSec 40
$form=[regex]::Match($r.Content,'(?is)<form\b[^>]*>(.*?)</form>').Groups[1].Value
$lbls=[regex]::Matches($form,'(?is)<label\b[^>]*>(.*?)</label>') | ForEach-Object { ((($_.Groups[1].Value -replace '<[^>]+>','' -replace '\s+',' ').Trim())) } | Where-Object { $_ }
Write-Output ("LABELS: " + ($lbls -join ' | '))
$exp=[regex]::Match($form,'(?is)name="expiry_date"[^>]*>').Value
Write-Output ("EXPIRY INPUT: " + $exp)
$btn=[regex]::Match($form,'(?is)<button[^>]*>.*?</button>').Value
Write-Output ("BTN: " + ((($btn -replace '<[^>]+>',' ' -replace '\s+',' ').Trim())))
$b=@{expiry_date='';from_date='01-04-2024';to_date='26-10-2026';pid='';action_type='';submit='Search';csrf_zivaan_pro=$tok}
$r2=Invoke-WebRequest "$base/report/inventory_product_added" -Method Post -Body $b -UseBasicParsing -WebSession $s -TimeoutSec 90
$html=$r2.Content
$tb=[regex]::Match($html,'(?is)<table\b[^>]*>(.*?)</table>').Groups[1].Value
$tb | Out-File "E:\DEVELOP WITH AI\ACCOUNTING GST\data\parsed\ipa_table.html" -Encoding utf8
Write-Output ("table saved len=" + $tb.Length)
