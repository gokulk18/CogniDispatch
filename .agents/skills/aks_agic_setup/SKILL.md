---
name: aks_agic_setup
description: Detailed step-by-step blueprint to configure and replicate the AKS, Helm, Azure Key Vault (Workload Identity), and Application Gateway Ingress Controller (AGIC) setup.
---

# AKS, Key Vault, and AGIC Replication Blueprint

This blueprint outlines the exact steps to replicate the secure infrastructure setup, including Helm installation, Azure Key Vault integration with Workload Identity, and AGIC routing.

## 1. Helm CLI Installation
If Helm is missing on the client system:
```powershell
winget install Helm.Helm
```
*Note: Restart your terminal session or use the absolute path to `helm.exe` if environment variables have not refreshed.*

---

## 2. Azure Key Vault & Workload Identity Setup
To secure sensitive application secrets:
1. **Create Azure Key Vault**: Create a key vault (e.g., `cognidispatch-kv`) in the Azure Portal or via CLI.
2. **Add Secrets**: Add secrets such as `MONGODB-URI`, `AZURE-OPENAI-KEY`, `AZURE-SPEECH-KEY`, and `JWT-SECRET`.
3. **Configure Access**: 
   - Assign the **Key Vault Secrets User** role to the managed identities of the microservices or the AKS agentpool.
   - For Workload Identity, create a federated credential linking the Kubernetes `ServiceAccount` in the app namespace to the Azure managed identity.

### Kubernetes Manifests (Helm)
- **SecretProviderClass**: Maps Key Vault secrets to Kubernetes volume mounts:
  ```yaml
  apiVersion: secrets-store.csi.x-k8s.io/v1
  kind: SecretProviderClass
  metadata:
    name: cogni-secrets-provider
    namespace: cogni-dispatch
  spec:
    provider: azure
    parameters:
      usePodIdentity: "false"
      useVMManagedIdentity: "false"
      clientID: "<Azure-Identity-Client-ID>"
      keyvaultName: "cognidispatch-kv"
      tenantId: "<Azure-Tenant-ID>"
      objects: |
        array:
          - |
            objectName: MONGODB-URI
            objectType: secret
          ...
  ```
- **ServiceAccount**: Annotate with the Workload Identity client ID:
  ```yaml
  apiVersion: v1
  kind: ServiceAccount
  metadata:
    name: admin-service-sa
    namespace: cogni-dispatch
    annotations:
      azure.workload.identity/client-id: "<Azure-Identity-Client-ID>"
  ```
- **Deployment Volume & Mount**: Mount the secrets store volume to the container:
  ```yaml
  spec:
    serviceAccountName: admin-service-sa
    containers:
      - name: admin-service
        volumeMounts:
          - name: secrets-store-inline
            mountPath: "/mnt/secrets"
            readOnly: true
    volumes:
      - name: secrets-store-inline
        csi:
          driver: secrets-store.csi.k8s.io
          readOnly: true
          volumeAttributes:
            secretProviderClass: "cogni-secrets-provider"
  ```

---

## 3. Enable AGIC on AKS
1. **Analyze Subnets**: Retrieve the subnets of the AKS VNet (`aks-vnet-xxxx`). Ensure the new subnet CIDR block does not overlap with existing subnets (e.g., `aks-subnet` or `aks-virtualkubelet`).
2. **Enable Addon**: Run the CLI command to enable standard AGIC:
   ```bash
   az aks enable-addons -n cogni-aks -g test-rg -a ingress-appgw --appgw-name cogni-appgw --appgw-subnet-cidr 10.225.0.0/24
   ```
   *This automatically provisions the Application Gateway (`cogni-appgw`) inside the VNet using the `/24` subnet CIDR.*

---

## 4. Helm Ingress Setup (Path-Based Routing)
To map external traffic to backend APIs and the frontend:

### values.yaml
Configure the class, annotations, and paths:
```yaml
ingress:
  enabled: true
  className: "azure-application-gateway"
  annotations:
    kubernetes.io/ingress.class: "azure/application-gateway" # Match legacy class name to trigger AGIC
  hosts:
    - paths: # Omit "host" key to allow direct IP/all-domain access
        - path: /api/
          pathType: Prefix
          backendName: cogni-backend-svc
          backendPort: 5000
        - path: /socket.io/
          pathType: Prefix
          backendName: cogni-backend-svc
          backendPort: 5000
        - path: /
          pathType: Prefix
          backendName: cogni-frontend-svc
          backendPort: 3000
```

### ingress.yaml Template
Render the Ingress rules dynamically:
```yaml
spec:
  {{- if .Values.ingress.className }}
  ingressClassName: {{ .Values.ingress.className }}
  {{- end }}
  rules:
    {{- range .Values.ingress.hosts }}
    {{- if .host }}
    - host: {{ .host | quote }}
      http:
    {{- else }}
    - http:
    {{- end }}
        paths:
          {{- range .paths }}
          - path: {{ .path }}
            pathType: {{ .pathType }}
            backend:
              service:
                name: {{ .backendName | default "cogni-frontend-svc" }}
                port:
                  number: {{ .backendPort | default 3000 }}
          {{- end }}
    {{- end }}
```

---

## 5. Helm Templating Best Practices
When using conditional blocks in multi-document templates (e.g. ServiceAccount followed by Deployment), avoid using trailing whitespace control hyphens (`{{- end -}}`) right after document separators (`---`). 
Trimming the trailing newline will result in invalid YAML like `---apiVersion: apps/v1`.
**Correct Pattern**:
```yaml
---
{{- end }}
apiVersion: apps/v1
```
