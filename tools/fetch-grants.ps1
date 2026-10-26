$ProgressPreference='SilentlyContinue'
$base='https://vaksys.com/pro'
$s=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$g=Invoke-WebRequest "$base/auth/login" -UseBasicParsing -WebSession $s
$csrf=[regex]::Match($g.Content,'name="csrf_zivaan_pro"\s+id="csrf_token"\s+value="([^"]+)"').Groups[1].Value
Invoke-WebRequest "$base/auth/login" -Method Post -Body @{identity='zivaansolutions@gmail.com';password='admin123';csrf_zivaan_pro=$csrf;login='Login'} -UseBasicParsing -WebSession $s -MaximumRedirection 0 | Out-Null
$hdr=@{'X-Requested-With'='XMLHttpRequest';'Referer'="$base/auth/user_roles"}
$out=@{}
foreach($gid in 1..25){
  try{
    $r=Invoke-WebRequest "$base/auth/get_permission" -Method Post -Body @{group_id="$gid";csrf_zivaan_pro=$csrf} -Headers $hdr -UseBasicParsing -WebSession $s -TimeoutSec 30
    $o=$r.Content|ConvertFrom-Json
    $perm=[string]$o.permission
    $n=if($perm){($perm -split ',').Count}else{0}
    $out["$gid"]=$perm
    Write-Host "group $gid : $n perms"
  }catch{ Write-Host "group $gid FAIL" }
  Start-Sleep -Milliseconds 100
}
$out|ConvertTo-Json -Depth 3|Set-Content 'E:\DEVELOP WITH AI\ACCOUNTING GST\data\parsed\grants.json' -Encoding UTF8
