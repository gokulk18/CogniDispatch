location            = "centralindia"
project_name        = "cogni"
vnet_address_space  = ["10.0.0.0/16"]
appgw_subnet_prefix = "10.0.1.0/24"
aks_subnet_prefix   = "10.0.4.0/22"
aks_node_count      = 2
aks_node_size       = "Standard_D2s_v3"

frontend_domain     = "app.cognidispatch.com"
backend_domain      = "api.cognidispatch.com"
