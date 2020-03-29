# NodeJs Application Image  for OpenShift 4.3+ & IBM Kubernetes 1.16+ with Tekton & Jenkins Pipelines


`nodejs-basic`           folder is the context root for the image where application is implemented

`openshift-jenkins`      folder contains the Jenkins pipeline implementation and yaml for creating the build config with pipeline strategy.

`openshift-tekton`       folder contains the OpenShift pipeline implementation and yaml for creating the build config with Tekton pipeline strategy.

`kubernetes-tekton`      folder contains the Kubernetes pipeline implementation and yaml for creating the build config with Tekton pipeline strategy.


# OpenShift v4.3+ -> CI-CD with OpenShift Pipelines 

![Pipeline Run](./ci-cd-pipeline/pipeline.jpg?raw=true "Pipeline Run")

Prerequisites : 
- Install OpenShift Pipeline Operator
- Allow pipeline SA to make deploys on other projects :
```
oc new-project env-ci
oc new-project env-dev

oc create serviceaccount pipeline -n env-ci

oc adm policy add-scc-to-user privileged system:serviceaccount:env-ci:pipeline -n env-ci
oc adm policy add-scc-to-user privileged system:serviceaccount:env-ci:pipeline -n env-dev

oc adm policy add-role-to-user edit system:serviceaccount:env-ci:pipeline -n env-ci
oc adm policy add-role-to-user edit system:serviceaccount:env-ci:pipeline -n env-dev
```
- Create Image Stream : nodejs-tekton 


OC commands:

1. create Tekton CRDs :
```
oc create -f ci-cd-pipeline/openshift-tekton/resources.yaml        -n env-ci
oc create -f ci-cd-pipeline/openshift-tekton/task-build-s2i.yaml   -n env-ci
oc create -f ci-cd-pipeline/openshift-tekton/task-deploy.yaml      -n env-ci
oc create -f ci-cd-pipeline/openshift-tekton/pipeline.yaml         -n env-ci

oc create -f ci-cd-pipeline/openshift-tekton/secrets.yaml          -n env-dev
```
2. execute pipeline :
```
tkn t ls -n env-ci
tkn p ls -n env-ci
tkn p start nodejs-pipeline -n env-ci
```

3. check application  :

![Pipeline Run](./ci-cd-pipeline/deployment.jpg?raw=true "Pipeline Run")





# IBM Kubernetes 1.16+ -> CI-CD with Tekton Pipeline 


![Tekton Architecture](./ci-cd-pipeline/architecture.jpg?raw=true "Tekton Architecture")

kubektl commands:

1. install Tekton pipelines :
```
kubectl apply --filename https://storage.googleapis.com/tekton-releases/latest/release.yaml
kubectl get pods --namespace tekton-pipelines
```

2. create new env-dev and env-ci namespaces :
```
kubectl create namespace env-dev
kubectl create namespace env-ci
```

3. create Tekton CRDs :
```
kubectl create -f ci-cd-pipeline/kubernetes-tekton/resources.yaml          -n env-ci
kubectl create -f ci-cd-pipeline/kubernetes-tekton/task-build-kaniko.yaml  -n env-ci
kubectl create -f ci-cd-pipeline/kubernetes-tekton/task-deploy.yaml        -n env-ci
kubectl create -f ci-cd-pipeline/kubernetes-tekton/pipeline.yaml           -n env-ci
```

4. create <API_KEY> for IBM Cloud Registry and export PullImage secret from default namespace :
```
ibmcloud iam api-key-create MyKey -d "this is my API key" --file key_file.json
cat key_file.json | grep apikey

kubectl create secret generic ibm-cr-secret  -n env-ci --type="kubernetes.io/basic-auth" --from-literal=username=iamapikey --from-literal=password=<API_KEY>
kubectl annotate secret ibm-cr-secret  -n env-ci tekton.dev/docker-0=us.icr.io

kubectl get secret default-us-icr-io --export -o yaml > default-us-icr-io.yaml
kubectl create -f  default-us-icr-io.yaml -n env-dev
```

5. create service account to allow pipeline run and deploy to env-dev namespace :
```
kubectl apply -f ci-cd-pipeline/kubernetes-tekton/service-account.yaml         -n env-ci
kubectl apply -f ci-cd-pipeline/kubernetes-tekton/service-account-binding.yaml -n env-dev
```

6. execute pipeline via Pipeline Run and watch :
```
kubectl create -f ci-cd-pipeline/kubernetes-tekton/pipeline-run.yaml -n env-ci
kubectl get pipelinerun -n env-ci -w
```

7. check pods and logs :
```
kubectl get pods                             -n env-dev
kubectl logs liberty-app-76fcdc6759-pjxs7 -f -n env-dev
```

8. open browser with cluster IP and port 32426 :
get Cluster Public IP :
```
kubectl get nodes -o wide
```

http://<CLUSTER_IP>>:32426/

9. install Tekton Dashboard :
```
kubectl apply -f https://github.com/tektoncd/dashboard/releases/download/v0.5.3/tekton-dashboard-release.yaml
kubectl apply -f ci-cd-pipeline/kubernetes-tekton/tekton-dashboard.yaml -n tekton-pipelines
```

http://<CLUSTER_IP>>:32428/#/pipelineruns



# OpenShift v4.2+ -> CI-CD with Jenkins Pipeline 

Prerequisites : 
- Create new CI project : env-ci and DEV project : env-dev
- Deploy OCP Jenkins template in project : env-ci
- Allow jenkins SA to make deploys on other projects

OC commands:

1. create projects :
```
oc new-project env-ci
oc new-project env-dev
oc policy add-role-to-user edit system:serviceaccount:env-ci:jenkins -n env-dev
```

2. create build configuration resurce in OpenShift : 
```
oc create -f  ci-cd-pipeline/openshift-jenkins/nodejs-ci-cd-pipeline.yaml  -n env-ci
```

3. create secret for GitHub integration : 
```
oc create secret generic githubkey --from-literal=WebHookSecretKey=5f345f345c345 -n env-ci
```

4. add webkook to GitLab from Settings -> WebHook : 

5. start pipeline build or push files into GitLab repo : 
```
oc start-build bc/nodejs-pipeline-ci-cd -n env-ci
```

![Pipeline Run](./ci-cd-pipeline/jenkins.jpg?raw=true "Pipeline Run")


6. get routes for simple-nodejs-app : 
```
oc get routes/nodejs-jenkins -n env-dev
```

