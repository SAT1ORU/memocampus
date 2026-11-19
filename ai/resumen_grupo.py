#!/usr/bin/env python3
"""
MEMOCAMPUS — Resumen de grupo con IA (datos seudonimizados).

Garantías:
  - Solo consulta vistas agregadas y seudónimos (EST-001...).
  - Nunca envía nombres, comentarios de ánimo ni datos clínicos.
  - No diagnostica salud mental ni decide alertas: la IA solo redacta.
  - Si no hay ANTHROPIC_API_KEY, genera un resumen con reglas (modo local).

Uso:
    python3 ai/resumen_grupo.py --grupo 9 --seccion A --periodo 3
Variables de conexión: PGHOST, PGPORT, PGUSER, PGDATABASE (psql estándar).
"""
import argparse
import json
import os
import subprocess
import urllib.request

MODELO = "claude-sonnet-5-5"
API_URL = "https://api.anthropic.com/v1/messages"

SQL_PAYLOAD = """
SELECT json_build_object(
  'materias', (
    SELECT COALESCE(json_agg(json_build_object(
        'materia', m.nombre,
        'promedio', r.promedio,
        'notas_bajas', r.notas_bajas,
        'estudiantes', r.estudiantes,
        'asistencia_pct', a.porcentaje_asistencia,
        'ausencias', a.ausencias) ORDER BY m.nombre), '[]'::json)
    FROM vw_resumen_grupo r
    JOIN materias m ON m.id = r.materia_id
    JOIN vw_asistencia_grupo a ON a.grupo_id = r.grupo_id AND a.materia_id = r.materia_id
    JOIN grupos g ON g.id = r.grupo_id
    WHERE g.grado = {grado} AND g.seccion = '{seccion}' AND r.periodo = {periodo}
  ),
  'estudiantes_con_alertas', (
    SELECT COALESCE(json_agg(json_build_object('seudonimo', e.seudonimo, 'tipo', al.tipo, 'detalle', al.detalle)), '[]'::json)
    FROM alertas al
    JOIN estudiantes e ON e.id = al.estudiante_id
    JOIN grupos g ON g.id = e.grupo_id
    WHERE g.grado = {grado} AND g.seccion = '{seccion}'
  )
);
"""


def leer_datos(grado: int, seccion: str, periodo: int) -> dict:
    sql = SQL_PAYLOAD.format(grado=grado, seccion=seccion.upper(), periodo=periodo)
    salida = subprocess.run(
        ["psql", "-At", "-v", "ON_ERROR_STOP=1", "-c", sql],
        check=True, capture_output=True, text=True,
    ).stdout
    return json.loads(salida)


def resumen_local(datos: dict, grado: int, seccion: str, periodo: int) -> str:
    """Resumen determinista, sin IA. Útil para pruebas y como respaldo."""
    lineas = [f"Grupo {grado}°{seccion.upper()} — periodo {periodo}"]
    for m in datos["materias"]:
        marca = " ⚠" if m["notas_bajas"] > 0 or m["asistencia_pct"] < 90 else ""
        lineas.append(
            f"- {m['materia']}: promedio {m['promedio']}, "
            f"{m['notas_bajas']} notas bajas, asistencia {m['asistencia_pct']}%{marca}"
        )
    n = len(datos["estudiantes_con_alertas"])
    lineas.append(f"Estudiantes con alertas activas: {n}.")
    return "\n".join(lineas)


def resumen_ia(datos: dict, grado: int, seccion: str, periodo: int) -> str:
    clave = os.environ["ANTHROPIC_API_KEY"]
    prompt = (
        "Eres un asistente para coordinación escolar. Redacta un resumen breve (máx. 120 palabras) "
        "en español para el docente del grupo, con los puntos de atención. "
        "Usa solo los datos dados. No diagnostiques ni sugieras condiciones de salud mental. "
        "No menciones nombres; usa los seudónimos tal como aparecen.\n\n"
        f"Grupo: {grado}°{seccion.upper()}, periodo {periodo}\n"
        f"Datos (JSON):\n{json.dumps(datos, ensure_ascii=False)}"
    )
    cuerpo = json.dumps({
        "model": MODELO,
        "max_tokens": 400,
        "messages": [{"role": "user", "content": prompt}],
    }).encode("utf-8")
    req = urllib.request.Request(API_URL, data=cuerpo, method="POST", headers={
        "x-api-key": clave,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=60) as r:
        respuesta = json.loads(r.read().decode("utf-8"))
    return "".join(b.get("text", "") for b in respuesta["content"] if b["type"] == "text")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--grupo", type=int, required=True, help="grado, ej. 9")
    ap.add_argument("--seccion", required=True, help="A o B")
    ap.add_argument("--periodo", type=int, default=3)
    ap.add_argument("--solo-datos", action="store_true", help="imprime el JSON que se enviaría")
    args = ap.parse_args()

    datos = leer_datos(args.grupo, args.seccion, args.periodo)
    if args.solo_datos:
        print(json.dumps(datos, ensure_ascii=False, indent=2))
        return
    if os.environ.get("ANTHROPIC_API_KEY"):
        print(resumen_ia(datos, args.grupo, args.seccion, args.periodo))
    else:
        print("(Modo local: sin ANTHROPIC_API_KEY, resumen con reglas)\n")
        print(resumen_local(datos, args.grupo, args.seccion, args.periodo))


if __name__ == "__main__":
    main()
