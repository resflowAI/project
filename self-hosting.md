# Self-hosting

## Описание

Основные микросервисы поднимаются в Kubernetes.
Микросервис ML-inference для упрощения поднимается вне кластера, на хосте в контейнере.
Рекомендую использовать [microk8s](https://microk8s.io/docs), но можно использовать любой другой дистрибутив k8s,
однако нормальная работа не гарантируется.

## Требования

- Минимально-рекомендуемые требования к VM под развертывание:

  - 4 CPU
  - 8Gb RAM
  - 120Gb SSD
  - CUDA-совместимое GPU с 8Gb VRAM

- Требуемые навыки:

  - Минимальное умение администрирования *Nix-ов
  - Знакомство с концепциями Kubernetes
  - *Nix-машина с установленными `ansible`, `kubectl`, `helm`, `helmfile`

## Пошаговая инструкцияя

1. **Развертывание microk8s**
    - Рекомендую воспользоваться ansible playbook в `ansible/`
    - Или разверните вручную по [документации](https://microk8s.io/docs)

2. **Создание секретов для container registry**
    - Запустите скрипт `k8s/registry-creds.sh`

3. **Подготовка для oauth2-proxy**
    - Рекомендую закомментировать этот чарт в `charts/helmfile.yaml` и приступить к следующему пункту,
    а также закомментировать аннотации ingress-а `nginx.ingress.kubernetes.io/{auth-url,auth-signin}` в `charts/prefect-server.yaml`

    - Если все-таки вы хотите поднять oauth2-proxy для закрытия сервисов без собственной авторизации - продолжаем
    - Создайте организацию в Github
    - Создайте OAuth-приложение в настройках организации
    - Создайте секрет
        ```yaml
        apiVersion: v1
        kind: Secret
        metadata:
        name: oauth2-proxy-secrets
        namespace: oauth2-proxy
        type: Opaque
        data:
        client-id: <client-id base64>
        client-secret: <client-secret base64>
        cookie-secret: <cookie-secret base64> # python -c 'import os,base64; print(base64.b64encode(os.urandom(16)).decode("ascii"))'
        ```

4. **Подготовка certbot + доменных имен для ingres**

    - Вы можете пропустить этот шаг,
    ingress-ы не смогут подняться, cert-manager не сможет выпустить сертификаты,
    но это не помешает сервисам подняться и ходить в них in-cluster

    - Если вы хотите поднять ingress-ы для своих доменных имен - продолжаем
    - Приобретите домен, заведите:
        - A-запись на сам домен
        - `+`
        - Wildcard A-запись под все поддомены
        - `или`
        - A- или CNAME- записи под каждый поддомен
    - Замените во всех конфигурационных файлах `*.resflow.ru` на ваши домены
    - В `k8s/cert-manager.yaml` в `spec.acme.email` укажите свою почту

5. **Развертывание ML-inference**

    - Создайте директорию `ml/bin`
    - Переместите в директорию `ml/bin` файлы с весами моделей
        - Скачайте веса тут - https://disk.yandex.ru/d/XTjMWo9yja15nQ
    - `pushd ml && docker compose up -d --build`
    - Поправьте адрес хоста с ML-inference в:
        - `api/bi/smart_search.py:20`
        - `api/ml_api/main.py:48`

6. **Подготовка репозитория для CI**

    - Заведите Secrets для Actions:
        - `KUBECONFIG` - Base64-представление kubeconfig для доступа к кластеру
        - `REGISTRY_USER` - Имя пользователя registry
        - `REGISTRY_PASSWORD` - Пароль пользователя registry
    - Запушьте файлы проекта в репозиторий в вашей организации в Github в ветку `main`
    - Github Actions соберет образы

7. **Подготовка секретов для сервисов**

    - Создайте секреты
        ```yaml
        apiVersion: v1
        kind: Secret
        metadata:
            name: backend-env
            namespace: resflow
        type: Opaque
        data:
            clickhouse_dsn: # clickhouse dsn
            amqp_dsn: # rabbitmq dsn
        ---
        apiVersion: v1
        kind: Secret
        metadata:
            name: proxy-secrets
            namespace: resflow
        type: Opaque
        data:
            proxy-host: # http proxy host
            proxy-user: # http proxy username
            proxy-password: # http proxy password
        ```

8. **Развертывание сервисов**

    - `kubectl apply -f "k8s/**"`
    - `pushd charts && helmfile sync`

9. **Вы успешны**
