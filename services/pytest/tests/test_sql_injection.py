import requests

BASE_URL = "http://localhost:5000"

def test_sql_injection_facturas():

    #Verifica que la consulta de facturas NO permita SQL Injection.
    #Debe fallar en main y pasar en practico-2

    payload = {
        "id": "1 OR 1=1"
    }

    response = requests.get(f"{BASE_URL}/invoice", params=payload)

    assert response.status_code != 200, "Posible SQL Injection: la API acepto parametros maliciosos"