from etl.utils.db import get_connection

def aggregate_gold_data():
    print("--- 🥇 ATUALIZANDO CAMADA GOLD ---")
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # 0. Garantir estrutura (Diferencial de resiliência)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS gold_top_agencies (
                        agency TEXT PRIMARY KEY,
                        total_spent NUMERIC(14,2),
                        quantidade_contratos INT
                    )
                """)

                # 1. Gastos por Bairro
                cur.execute("""
                    INSERT INTO gold_gastos_por_bairro (bairro, total_gasto, quantidade_obras)
                    SELECT so.bairro, COALESCE(SUM(sd.valor_pago), 0), COUNT(DISTINCT so.id)
                    FROM silver_obras so
                    LEFT JOIN obra_despesa_match odm ON so.id = odm.obra_id
                    LEFT JOIN silver_despesas sd ON odm.despesa_id = sd.id
                    WHERE so.bairro IS NOT NULL
                    GROUP BY so.bairro
                    ON CONFLICT (bairro) DO UPDATE SET
                        total_gasto = EXCLUDED.total_gasto,
                        quantidade_obras = EXCLUDED.quantidade_obras
                """)

                # 2. Série Temporal
                cur.execute("""
                    INSERT INTO gold_series_temporais (data, total_gasto)
                    SELECT sd.data_empenho, SUM(sd.valor_pago)
                    FROM silver_despesas sd
                    WHERE sd.data_empenho IS NOT NULL
                    GROUP BY sd.data_empenho
                    ON CONFLICT (data) DO UPDATE SET
                        total_gasto = EXCLUDED.total_gasto
                """)

                # 3. Top Empresas
                cur.execute("""
                    INSERT INTO gold_top_empresas (cnpj, empresa, total_recebido, quantidade_contratos)
                    SELECT sd.cnpj_fornecedor, sd.nome_fornecedor, SUM(sd.valor_pago), COUNT(DISTINCT sd.id)
                    FROM silver_despesas sd
                    WHERE sd.cnpj_fornecedor IS NOT NULL
                    GROUP BY sd.cnpj_fornecedor, sd.nome_fornecedor
                    ON CONFLICT (cnpj) DO UPDATE SET
                        total_recebido = EXCLUDED.total_recebido,
                        quantidade_contratos = EXCLUDED.quantidade_contratos
                """)

                # 4. Top Órgãos
                cur.execute("""
                    INSERT INTO gold_top_agencies (agency, total_spent, quantidade_contratos)
                    SELECT sd.orgao, SUM(sd.valor_pago), COUNT(DISTINCT sd.id)
                    FROM silver_despesas sd
                    WHERE sd.orgao IS NOT NULL
                    GROUP BY sd.orgao
                    ON CONFLICT (agency) DO UPDATE SET
                        total_spent = EXCLUDED.total_spent,
                        quantidade_contratos = EXCLUDED.quantidade_contratos
                """)

                # 4.5 Top Despesas Individuais (Gold Layer)
                cur.execute("TRUNCATE TABLE gold_top_expenses")
                cur.execute("""
                    INSERT INTO gold_top_expenses (descricao, nome_fornecedor, valor_pago, orgao, data_empenho)
                    SELECT descricao, nome_fornecedor, valor_pago, orgao, data_empenho
                    FROM silver_despesas
                    ORDER BY valor_pago DESC
                    LIMIT 50
                """)
                
                # 5. Obras com Gastos
                cur.execute("""
                    INSERT INTO gold_obras_com_gastos (obra_id, nome_obra, valor_licitado, valor_total_gasto, percentual_execucao, quantidade_despesas)
                    SELECT 
                        so.id, 
                        so.nome_obra, 
                        so.valor_licitado, 
                        COALESCE(SUM(sd.valor_pago), 0) AS valor_total_gasto,
                        CASE WHEN so.valor_licitado > 0 THEN (COALESCE(SUM(sd.valor_pago), 0) / so.valor_licitado) * 100 ELSE 0 END AS percentual_execucao,
                        COUNT(sd.id) AS quantidade_despesas
                    FROM silver_obras so
                    LEFT JOIN obra_despesa_match odm ON so.id = odm.obra_id
                    LEFT JOIN silver_despesas sd ON odm.despesa_id = sd.id
                    GROUP BY so.id, so.nome_obra, so.valor_licitado
                    ON CONFLICT (obra_id) DO UPDATE SET
                        valor_total_gasto = EXCLUDED.valor_total_gasto,
                        percentual_execucao = EXCLUDED.percentual_execucao,
                        quantidade_despesas = EXCLUDED.quantidade_despesas
                """)
                conn.commit()
            except Exception as inner_e:
                conn.rollback()
                raise inner_e
        print("--- ✨ GOLD LAYER ATUALIZADA! ---")
    except Exception as e:
        print(f"❌ Erro ao atualizar Gold Layer: {e}")
