$dnsName = "cognidispatch.g0ku1.online"
$passwordText = "Azureuser@123"
$outPath = "d:\CogniDispatch\terraform\cert.pfx"

Write-Output "Generating self-signed certificate for $dnsName..."
$cert = New-SelfSignedCertificate -DnsName $dnsName -CertStoreLocation "Cert:\CurrentUser\My" -KeyExportPolicy Exportable

Write-Output "Exporting to PFX format..."
$password = ConvertTo-SecureString $passwordText -AsPlainText -Force
Export-PfxCertificate -Cert $cert -FilePath $outPath -Password $password

Write-Output "PFX Certificate generated successfully at $outPath."
