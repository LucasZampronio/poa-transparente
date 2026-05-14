FROM python:3.12-slim

WORKDIR /app

# Copia os requisitos primeiro para aproveitar o cache das camadas
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Instala curl para buscar segredos do OpenBao
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copia a pasta etl inteira para manter a estrutura de pacotes
COPY . ./etl/

# Copia o script de entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Define o PYTHONPATH para a raiz onde a pasta etl reside
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

ENTRYPOINT ["/entrypoint.sh"]
# Executa o script através do módulo para que os imports funcionem
CMD ["python", "etl/main.py"]
