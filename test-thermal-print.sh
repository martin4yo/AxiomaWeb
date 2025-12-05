#!/bin/bash

# Script de prueba para impresión térmica

echo "🔧 Probando sistema de impresión térmica..."
echo ""

# 1. Verificar que Print Manager esté corriendo
echo "1. Verificando Print Manager..."
PM_STATUS=$(curl -s http://localhost:9100/health 2>/dev/null)
if [ $? -eq 0 ]; then
  echo "✅ Print Manager está activo"
  echo "   $PM_STATUS"
else
  echo "❌ Print Manager no está disponible"
  exit 1
fi
echo ""

# 2. Verificar que el backend esté corriendo
echo "2. Verificando Backend..."
BACKEND_STATUS=$(curl -s http://localhost:3150/health 2>/dev/null)
if [ $? -eq 0 ]; then
  echo "✅ Backend está activo"
  echo "   $BACKEND_STATUS"
else
  echo "❌ Backend no está disponible"
  exit 1
fi
echo ""

# 3. Autenticarse
echo "3. Autenticando usuario..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3150/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@axioma.com",
    "password": "demo123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Error en autenticación"
  echo "   $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Autenticación exitosa"
TENANT=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['tenants'][0]['slug'] if data.get('tenants') and len(data['tenants']) > 0 else '')" 2>/dev/null)
echo "   Tenant: $TENANT"
echo ""

# 4. Obtener la primera venta
echo "4. Obteniendo ventas..."
SALES_RESPONSE=$(curl -s -X GET "http://localhost:3150/api/$TENANT/sales?limit=1" \
  -H "Authorization: Bearer $TOKEN")

SALE_ID=$(echo $SALES_RESPONSE | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['sales'][0]['id'] if data.get('sales') and len(data['sales']) > 0 else '')" 2>/dev/null)

if [ -z "$SALE_ID" ]; then
  echo "❌ No se encontraron ventas"
  echo "   $SALES_RESPONSE"
  exit 1
fi

echo "✅ Venta encontrada: $SALE_ID"
echo ""

# 5. Probar impresión térmica
echo "5. Enviando a impresora térmica..."
PRINT_RESPONSE=$(curl -s -X POST "http://localhost:3150/api/$TENANT/sales/$SALE_ID/print/thermal" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$PRINT_RESPONSE" | python3 -m json.tool 2>/dev/null

if echo "$PRINT_RESPONSE" | grep -q '"success": *true'; then
  echo ""
  echo "✅ ¡Impresión exitosa!"
else
  echo ""
  echo "❌ Error en la impresión"
fi

echo ""
echo "🏁 Prueba completada"
