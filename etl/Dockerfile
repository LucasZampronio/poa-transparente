FROM python:3.12-slim

WORKDIR /app

# Copia os requisitos primeiro para aproveitar o cache das camadas
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Instala curl e dos2unix
RUN apt-get update && apt-get install -y curl dos2unix && rm -rf /var/lib/apt/lists/*

# Copia a pasta etl inteira para manter a estrutura de pacotes
COPY . ./etl/

# Copia o script de entrypoint e corrige line endings
COPY entrypoint.sh /entrypoint.sh
RUN dos2unix /entrypoint.sh && chmod +x /entrypoint.sh

# Define o PYTHONPATH para a raiz onde a pasta etl reside
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

ENTRYPOINT ["/entrypoint.sh"]
# Executa o script através do módulo para que os imports funcionem
CMD ["python", "etl/main.py"]
