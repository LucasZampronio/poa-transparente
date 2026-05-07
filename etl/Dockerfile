FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./

# Define o PYTHONPATH para que os pacotes sejam encontrados
ENV PYTHONPATH=/app

# Executa o script principal
CMD ["python", "main.py"]
