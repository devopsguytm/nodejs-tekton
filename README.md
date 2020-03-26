# NodeJs Application Image  for OpenShift 4.X & IBM Kubernetes with Tekton Pipelines


`nodejs-basic`           folder is the context root for the image where application is implemented

`openshift-jenkins`      folder contains the Jenkins pipeline implementation and yaml for creating the build config with pipeline strategy.
`openshift-tekton`       folder contains the OpenShift pipeline implementation and yaml for creating the build config with Tekton pipeline strategy.
`kubernetes-tekton`      folder contains the Kubernetes pipeline implementation and yaml for creating the build config with Tekton pipeline strategy.


# OpenShift v4.3 -> CI-CD with OpenShift Pipelines 

Prerequisites : 
- Install OpenShift Pipeline Operator
- Allow pipeline SA to make deploys on other projects :
```
oc create serviceaccount pipeline
oc adm policy add-scc-to-user privileged -z pipeline
oc adm policy add-role-to-user edit -z pipeline
```
- Create Image Stream : nodejs-tekton 

OC commands:

1. create Tekton CRDs :
```
oc create -f ci-cd-pipeline/openshift-tekton/resources.yaml
oc create -f ci-cd-pipeline/openshift-tekton/task-build-s2i.yaml
oc create -f ci-cd-pipeline/openshift-tekton/task-test.yaml
oc create -f ci-cd-pipeline/openshift-tekton/task-deploy.yaml
oc create -f ci-cd-pipeline/openshift-tekton/pipeline.yaml
```
2. execute pipeline :
```
tkn t ls
tkn p ls
tkn start nodejs-pipeline
```


# OpenShift v4.2 -> CI-CD with Jenkins Pipeline 

Prerequisites : 
- Installed Jenkins template
- Allow jenkins SA to make deploys on other projects :
```
oc policy add-role-to-user edit system:serviceaccount:default:jenkins -n ci-development
```

OC commands:

1. create project :
```
oc new-project ci-development
```

2. create build configuration resurce in OpenShift : 
```
oc create -f  ci-cd-pipeline/openshift-jenkins/nodejs-ci-cd-pipeline.yaml 
```

3. create secret for GitLab integration : 
```
oc create secret generic gitlabkey --from-literal=WebHookSecretKey=5f345f345c345
```

4. add webkook to GitLab from Settings->Integration : 

https://api.us-west-1.starter.openshift-online.com:6443/apis/build.openshift.io/v1/namespaces/ci-development/buildconfigs/nodejs-pipeline-ci-cd/webhooks/5f345f345c345/gitlab

5. start pipeline build or push files into GitLab repo : 
```
oc start-build bc/nodejs-pipeline-ci-cd
```

6. get routes for simple-nodejs-app : 
```
oc get routes/simple-nodejs-app
```

7. open host in browser : 

[http://simple-nodejs-app-ci-development.apps.us-west-1.starter.openshift-online.com](http://simple-nodejs-app-ci-development.apps.us-west-1.starter.openshift-online.com)


# IBM Kubernetes 1.16 -> CI-CD with Tekton Pipeline 

kubektl commands:

1. install Tekton pipelines :
```
kubectl apply --filename https://storage.googleapis.com/tekton-releases/latest/release.yaml
kubectl get pods --namespace tekton-pipelines
```

2. create tekton CRD :
```
kubectl create -f ci-cd-pipeline/kubernetes-tekton/resources.yaml
kubectl create -f ci-cd-pipeline/kubernetes-tekton/task-build-kaniko.yaml
kubectl create -f ci-cd-pipeline/kubernetes-tekton/task-deploy.yaml
kubectl create -f ci-cd-pipeline/kubernetes-tekton/pipeline.yaml
```

3. create API key for IBM Cloud Container Registry:
```
ibmcloud iam api-key-create MyKey -d "this is my API key" --file key_file.json
cat key_file.json | grep apikey

kubectl create secret generic ibm-cr-secret --type="kubernetes.io/basic-auth" --from-literal=username=iamapikey --from-literal=password=`cat key_file.json | grep apikey`
kubectl annotate secret ibm-cr-secret tekton.dev/docker-0=us.icr.io
```

4. create / update service account to allow pipeline run :
```
kubectl apply -f ci-cd-pipeline/kubernetes-tekton/service-account.yaml
```

5. execute pipeline :
```
tkn t ls
tkn p ls
tkn start nodejs-pipeline
```

6. install Tekton Dashboard :
```
kubectl apply -f https://github.com/tektoncd/dashboard/releases/download/v0.5.3/tekton-dashboard-release.yaml
kubectl apply -f ci-cd-pipeline/kubernetes-tekton/tekton-dashboard.yaml
```

7. open browser with cluster IP and port 32426 :
get Cluster Public IP :
```
kubectl get nodes -o wide
```

http://<CLUSTER_IP>>:32426/

http://<CLUSTER_IP>>:32428/#/pipelineruns



