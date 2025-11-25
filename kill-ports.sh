#!/bin/bash

# Script para matar procesos en los puertos del backend y frontend

echo "🔍 Buscando procesos en puerto 3150 (backend)..."
PID_3150=$(lsof -ti:3150)
if [ ! -z "$PID_3150" ]; then
    echo "💀 Matando proceso en puerto 3150: $PID_3150"
    kill -9 $PID_3150
    echo "✅ Proceso en puerto 3150 eliminado"
else
    echo "✅ No hay procesos corriendo en puerto 3150"
fi

echo ""
echo "🔍 Buscando procesos en puerto 8088 (frontend)..."
PID_8088=$(lsof -ti:8088)
if [ ! -z "$PID_8088" ]; then
    echo "💀 Matando proceso en puerto 8088: $PID_8088"
    kill -9 $PID_8088
    echo "✅ Proceso en puerto 8088 eliminado"
else
    echo "✅ No hay procesos corriendo en puerto 8088"
fi

echo ""
echo "🎉 ¡Puertos limpiados!"