#!/bin/bash

# Script para matar procesos en los puertos del backend y frontend

echo "🔍 Buscando procesos en puerto 3001 (backend)..."
PID_3001=$(lsof -ti:3001)
if [ ! -z "$PID_3001" ]; then
    echo "💀 Matando proceso en puerto 3001: $PID_3001"
    kill -9 $PID_3001
    echo "✅ Proceso en puerto 3001 eliminado"
else
    echo "✅ No hay procesos corriendo en puerto 3001"
fi

echo ""
echo "🔍 Buscando procesos en puerto 5173 (frontend)..."
PID_5173=$(lsof -ti:5173)
if [ ! -z "$PID_5173" ]; then
    echo "💀 Matando proceso en puerto 5173: $PID_5173"
    kill -9 $PID_5173
    echo "✅ Proceso en puerto 5173 eliminado"
else
    echo "✅ No hay procesos corriendo en puerto 5173"
fi

echo ""
echo "🎉 ¡Puertos limpiados!"