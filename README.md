# OpenShift, K8s and Tekton Pipelines on IBM Cloud

![IBM](./images/os-logo.jpg?raw=true "IBM")

[Red Hat OpenShift on IBM Cloud](https://cloud.ibm.com/docs/openshift?topic=openshift-why_openshift) is an extension of the IBM Cloud Kubernetes Service, where IBM manages OpenShift Container Platform for you. 

With Red Hat OpenShift on IBM Cloud developers have a fast and secure way to containerize and deploy enterprise workloads in Kubernetes clusters. OpenShift clusters build on Kubernetes container orchestration that offers consistency and flexibility for your development lifecycle operations.

This repository holds a series of tutorials that help you as a developer to become familiar with Continuous Integration / Continuous Delivery ( CI/CD ) pipelines, Git Webhooks, builds and deployments on Red Hat OpenShift 4.3 and K8S 1.16+ using Tekton Pipelines.


IBM Cloud offers a free Kubernetes 1.16 cluster for 1 month for testing purposes and a free of license fee Red Hat OpenShift 4.3.5 beta cluster. Also, you recieve by default a free IBM Cloud Image Registry with 512MB storage and 5GB Pull Trafic each month. 

## Prerequisites

* Register for an [IBM Cloud account](https://cloud.ibm.com/registration).
* Create a [free K8s cluster in IBM Cloud](https://cloud.ibm.com/docs/containers?topic=containers-getting-started#clusters_gs) 
* Create an [ OpenShift v4.3 cluster in IBM Cloud](https://cloud.ibm.com/docs/openshift?topic=openshift-openshift_tutorial) 
* Install and configure [IBM Cloud CLI](https://cloud.ibm.com/docs/cli?topic=cloud-cli-getting-started#overview)
* Connfigure the standard [IBM Cloud Container Registry](https://www.ibm.com/cloud/container-registry)
* Optional : download [Visual Studio Code IDE](https://code.visualstudio.com) for editing the NodeJs project


## Estimated time 

It should take you approximately 1-2 hours to provision the OpenShift / K8s clusters and to perform these tutorials.  

---

# Cloud-native CI/CD Pipeline using Tekton 

**Tutorials**

* [Create a Cloud-native CI/CD Pipeline on OpenShift 4.3](#1-cloud-native-cicd-pipeline-on-openshift)

* [Create a Cloud-native CI/CD Pipeline on Kubernetes 1.16+](#2-cloud-native-cicd-pipeline-on-kubernetes)

* [Create a WebHook connection from Git to a Tekton CI/CD Pipeline](#3-create-a-webhook-connection)


**Tekton Build Task Resources**

Using Tekton Pipelines involves building the application image inside the OpenShift / Kubernetes cluster. For this on OpenShift we use the standard S2I Build task from RedHat and for Kubernetes we use the Kaniko Build task. 

* [S2I Build Task from OpenShift Catalog](https://github.com/openshift/pipelines-catalog)

* [Kaniko Build Taks from Tekton Catalog](https://github.com/tektoncd/catalog/tree/master/kaniko)



**Repository Content**

* `nodejs           `       - is the context root of the NodeJs application, based on [Red Hat DO101 Demo application](https://github.com/RedHatTraining/DO101-apps/tree/master/weather)

* `tekton-openshift `       - contains the [OpenShift Pipeline](https://www.openshift.com/learn/topics/pipelines) implementation and yaml resources.

* `tekton-kubernetes`       - contains the [Kubernetes Pipeline](https://github.com/tektoncd/pipeline) implementation and yaml resources.

* `tekton-triggers  `       - contains the[Tekton Triggers](https://github.com/tektoncd/triggers) implementation for creating a Git WebHook to OpenShift / K8s.


---

## 1. Cloud native CI/CD Pipeline on OpenShift


![IBM](images/ocp2.png?raw=true "IBM") ![IBM](images/tekton2.jpg?raw=true "IBM")



**OpenShift Prerequisites**
----
 
- Install OpenShift Pipeline Operator 
- Create `env-ci`, `env-dev` and `env-stage` projects. In `env-ci` we will store the CI/CD pipeline and all pipeline resources. In `env-dev` and `env-stage` we will deploy the application via image promotion.
```
oc new-project env-ci
oc new-project env-dev
oc new-project env-stage
```  
- Create ImageStream `nodejs-tekton` for storing NodeJS Image in `env-dev` and `env-stage` projects.
```
oc create is nodejs-tekton -n env-dev
oc create is nodejs-tekton -n env-stage
``` 
- Allow `pipeline` ServiceAccount to make deploys on other `env-dev` and `env-stage` projects
```
oc adm policy add-scc-to-user privileged system:serviceaccount:env-ci:pipeline -n env-ci
oc adm policy add-scc-to-user privileged system:serviceaccount:env-ci:pipeline -n env-dev
oc adm policy add-scc-to-user privileged system:serviceaccount:env-ci:pipeline -n env-stage
oc adm policy add-role-to-user edit system:serviceaccount:env-ci:pipeline -n env-ci
oc adm policy add-role-to-user edit system:serviceaccount:env-ci:pipeline -n env-dev
oc adm policy add-role-to-user edit system:serviceaccount:env-ci:pipeline -n env-stage
```

**OpenShift Pipeline design**
----

![Pipeline Design](images/pipeline-design-openshift-simple.jpg?raw=true "Pipeline Design")

**Steps for creating the Continuous Integration - Continuous Delivery Pipeline**
----

0. Clone Git project
```
git clone https://github.com/vladsancira/nodejs-tekton.git
cd nodejs-tekton
```

1. Create Tekton Resources, Tasks and actual Pipeline
```
oc create -f ci-cd-pipeline/tekton-openshift/resources.yaml        -n env-ci
oc create -f ci-cd-pipeline/tekton-openshift/task-build-s2i.yaml   -n env-ci
oc create -f ci-cd-pipeline/tekton-openshift/task-deploy.yaml      -n env-ci
oc create -f ci-cd-pipeline/tekton-openshift/task-test.yaml        -n env-ci
oc create -f ci-cd-pipeline/tekton-openshift/task-promote.yaml     -n env-ci
oc create -f ci-cd-pipeline/tekton-openshift/pipeline.yaml         -n env-ci
```

2. Create application Secret which will be mounted as an environment variable inside NodeJs Pod
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



**Kubernetes Prerequisites**
----

- Clone Git project
```
git clone https://github.com/vladsancira/nodejs-tekton.git
cd nodejs-tekton
```

- Install Tekton Pipelines in default `tekton-pipelines` namespace
```
kubectl apply --filename https://storage.googleapis.com/tekton-releases/latest/release.yaml
kubectl get pods --namespace tekton-pipelines
```

- Create new `env-stage`,`env-dev` and `env-ci` namespaces. In `env-ci` we will store the CI/CD pipeline and all pipeline resources. In `env-dev` and `env-stage` namespaces, we will deploy the application via image promotion.
```
kubectl create namespace env-stage
kubectl create namespace env-dev
kubectl create namespace env-ci
```

- Create <API_KEY> for IBM Cloud Registry and export PullImage secret from `default` namespace. The <API_KEY> is used for pushing images into IBM Cloud Registry. When creating a K8s cluster, am IBM Cloud Registry pull secrect will be created in `default` namespace (for all regions ) that is used for pulling images from IBM Cloud Registry.
```
ibmcloud iam api-key-create MyKey -d "this is my API key" --file key_file.json
cat key_file.json | grep apikey

kubectl create secret generic ibm-cr-secret  -n env-ci --type="kubernetes.io/basic-auth" --from-literal=username=iamapikey --from-literal=password=<API_KEY>
kubectl annotate secret ibm-cr-secret  -n env-ci tekton.dev/docker-0=us.icr.io

kubectl get secret default-us-icr-io --export -o yaml > default-us-icr-io.yaml
kubectl create -f  default-us-icr-io.yaml -n env-dev
kubectl create -f  default-us-icr-io.yaml -n env-stage
```

- Create a new ServiceAccount to allow the Pipeline to run and deploy to `env-dev` namespace. We specify this ServiceAccount in pipeline definition. Also we will bind a custom Role to this ServiceAccount that will enable it to create/delete/edit/.. resources in `env-dev` and `env-stage` namespaces.

```
kubectl apply -f ci-cd-pipeline/tekton-kubernetes/service-account.yaml         -n env-ci
kubectl apply -f ci-cd-pipeline/tekton-kubernetes/service-account-binding.yaml -n env-dev
kubectl apply -f ci-cd-pipeline/tekton-kubernetes/service-account-binding.yaml -n env-stage
```

**Kubernetes Pipeline design**
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

The mechanism for triggering builds via WebHooks is the same and involves creating an EventListener and exposing that EventListener Service to outside. The EventListener handles external events and recieves a Git payload. This payload is parsed via the TriggerBinding resource for certain information, like `gitrevision` or `gitrepositoryurl`. These variables are then sent to TriggerTemplate resource that will call the Tekton Pipeline via a PipelineRun definition (with optional arguments).

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

1. Create a new ServiceAccount, Role and RoleBinding. In K8s this new ServiceAccount will be used for running the EventListener and starting the PipelineRun via the TriggerTemplate. The actual Pipeline will still run as the ServiceAccount defined in it.
```
kubectl apply  -f ci-cd-pipeline/tekton-triggers/webhook-service-account.yaml  -n env-ci
```

2. Create Pipeline's trigger_template, trigger_binding & event_listener<br>
( by default Event Listener service type is ClusterIP , but we set it to NodePort so it can be triggered from outside cluster )

```
kubectl apply -f ci-cd-pipeline/tekton-triggers/webhook-event-listener-kubernetes.yaml -n env-ci 
```

3. Get `el-nodejs-pipeline-listener` PORT and cluster EXTERNAL-IP
```
kubectl get svc el-nodejs-pipeline-listener -n env-ci
kubectl get nodes -o wide 
``` 

4. Add 'http://<CLUSTER_IP>>:<EVENT_LISTNER_PORT>' to GitHib as WebHook. Then perform a push.

![Webhook](./images/webhook-tekton.jpg?raw=true "Webhook") 


5. Open Tekton Dashboard  :  http://<CLUSTER_IP>>:32428/#/pipelineruns

![Webhook](./images/dashboard.jpg?raw=true "Webhook") 

---

# Summary 

In this tutorial , we created a Cloud-native CI/CD Tekton Pipeline for building and deploying a NodeJs application in an OpenShift 4.3 / Kubernetes 1.16+ cluster.