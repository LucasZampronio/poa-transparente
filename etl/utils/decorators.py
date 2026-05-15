import time
from functools import wraps
import logging

logger = logging.getLogger(__name__)

def with_retry(retries=3, backoff=2):
    """
    Decorador para retry com backoff exponencial.
    Ideal para chamadas de rede instáveis.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            attempt = 0
            current_backoff = 1
            while attempt < retries:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    attempt += 1
                    if attempt == retries:
                        logger.error(f"Falha final após {retries} tentativas: {e}")
                        raise
                    logger.warning(f"Tentativa {attempt} falhou. Retentando em {current_backoff}s... Erro: {e}")
                    time.sleep(current_backoff)
                    current_backoff *= backoff
            return None
        return wrapper
    return decorator
