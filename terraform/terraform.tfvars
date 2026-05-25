location                = "centralindia"
project_name            = "cogni"
frontend_domain         = "cognidispatch.g0ku1.online"
git_repo_url            = "https://github.com/gokulk18/Cogni-Dispatch"

# OPTIONAL: Your SSH public key. If left empty "", Terraform will automatically 
# generate a brand-new SSH key pair at apply-time and save the private key 
# locally for you as 'cogni_vm_key.pem' inside this directory.
vm_ssh_public_key = ""

# REQUIRED: Will be populated from Terraform cosmos output after first apply
# Run: terraform output -raw cosmos_connection_string
# Format: mongodb://<account>:<key>@<account>.mongo.cosmos.azure.com:10255/cognidispatch?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000
mongodb_uri = "REPLACE_AFTER_FIRST_APPLY_WITH_COSMOS_CONNECTION_STRING"

# Optional: Azure AI services (leave empty if not using)
azure_openai_endpoint   = ""
azure_openai_key        = ""
azure_openai_deployment = "gpt-4o"
azure_speech_region     = "centralindia"
azure_speech_key        = ""
