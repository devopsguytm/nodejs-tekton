# OpenShift, K8s and Tekton on IBM Cloud

![IBM](./images/os-logo.jpg?raw=true "IBM")

[Red Hat OpenShift on IBM Cloud](https://cloud.ibm.com/docs/openshift?topic=openshift-why_openshift) is an extension of the IBM Cloud Kubernetes Service, where IBM manages OpenShift Container Platform for you. 

With Red Hat OpenShift on IBM Cloud developers have a fast and secure way to containerize and deploy enterprise workloads in Kubernetes clusters. OpenShift clusters build on Kubernetes container orchestration that offers consistency and flexibility for your development lifecycle operations.

This repository holds a series of tutorials that help you as a developer to become familiar with Continuous Integration / Continuous Delivery pipelines, Git webhooks, builds and deployments on Red Hat OpenShift 4.3 and K8S 1.16+ using Tekton Pipelines.

In order to run these tutorials, you need an [IBM Cloud account](https://cloud.ibm.com/registration).

IBM Cloud offers a free Kubernetes 1.16 cluster for 1 month for testing purposes and a free of license fee Red Hat OpenShift 4.3.5 beta cluster. Also, you recieve by default a free IBM Cloud Image Registry with 512MB storage and 5GB Pull Trafic each month. 

---

## Build & Deploy NodeJs Application using Tekton and Jenkins Pipeline 

**Tutorials**

* [Create a Cloud-native CI/CD Pipeline on OpenShift 4.3](#1-cloud-native-cicd-pipeline-on-openshift)

* [Create a Cloud-native CI/CD Pipeline on Kubernetes 1.16+](#2-cloud-native-cicd-pipeline-on-kubernetes)

* [Create a WebHook connection from Git to our CI/CD Pipeline](#3-create-a-webhook-connection)

* [OpenShift & S2I (Source to Image) - build and deploy a NodeJs application](#4-openshift-source-to-image)

* [Create a Jenkins CI/CD Pipeline on OpenShift 4.2](#5-deprecated--jenkins-cicd-pipeline-on-openshift)



**Resources**

* [S2I Build Task from OpenShift Catalog](https://github.com/openshift/pipelines-catalog)
* [S2I Builder Images Container Catalog](https://github.com/sclorg/?q=s2i)
* [Kaniko Build Taks from Tekton Catalog](https://github.com/tektoncd/catalog/tree/master/kaniko)
* [Red Hat Container Images Catalog](https://catalog.redhat.com/software/containers/search?p=1)
* [Tutorial : Create s2i Builder Image](https://www.openshift.com/blog/create-s2i-builder-image)


**Repository Content**

* `nodejs-basic     `       folder is the context root of the NodeJs application.

* `ci-cd-pipeline   `       folder contains pipeline implementation for different targets.

* `tekton-openshift `       folder contains the [OpenShift Pipelines](https://www.openshift.com/learn/topics/pipelines) implementation and yamls.

* `tekton-kubernetes`       folder contains the [Kubernetes Pipelines](https://github.com/tektoncd/pipeline) implementation and yaml.

* `tekton-triggers  `       folder contains the implementation for [Tekton Triggers](https://github.com/tektoncd/triggers) for creating a Git WebHook.

* `jenkins-openshift`       folder contains the Jenkins Pipeline implementation (Jenkinsfile) and yaml for creating the BuildConfig with pipeline strategy.

---

## 1. Cloud native CI/CD Pipeline on OpenShift


![IBM](images/ocp2.png?raw=true "IBM") ![IBM](images/tekton2.jpg?raw=true "IBM")



**Prerequisites**
----
 
- Install OpenShift Pipeline Operator
- Create `env-ci`, `env-dev` and `env-stage` Projects
```
oc new-project env-ci
oc new-project env-dev
oc new-project env-stage
```  
- Create ImageStream `nodejs-tekton` for storing NodeJS Image
```
oc create is nodejs-tekton -n env-dev
oc create is nodejs-tekton -n env-stage
``` 
- Allow `pipeline` ServiceAccount to make deploys on other Projects
```
oc adm policy add-scc-to-user privileged system:serviceaccount:env-ci:pipeline -n env-ci
oc adm policy add-scc-to-user privileged system:serviceaccount:env-ci:pipeline -n env-dev
oc adm policy add-scc-to-user privileged system:serviceaccount:env-ci:pipeline -n env-stage
oc adm policy add-role-to-user edit system:serviceaccount:env-ci:pipeline -n env-ci
oc adm policy add-role-to-user edit system:serviceaccount:env-ci:pipeline -n env-dev
oc adm policy add-role-to-user edit system:serviceaccount:env-ci:pipeline -n env-stage
```

**Pipeline design**
----

![Pipeline Design](images/pipeline-design-openshift-simple.jpg?raw=true "Pipeline Design")

**Steps for creating the Continuous Integration - Continuous Delivery Pipeline**
----

0. Clone Git project
```
git clone https://github.com/vladsancira/nodejs-tekton.git
cd nodejs-tekton
```

1. Create Tekton Resources , Tasks and Pipeline
```
oc create -f ci-cd-pipeline/tekton-openshift/resources.yaml        -n env-ci
oc create -f ci-cd-pipeline/tekton-openshift/task-build-s2i.yaml   -n env-ci
oc create -f ci-cd-pipeline/tekton-openshift/task-deploy.yaml      -n env-ci
oc create -f ci-cd-pipeline/tekton-openshift/task-test.yaml        -n env-ci
oc create -f ci-cd-pipeline/tekton-openshift/task-promote.yaml     -n env-ci
oc create -f ci-cd-pipeline/tekton-openshift/pipeline.yaml         -n env-ci
```

2. Create application Secret which will be mounted as an environment variable inside NodeJs Pod :
```
oc create -f ci-cd-pipeline/tekton-openshift/secrets.yaml   -n env-dev
oc create -f ci-cd-pipeline/tekton-openshift/secrets.yaml   -n env-stage
```

3. Execute Pipeline
```
tkn t ls -n env-ci
tkn p ls -n env-ci
tkn p start nodejs-pipeline -n env-ci
```

![Pipeline Run](./images/pipeline.jpg?raw=true "Pipeline Run")


---

## 2. Cloud native CI/CD Pipeline on Kubernetes

![IBM](./images/k8s.png?raw=true "IBM") ![IBM](images/tekton2.jpg?raw=true "IBM")



**Prerequisites**
----

- Clone Git project
```
git clone https://github.com/vladsancira/nodejs-tekton.git
cd nodejs-tekton
```

- Install Tekton Pipelines in default `tekton-pipelines` Namespace :
```
kubectl apply --filename https://storage.googleapis.com/tekton-releases/latest/release.yaml
kubectl get pods --namespace tekton-pipelines
```

- Create new `env-stage`,`env-dev` and `env-ci` Namespaces :
```
kubectl create namespace env-stage
kubectl create namespace env-dev
kubectl create namespace env-ci
```

- Create <API_KEY> for IBM Cloud Registry and export PullImage secret from `default` Namespace :
```
ibmcloud iam api-key-create MyKey -d "this is my API key" --file key_file.json
cat key_file.json | grep apikey

kubectl create secret generic ibm-cr-secret  -n env-ci --type="kubernetes.io/basic-auth" --from-literal=username=iamapikey --from-literal=password=<API_KEY>
kubectl annotate secret ibm-cr-secret  -n env-ci tekton.dev/docker-0=us.icr.io

kubectl get secret default-us-icr-io --export -o yaml > default-us-icr-io.yaml
kubectl create -f  default-us-icr-io.yaml -n env-dev
kubectl create -f  default-us-icr-io.yaml -n env-stage
```

- Create ServiceAccount to allow the Pipeline to run and deploy to `env-dev` Namespace :
```
kubectl apply -f ci-cd-pipeline/tekton-kubernetes/service-account.yaml         -n env-ci
kubectl apply -f ci-cd-pipeline/tekton-kubernetes/service-account-binding.yaml -n env-dev
kubectl apply -f ci-cd-pipeline/tekton-kubernetes/service-account-binding.yaml -n env-stage
```

**Pipeline design**
----

![Pipeline Design](images/pipeline-design-tekton-simple.jpg?raw=true "Pipeline Design")


**Steps for creating the Continuous Integration - Continuous Delivery Pipeline**
----

1. Create Tekton Resources , Taks and Pipeline
```
kubectl create -f ci-cd-pipeline/tekton-kubernetes/resources.yaml          -n env-ci
kubectl create -f ci-cd-pipeline/tekton-kubernetes/task-build-kaniko.yaml  -n env-ci
kubectl create -f ci-cd-pipeline/tekton-kubernetes/task-deploy.yaml        -n env-ci
kubectl create -f ci-cd-pipeline/tekton-kubernetes/task-test.yaml          -n env-ci
kubectl create -f ci-cd-pipeline/tekton-kubernetes/task-promote.yaml       -n env-ci
kubectl create -f ci-cd-pipeline/tekton-kubernetes/pipeline.yaml           -n env-ci
```

2. Create application Secret which will be mounted as an environment variable inside NodeJs Pod:
```
kubectl apply -f ci-cd-pipeline/tekton-kubernetes/secrets.yaml -n env-dev
kubectl apply -f ci-cd-pipeline/tekton-kubernetes/secrets.yaml -n env-stage
```

3. Execute Pipeline via PipelineRun and watch :
```
kubectl create -f ci-cd-pipeline/tekton-kubernetes/pipeline-run.yaml -n env-ci
kubectl get pipelinerun -n env-ci -w
```

4. Check Pods and logs :
```
kubectl get pods                            -n env-dev
kubectl get pods                            -n env-stage

kubectl logs nodejs-app-76fcdc6759-pjxs7 -f -n env-dev
```

5. Open Browser with cluster IP and port 32426 :
get Cluster Public IP :
```
kubectl get nodes -o wide
```

http://<CLUSTER_IP>>:32426/

---

## 3. Create a WebHook connection


In order to create a WebHook from Git to our Tekton Pipeline we need to install [TektonCD Triggers](https://github.com/tektoncd/triggers) in our K8s cluster. 
Triggers is a Kubernetes Custom Resource Defintion (CRD) controller that allows you to extract information from events payloads (a "trigger") to create Kubernetes resources.
More information can be found in the  [TektonCD Triggers Project](https://github.com/tektoncd/triggers). Also we can use Tekton Dashboard as a web console for viewing all Tekton Resources. 

On OpenShift 4.3 , [TektonCD Triggers](https://github.com/tektoncd/triggers) are already installed as part of the [OpenShift Pipelines Operator](https://www.openshift.com/learn/topics/pipelines),  in `openshift-pipelines` project (namespace), but Tekton Dashboard is not installed. Instead,  we can use the OpenShift Pipeline Web Console.

The mechanism for triggering builds via WebHooks is the same and involves creating an EventListener and exposing that EventListener Service to outside.

![Tekton Architecture](./images/webhook-architecture-tekton-simple.jpg?raw=true "Tekton Architecture")


**For OpenShift we need to**
----

* create Pipeline's trigger_template, trigger_binding & event_listener

```
oc create -f ci-cd-pipeline/tekton-triggers/webhook-event-listener-openshift.yaml -n env-ci 
```
* create a Route for the event_listener service
```
oc expose svc/el-nodejs-pipeline-listener -n env-ci
oc get route -n env-ci
```
*  add this route to out Git WebHook then perfom a push.
* new PipelineRun will be triggered automatically and visible in the Pipelines Console from `ci-env` Project


![Webhook](./images/openshift-pipelines-run.png?raw=true "Webhook") 



**For Kubernetes we need to**  
----

0. Install Tekton Dashboard and Tekton Triggers
```
kubectl apply -f https://github.com/tektoncd/dashboard/releases/download/v0.5.3/tekton-dashboard-release.yaml
kubectl apply -f https://storage.googleapis.com/tekton-releases/triggers/latest/release.yaml
kubectl apply -f ci-cd-pipeline/tekton-triggers/tekton-dashboard.yaml -n tekton-pipelines
```

1. Create ServiceAccount, Role and RoleBinding 
```
kubectl apply  -f ci-cd-pipeline/tekton-triggers/webhook-service-account.yaml  -n env-ci
```

2. Create Pipeline's trigger_template, trigger_binding & event_listener<br>
( by default Event Listener service type is ClusterIP , but we set it to NodePort so it can be triggered from outside cluster )

```
kubectl apply -f ci-cd-pipeline/tekton-triggers/webhook-event-listener-kubernetes.yaml -n env-ci 
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

## 4. OpenShift source to image

![IBM](images/ocp2.png?raw=true "IBM") 

**Steps for building and deploying the application using s2i**

1.  Create a new s2i BuildConfig based on `nodeshift/centos7-s2i-nodejs:latest`
```
git clone https://github.com/vladsancira/nodejs-tekton.git
cd nodejs-tekton
oc new-build nodeshift/centos7-s2i-nodejs:latest --name=nodejs-app --binary=true --strategy=source 
```

2.  Start the build by passing the current folder as input for the new BuildConfig
```
oc start-build bc/nodejs-app --from-dir=./nodejs --wait=true --follow=true
```

3.  Create a new Application based on ImageStreamTag `nodejs-app:latest` from previous step. Then expose an external Route 
```
oc new-app -i nodejs-app:latest
oc expose svc/nodejs-app
oc label dc/nodejs-app app.kubernetes.io/name=nodejs --overwrite
```

4.  Set Readiness, Livness probes  and change deploy strategy to Recreate
```
oc set probe dc/nodejs-app --liveness --get-url=http://:8080/ --initial-delay-seconds=60
oc patch dc/nodejs-app -p '{"spec":{"strategy":{"type":"Recreate"}}}'
oc create -f ci-cd-pipeline/tekton-openshift/secrets.yaml
oc set env dc/nodejs-app --from secret/owm-secret-api
oc set env dc/nodejs-app --from secret/authors-secret-api
```
FYI : a new deploy will start as DeploymentConfig has a change trigger activated by default. To check triggers :
```
oc set triggers dc/nodejs-app
```

5. Open application
```
oc get route nodejs-app
```

6.  Delete all resources using Labels
```
oc delete all -l build=nodejs-app
oc delete all -l app=nodejs-app
```

---

## 5. DEPRECATED : Jenkins CI/CD Pipeline on OpenShift


![IBM](images/ocp2.png?raw=true "IBM") ![IBM](images/jenkins2.jpg?raw=true "IBM")


**You can still use the Jenkinsfile inside a Jenkins container.**

**Prerequisites**
----

- Create new CI project `env-ci` and DEV project `env-dev`
```
oc new-project env-ci
oc new-project env-dev
```
- Deploy Jenkins template in Project `env-ci`
- Allow `jenkins` ServiceAccount to make deploys on other projects
```
oc policy add-role-to-user edit system:serviceaccount:env-ci:jenkins -n env-dev
```

**Steps for creating the Continuous Integration - Continuous Delivery Pipeline**
----

1. Create BuildConifg resource in OpenShift : 
```
oc create -f  ci-cd-pipeline/jenkins-openshift/nodejs-ci-cd-pipeline.yaml  -n env-ci
```

2. Create secret for GitHub integration : 
```
oc create secret generic githubkey --from-literal=WebHookSecretKey=5f345f345c345 -n env-ci
```

3. Add webkook to GitLab from Settings -> WebHook

4. Start pipeline build or push files into GitLab repo : 
```
oc start-build bc/nodejs-pipeline-ci-cd -n env-ci
```

![Pipeline Run](./images/jenkins.jpg?raw=true "Pipeline Run")


4. Get Route for nodejs-jenkins : 
```
oc get routes/nodejs-jenkins -n env-dev
oc get routes/nodejs-jenkins -n env-stage
```