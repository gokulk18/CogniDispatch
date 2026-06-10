$RG="rg-terraform-state"
$SA="stcognitfstate589b4"
$CONTAINER="tfstate"
$LOC="japanwest"

Write-Host "Creating Resource Group: $RG..."
az group create --name $RG --location $LOC

Write-Host "Creating Storage Account: $SA..."
az storage account create --name $SA --resource-group $RG --location $LOC --sku Standard_LRS --encryption-services blob

Write-Host "Enabling Versioning and Soft Delete..."
az storage account blob-service-properties update --account-name $SA --resource-group $RG --enable-versioning true --enable-delete-retention true --delete-retention-days 7

Write-Host "Retrieving Storage Account Key..."
$KEY=$(az storage account keys list --resource-group $RG --account-name $SA --query '[0].value' -o tsv)

Write-Host "Creating Storage Container: $CONTAINER..."
az storage container create --name $CONTAINER --account-name $SA --account-key $KEY

Write-Host "Done!"
