# NodeJs Application Image  for OpenShift 4.3+ & IBM Kubernetes 1.16+ with Tekton & Jenkins Pipelines


`nodejs-basic`           folder is the context root for the NodeJs application


`openshift-tekton`       folder contains the yamls for creating the Tekton Pipeline, Tasks and Resources in OpenShift 4.3

`kubernetes-tekton`      folder contains the yamls for creating the Tekton Pipeline, Tasks and Resources in Kubernetes 1.16

`openshift-jenkins`      folder contains the Jenkins pipeline implementation and yaml for creating the OpenShift BuildConfig with Jenkins Pipeline strategy.


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

6. create application secrets which will be mounted as ENV variable :
```
kubectl apply -f ci-cd-pipeline/kubernetes-tekton/secrets.yaml -n env-dev
```

7. execute pipeline via Pipeline Run and watch :
```
kubectl create -f ci-cd-pipeline/kubernetes-tekton/pipeline-run.yaml -n env-ci
kubectl get pipelinerun -n env-ci -w
```

8. check pods and logs :
```
kubectl get pods                             -n env-dev
kubectl logs liberty-app-76fcdc6759-pjxs7 -f -n env-dev
```

9. open browser with cluster IP and port 32426 :
get Cluster Public IP :
```
kubectl get nodes -o wide
```

http://<CLUSTER_IP>>:32426/



# IBM Kubernetes 1.16 -> Create Tekton WebHooks for Git

[https://github.com/tektoncd/triggers/blob/master/docs/triggerbindings.md](https://github.com/tektoncd/triggers/blob/master/docs/triggerbindings.md)
[https://github.com/tektoncd/triggers/blob/master/docs/triggertemplates.md](https://github.com/tektoncd/triggers/blob/master/docs/triggertemplates.md)
[https://github.com/tektoncd/triggers/blob/master/docs/eventlisteners.md](https://github.com/tektoncd/triggers/blob/master/docs/eventlisteners.md)

Example :
[https://github.com/tektoncd/triggers/tree/master/examples](https://github.com/tektoncd/triggers/tree/master/examples)


1. install Tekton Dashboard and triggers :
```
kubectl apply -f https://github.com/tektoncd/dashboard/releases/download/v0.5.3/tekton-dashboard-release.yaml
kubectl apply -f https://storage.googleapis.com/tekton-releases/triggers/latest/release.yaml
```

2. create ServiceAccount, Role and RoleBinding  : 
```
kubectl apply  -f ci-cd-pipeline/kubernetes-tekton/webhook-service-account.yaml  -n env-ci
```

3. create Pipeline's trigger_template, trigger_binding & event_listener :
! by default Event Listener service type is ClusterIP , but we set it to NodePort so it can be triggered from outside cluster !
```
kubectl apply -f ci-cd-pipeline/kubernetes-tekton/tekton-dashboard.yaml -n tekton-pipelines
kubectl apply -f ci-cd-pipeline/kubernetes-tekton/webhook-event-listener.yaml -n env-ci 
```

4. get el-nodejs-pipeline-listener PORT and cluster EXTERNAL-IP
```
kubectl get svc el-nodejs-pipeline-listener -n env-ci
kubectl get nodes -o wide 
``` 

5. add 'http://<CLUSTER_IP>>:<EVENT_LISTNER_PORT>' to GitHib as WebHook. Then perform a push.

![Webhook](./ci-cd-pipeline/webhook-tekton.jpg?raw=true "Webhook") 

6. open Tekton Dashboard  :  http://<CLUSTER_IP>>:32428/#/pipelineruns

![Webhook](./ci-cd-pipeline/dashboard.jpg?raw=true "Webhook") 



# OpenShift v4 -> Create application image using S2I (source to image) and deploy it 

OC commands:

1.  delete all resources
```
oc delete all -l build=nodejs-app
oc delete all -l app=nodejs-app
```

2.  create new s2i build config based on openshift/nodejs:10 and imagestream
```
git clone https://github.com/vladsancira/nodejs-tekton.git
cd nodejs-tekton
oc new-build openshift/nodejs:10 --name=nodejs-app --binary=true --strategy=source 
```

3.  create application image from srouce
```
oc start-build bc/nodejs-app --from-dir=./nodejs-basic --wait=true --follow=true
```

4.  create application based on imagestreamtag : nodejs-app:latest
```
oc new-app -i nodejs-app:latest
oc expose svc/nodejs-app
oc label dc/nodejs-app app.kubernetes.io/name=nodejs --overwrite
```

5.  set readiness and livness probes , and change deploy strategy to Recreate 

```
oc set probe dc/nodejs-app --liveness --get-url=http://:8080/ --initial-delay-seconds=60
oc patch dc/nodejs-app -p '{"spec":{"strategy":{"type":"Recreate"}}}'
```
FYI : a new deploy will start as DC has an deployconfig change trigger. To check triggers :
```
oc set triggers dc/nodejs-app
```

6. open application 
```
oc get route nodejs-app
```


# DEPRECATED : OpenShift v4.2 -> CI-CD with Jenkins Pipeline 

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

