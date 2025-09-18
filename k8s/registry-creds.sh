_USER=user
_PASSWORD=$(openssl rand -hex 16)
_REGISTRY_SERVER=registry.resflow.ru

echo $_REGISTRY_SERVER $_USER $_PASSWORD

docker run --rm --entrypoint htpasswd registry:2.6.2 -Bbn $_USER $_PASSWORD > ./registry-htpasswd
kubectl create secret generic auth-secret --from-file=./registry-htpasswd -n registry
kubectl create secret docker-registry regcred -n resflow --docker-server=$_REGISTRY_SERVER --docker-username=$_USER --docker-password=$_PASSWORD
kubectl create secret docker-registry regcred -n prefect --docker-server=$_REGISTRY_SERVER --docker-username=$_USER --docker-password=$_PASSWORD

