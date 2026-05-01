from etl.silver.cleaners import normalize_bairro

def test_normalization():
    test_cases = [
        ("Centro Histórico", "CENTRO HISTORICO"),
        ("CENTRO HISTÓRICO", "CENTRO HISTORICO"),
        ("centro histórico", "CENTRO HISTORICO"),
        (" Bairro Restinga ", "RESTINGA"),
        ("Porto Alegre", "CENTRO"),
        (None, "CENTRO"),
        ("", "CENTRO"),
        ("Navegantes DISTRICT", "NAVEGANTES"),
    ]
    
    for input_val, expected in test_cases:
        result = normalize_bairro(input_val)
        print(f"Input: '{input_val}' -> Result: '{result}' | {'✅ PASS' if result == expected else '❌ FAIL'}")

if __name__ == "__main__":
    test_normalization()
