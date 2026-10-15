FROM python:3.13-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY restroom_unified ./restroom_unified
COPY models ./models
COPY inference.py server.py ./
USER 10001:10001
EXPOSE 8090
CMD ["python", "server.py"]
