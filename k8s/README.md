# Kubernetes Deployment Guide for ECO-SYSTEM ERP

This directory contains production-ready Kubernetes manifests for deploying the full ERP stack (PostgreSQL 17, Go Gin Backend, and React Vite Frontend).

---

## 1. Quick Deploy with `kubectl` / Kustomize

To deploy all components to your Kubernetes cluster:

```bash
kubectl apply -k k8s/
```

Or apply the manifests individually:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
```

---

## 2. Check Deployment Status

```bash
# Check all resources in the erp-system namespace
kubectl get all -n erp-system

# View running pods
kubectl get pods -n erp-system -w

# Check logs
kubectl logs -n erp-system -l app=erp-backend -f
kubectl logs -n erp-system -l app=erp-frontend -f
```

---

## 3. Port Forwarding for Local Testing

If you are using Minikube or Docker Desktop Kubernetes:

```bash
# Access frontend on http://localhost:4200
kubectl port-forward -n erp-system svc/frontend 4200:80

# Access backend on http://localhost:8080
kubectl port-forward -n erp-system svc/backend 8080:8080
```

---

## 4. Components Included

| Component | Resource Type | Description |
|-----------|---------------|-------------|
| **Namespace** | `Namespace` | Isolated `erp-system` environment |
| **Postgres** | `Deployment` + `PVC` + `Service` | PostgreSQL 17 database with 10GB persistent storage |
| **Backend** | `Deployment` + `ConfigMap` + `Secret` + `Service` | Go Gin REST API (2 replicas, health probes) |
| **Frontend** | `Deployment` + `Service` | React 18 + Vite static build served via Nginx (2 replicas) |
| **Ingress** | `Ingress` | Nginx Ingress routing `/api` to backend and `/` to frontend |
