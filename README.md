# OpenShift and K8S on IBM Cloud with Tekton and Jenkins

![IBM](./images/os-logo.jpg?raw=true "IBM")

[Red Hat OpenShift on IBM Cloud](https://cloud.ibm.com/docs/openshift?topic=openshift-why_openshift) is an extension of the IBM Cloud Kubernetes Service, where IBM manages OpenShift Container Platform for you. 

With Red Hat OpenShift on IBM Cloud developers have a fast and secure way to containerize and deploy enterprise workloads in Kubernetes clusters. OpenShift clusters build on Kubernetes container orchestration that offers consistency and flexibility for your development lifecycle operations.

This repository holds a series of workshops that help you as a developer to become familiar with Red Hat OpenShift, how it can be deployed on the IBM Cloud, and how to deploy applications on and with OpenShift.

In order to run these workshops, you need an [IBM Cloud account](https://cloud.ibm.com/registration).

---

## Deploy NodeJs Application using Tekton and Jenkins Pipeline 

**Content**

* `nodejs-basic`            folder is the context root for the image where application is implemented.

* `ci-cd-pipeline`          folder contains pipelines implementation for different targets.

* `openshift-jenkins`       folder contains the Jenkins pipeline implementation and yaml for creating the build config with pipeline strategy.

* `openshift-tekton`        folder contains the OpenShift pipeline implementation and yaml for creating the build config with Tekton pipeline strategy.

* `kubernetes-tekton`       folder contains the Kubernetes pipeline implementation and yaml for creating the build config with Tekton pipeline strategy.

---

![IBM](images/ocp2.png?raw=true "IBM") ![IBM](images/tekton2.jpg?raw=true "IBM")

## Continuous Integration - Continuous Delivery with Tekton Pipelines 

**Prerequisites**
 
- Install OpenShift Pipeline Operator
- Create CI and DEV Projects
```
oc new-project env-ci
oc new-project env-dev
```  
- Create Image Stream `nodejs-tekton` for storing NodeJS image
```
oc create is nodejs-tekton -n env-dev
``` 
- Allow pipeline SA to make deploys on other projects
```
oc create serviceaccount pipeline -n env-ci
oc adm policy add-scc-to-user privileged system:serviceaccount:env-ci:pipeline -n env-ci
oc adm policy add-scc-to-user privileged system:serviceaccount:env-ci:pipeline -n env-dev
oc adm policy add-role-to-user edit system:serviceaccount:env-ci:pipeline -n env-ci
oc adm policy add-role-to-user edit system:serviceaccount:env-ci:pipeline -n env-dev
```

**Steps for creating the CI-CD pipeline**

0. clone git project
```
git clone https://github.com/vladsancira/nodejs-tekton.git
cd nodejs-tekton
```

1. create Tekton resources , taks and pipeline
```
oc create -f ci-cd-pipeline/openshift-tekton/resources.yaml        -n env-ci
oc create -f ci-cd-pipeline/openshift-tekton/task-build-s2i.yaml   -n env-ci
oc create -f ci-cd-pipeline/openshift-tekton/task-deploy.yaml      -n env-ci
oc create -f ci-cd-pipeline/openshift-tekton/pipeline.yaml         -n env-ci
```

2. create application secrets which will be mounted as ENV variable :
```
oc create -f ci-cd-pipeline/openshift-tekton/secrets.yaml   -n env-dev
```

3. execute pipeline
```
tkn t ls -n env-ci
tkn p ls -n env-ci
tkn p start nodejs-pipeline -n env-ci
```

![Pipeline Run](./images/pipeline.jpg?raw=true "Pipeline Run")


---

![IBM](./images/k8s.png?raw=true "IBM") ![IBM](images/tekton2.jpg?raw=true "IBM")
## Continuous Integration - Continuous Delivery with Tekton Pipelines 

**Prerequisites**

- Clone git project
```
git clone https://github.com/vladsancira/nodejs-tekton.git
cd nodejs-tekton
```

- Install Tekton pipelines in default `tekton-pipelines` namespace :
```
kubectl apply --filename https://storage.googleapis.com/tekton-releases/latest/release.yaml
kubectl get pods --namespace tekton-pipelines
```

- Create new `env-dev` and `env-ci` namespaces :
```
kubectl create namespace env-dev
kubectl create namespace env-ci
```

- Create <API_KEY> for IBM Cloud Registry and export PullImage secret from `default` namespace :
```
ibmcloud iam api-key-create MyKey -d "this is my API key" --file key_file.json
cat key_file.json | grep apikey

kubectl create secret generic ibm-cr-secret  -n env-ci --type="kubernetes.io/basic-auth" --from-literal=username=iamapikey --from-literal=password=<API_KEY>
kubectl annotate secret ibm-cr-secret  -n env-ci tekton.dev/docker-0=us.icr.io

kubectl get secret default-us-icr-io --export -o yaml > default-us-icr-io.yaml
kubectl create -f  default-us-icr-io.yaml -n env-dev
```

- Create Service Account to allow pipeline to run and deploy to `env-dev` namespace :
```
kubectl apply -f ci-cd-pipeline/kubernetes-tekton/service-account.yaml         -n env-ci
kubectl apply -f ci-cd-pipeline/kubernetes-tekton/service-account-binding.yaml -n env-dev
```

**Steps for creating the CI-CD pipeline**


1. create Tekton resources , taks and pipeline
```
kubectl create -f ci-cd-pipeline/kubernetes-tekton/resources.yaml          -n env-ci
kubectl create -f ci-cd-pipeline/kubernetes-tekton/task-build-kaniko.yaml  -n env-ci
kubectl create -f ci-cd-pipeline/kubernetes-tekton/task-deploy.yaml        -n env-ci
kubectl create -f ci-cd-pipeline/kubernetes-tekton/pipeline.yaml           -n env-ci
```

2. create application secrets which will be mounted as ENV variable :
```
kubectl apply -f ci-cd-pipeline/kubernetes-tekton/secrets.yaml -n env-dev
```

3. execute pipeline via Pipeline Run and watch :
```
kubectl create -f ci-cd-pipeline/kubernetes-tekton/pipeline-run.yaml -n env-ci
kubectl get pipelinerun -n env-ci -w
```

4. check pods and logs :
```
kubectl get pods                             -n env-dev
kubectl logs liberty-app-76fcdc6759-pjxs7 -f -n env-dev
```

5. open browser with cluster IP and port 32426 :
get Cluster Public IP :
```
kubectl get nodes -o wide
```

http://<CLUSTER_IP>>:32426/

---

**Create Tekton Pipeline WebHooks for Git - Architecture**


![Tekton Architecture](./images/architecture.jpg?raw=true "Tekton Architecture")

[https://github.com/tektoncd/triggers/blob/master/docs/triggerbindings.md](https://github.com/tektoncd/triggers/blob/master/docs/triggerbindings.md)<br>
[https://github.com/tektoncd/triggers/blob/master/docs/triggertemplates.md](https://github.com/tektoncd/triggers/blob/master/docs/triggertemplates.md)<br>
[https://github.com/tektoncd/triggers/blob/master/docs/eventlisteners.md](https://github.com/tektoncd/triggers/blob/master/docs/eventlisteners.md)<br>


**Prerequisites**

- Install Tekton Dashboard and Tekton Triggers
```
kubectl apply -f https://github.com/tektoncd/dashboard/releases/download/v0.5.3/tekton-dashboard-release.yaml
kubectl apply -f https://storage.googleapis.com/tekton-releases/triggers/latest/release.yaml
kubectl apply -f ci-cd-pipeline/kubernetes-tekton/tekton-dashboard.yaml -n tekton-pipelines
```

**Steps for creating the WebHook**

1. Create ServiceAccount, Role and RoleBinding 
```
kubectl apply  -f ci-cd-pipeline/kubernetes-tekton/webhook-service-account.yaml  -n env-ci
```

2. Create Pipeline's trigger_template, trigger_binding & event_listener<br>
**by default Event Listener service type is ClusterIP , but we set it to NodePort so it can be triggered from outside cluster**

```
kubectl apply -f ci-cd-pipeline/kubernetes-tekton/webhook-event-listener.yaml -n env-ci 
```

3. Get el-nodejs-pipeline-listener PORT and cluster EXTERNAL-IP
```
kubectl get svc el-nodejs-pipeline-listener -n env-ci
kubectl get nodes -o wide 
``` 

4. Add 'http://<CLUSTER_IP>>:<EVENT_LISTNER_PORT>' to GitHib as WebHook. Then perform a push.

![Webhook](./images/webhook-tekton.jpg?raw=true "Webhook") 


5. Open Tekton Dashboard  :  http://<CLUSTER_IP>>:32428/#/pipelineruns

![Webhook](./images/dashboard.jpg?raw=true "Webhook") 

---

![IBM](images/ocp2.png?raw=true "IBM") 
## Create application image using S2I (source to image) and deploy it 

**Steps for creating the Pipeline and WebHook**

1.  Delete all resources
```
oc delete all -l build=nodejs-app
oc delete all -l app=nodejs-app
```

2.  Create new s2i build config based on openshift/nodejs:10 and imagestream
```
git clone https://github.com/vladsancira/nodejs-tekton.git
cd nodejs-tekton
oc new-build openshift/nodejs:10 --name=nodejs-app --binary=true --strategy=source 
```

3.  Create application image from srouce
```
oc start-build bc/nodejs-app --from-dir=./nodejs-basic --wait=true --follow=true
```

4.  Create application based on imagestreamtag : nodejs-app:latest
```
oc new-app -i nodejs-app:latest
oc expose svc/nodejs-app
oc label dc/nodejs-app app.kubernetes.io/name=nodejs --overwrite
```

5.  Set readiness and livness probes , and change deploy strategy to Recreate 

```
oc set probe dc/nodejs-app --liveness --get-url=http://:8080/ --initial-delay-seconds=60
oc patch dc/nodejs-app -p '{"spec":{"strategy":{"type":"Recreate"}}}'
```
FYI : a new deploy will start as DC has an deployconfig change trigger. To check triggers :
```
oc set triggers dc/nodejs-app
```

6. Open application
```
oc get route nodejs-app
```

---

![IBM](images/ocp2.png?raw=true "IBM") ![IBM](images/jenkins2.jpg?raw=true "IBM")
## DEPRECATED : Continuous Integration - Continuous Delivery with Jenkins Pipelines 

**Prerequisites**

- Create new CI project `env-ci` and DEV project `env-dev`
```
oc new-project env-ci
oc new-project env-dev
```
- Deploy OCP Jenkins template in project `env-ci`
- Allow jenkins SA to make deploys on other projects
```
oc policy add-role-to-user edit system:serviceaccount:env-ci:jenkins -n env-dev
```

**Steps**

1. create BuildConifg resource in OpenShift : 
```
oc create -f  ci-cd-pipeline/openshift-jenkins/nodejs-ci-cd-pipeline.yaml  -n env-ci
```

2. create secret for GitHub integration : 
```
oc create secret generic githubkey --from-literal=WebHookSecretKey=5f345f345c345 -n env-ci
```

3. add webkook to GitLab from Settings -> WebHook : 

4. start pipeline build or push files into GitLab repo : 
```
oc start-build bc/nodejs-pipeline-ci-cd -n env-ci
```

![Pipeline Run](./images/jenkins.jpg?raw=true "Pipeline Run")


4. get routes for simple-nodejs-app : 
```
oc get routes/nodejs-jenkins -n env-dev
```