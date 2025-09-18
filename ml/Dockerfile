ARG CUDA_IMAGE="12.1.1-devel-ubuntu22.04"

FROM nvidia/cuda:${CUDA_IMAGE}

WORKDIR /app

ENV PYTHONUNBUFFERED=1

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y git \
    build-essential \
    python3 \
    python3-pip \
    gcc \
    wget \
    ocl-icd-opencl-dev \
    opencl-headers clinfo \
    libclblast-dev \
    libopenblas-dev && \
    mkdir -p /etc/OpenCL/vendors && \
    echo "libnvidia-opencl.so.1" > /etc/OpenCL/vendors/nvidia.icd

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./

ENV PYTHONPATH=/app

EXPOSE 80

CMD ["bash", "-c", "uvicorn main:app --host 0.0.0.0 --port 8001 & python3 queue_worker.py"]
# CMD ["uvicorn", "ml/main:app", "--host", "0.0.0.0", "--port", "8000"]
