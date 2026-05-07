FROM python:3.12-slim

WORKDIR /app

# Copia os requisitos primeiro para aproveitar o cache das camadas
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copia a pasta etl inteira para manter a estrutura de pacotes
COPY . ./etl/

# Define o PYTHONPATH para a raiz onde a pasta etl reside
ENV PYTHONPATH=/app

# Executa o script através do módulo para que os imports funcionem
CMD ["python", "etl/main.py"]
