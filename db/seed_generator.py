#!/usr/bin/env python3
"""
MEMOCAMPUS — Generador de datos FICTICIOS para demostración.

Produce db/seed.sql con datos de ejemplo para db/schema.sql.
TODOS los nombres, correos y registros son ficticios:
  - correos en el dominio reservado .test (no existe en Internet)
  - nombres generados al azar de listas genéricas
No usar con datos reales de estudiantes.

Uso:
    python3 db/seed_generator.py            # escribe db/seed.sql
    python3 db/seed_generator.py --stdout   # imprime en pantalla
"""
import argparse
import datetime as dt
import random
from pathlib import Path

SEMILLA = 2026          # misma semilla = mismos datos siempre
ANIO = 2026
DIAS_CLASE = 30         # días hábiles de asistencia generados
SEMANAS_ANIMO = 8       # semanas de encuesta de ánimo
ESTUDIANTES_POR_GRUPO = 20

GRADOS = [6, 7, 8, 9, 10, 11]
SECCIONES = ["A", "B"]
MATERIAS = ["Matemáticas", "Lengua Castellana", "Ciencias Naturales", "Ciencias Sociales"]

NOMBRES = ["Sofía", "Mateo", "Valentina", "Santiago", "Isabella", "Sebastián",
           "Camila", "Daniel", "Mariana", "Juan", "Laura", "Andrés", "Lucía",
           "Tomás", "Paula", "Diego", "Renata", "Felipe", "Nicole", "Jorge"]
APELLIDOS = ["Ramírez", "Torres", "Mosquera", "Valencia", "Ospina", "Quintero",
             "Bedoya", "Caicedo", "Hurtado", "Londoño", "Arboleda", "Renteria",
             "Cuesta", "Zapata", "Lozano", "Pérez", "Gómez", "Rojas"]

DOCENTES = [  # un docente por materia (ficticios)
    ("Docente Demo Matemáticas", "docente.mat@ejemplo.test"),
    ("Docente Demo Lengua", "docente.len@ejemplo.test"),
    ("Docente Demo Ciencias", "docente.cie@ejemplo.test"),
    ("Docente Demo Sociales", "docente.soc@ejemplo.test"),
]

ANIMOS = ["muy_bien", "bien", "regular", "mal", "muy_mal"]
COMENTARIOS = ["Todo bien en el colegio.", "Me cuesta concentrarme en clase.",
               "Tuve problemas en casa esta semana.", "Me siento cansada casi todos los días.",
               "Estoy contento con mis amigos.", None, None, None]


def sql_str(valor):
    if valor is None:
        return "NULL"
    return "'" + str(valor).replace("'", "''") + "'"


def generar(rng: random.Random) -> str:
    out = []
    out.append("-- MEMOCAMPUS — datos FICTICIOS de demostración. No son personas reales.")
    out.append("BEGIN;")

    # ---- Usuarios de administración y docentes ----
    usuarios = []  # (correo, nombre, rol)
    for nombre, correo in DOCENTES:
        usuarios.append((correo, nombre, "docente"))
    usuarios.append(("coordinacion.demo@ejemplo.test", "Coordinación Demo", "coordinacion"))
    usuarios.append(("rectoria.demo@ejemplo.test", "Rectoría Demo (incluye psicología)", "rectoria"))

    # ---- Grupos, materias, asignaciones ----
    grupos = [(g, s) for g in GRADOS for s in SECCIONES]
    out.append("\n-- Grupos")
    for g, s in grupos:
        out.append(f"INSERT INTO grupos (grado, seccion, anio) VALUES ({g}, '{s}', {ANIO});")
    out.append("\n-- Materias")
    for m in MATERIAS:
        out.append(f"INSERT INTO materias (nombre) VALUES ({sql_str(m)});")

    # Docentes (usuario ids 1..4 para docentes, 5 coordinación, 6 rectoría)
    out.append("\n-- Usuarios de personal")
    for correo, nombre, rol in usuarios:
        out.append(f"INSERT INTO usuarios (correo, nombre, rol) VALUES "
                   f"({sql_str(correo)}, {sql_str(nombre)}, '{rol}');")

    out.append("\n-- Asignaciones: cada materia la dicta un docente a todos los grupos")
    for gi in range(len(grupos)):
        for mi in range(len(MATERIAS)):
            out.append(f"INSERT INTO asignaciones (grupo_id, materia_id, docente_id) "
                       f"VALUES ({gi + 1}, {mi + 1}, {mi + 1});")

    # ---- Estudiantes y padres ----
    estudiantes = []  # (id, grupo_id, riesgo) riesgo: 0 bajo, 1 medio, 2 alto
    padres = []
    out.append("\n-- Estudiantes (con padre/madre ficticio)")
    est_id = 0
    usr_id = len(usuarios)  # ids siguientes para padres
    for gi, (g, s) in enumerate(grupos):
        for k in range(ESTUDIANTES_POR_GRUPO):
            est_id += 1
            usr_id += 1
            nombre = f"{rng.choice(NOMBRES)} {rng.choice(APELLIDOS)} {rng.choice(APELLIDOS)}"
            riesgo = rng.choices([0, 1, 2], weights=[70, 20, 10])[0]
            estudiantes.append((est_id, gi + 1, riesgo))
            correo_padre = f"padre.{est_id:03d}@ejemplo.test"
            padres.append((usr_id, correo_padre, f"Padre/Madre Demo {est_id:03d}"))
            out.append(f"INSERT INTO estudiantes (seudonimo, nombre, grupo_id) VALUES "
                       f"('EST-{est_id:03d}', {sql_str(nombre)}, {gi + 1});")

    out.append("\n-- Padres (cuentas de familia ficticias)")
    for uid, correo, nombre in padres:
        out.append(f"INSERT INTO usuarios (correo, nombre, rol) VALUES "
                   f"({sql_str(correo)}, {sql_str(nombre)}, 'padre');")
    out.append("\n-- Vínculo padre–hijo")
    for (uid, _, _), (eid, _, _) in zip(padres, estudiantes):
        out.append(f"INSERT INTO padres_estudiantes (padre_id, estudiante_id) VALUES ({uid}, {eid});")

    # ---- Notas: 3 periodos por materia, según riesgo ----
    out.append("\n-- Notas (ponderación Ser 30% · Saber 40% · Hacer 30%)")
    rango = {0: (3.6, 4.9), 1: (2.8, 4.2), 2: (1.8, 3.4)}
    for eid, _, riesgo in estudiantes:
        lo, hi = rango[riesgo]
        for mi in range(len(MATERIAS)):
            for periodo in (1, 2, 3):
                ser, saber, hacer = (round(rng.uniform(lo, hi), 1) for _ in range(3))
                ser, saber, hacer = (min(5.0, max(0.0, v)) for v in (ser, saber, hacer))
                out.append(f"INSERT INTO notas (estudiante_id, materia_id, periodo, ser, saber, hacer) "
                           f"VALUES ({eid}, {mi + 1}, {periodo}, {ser}, {saber}, {hacer});")

    # ---- Asistencia: días hábiles terminando el 2026-10-30 ----
    out.append("\n-- Asistencia (últimos días hábiles)")
    fin = dt.date(2026, 10, 30)
    dias = []
    d = fin
    while len(dias) < DIAS_CLASE:
        if d.weekday() < 5:
            dias.append(d)
        d -= dt.timedelta(days=1)
    prob_falta = {0: 0.03, 1: 0.08, 2: 0.18}
    prob_tarde = {0: 0.02, 1: 0.04, 2: 0.06}
    for eid, _, riesgo in estudiantes:
        for mi in range(len(MATERIAS)):
            for dia in dias:
                r = rng.random()
                if r < prob_falta[riesgo]:
                    estado = "ausente" if rng.random() < 0.85 else "excusa"
                elif r < prob_falta[riesgo] + prob_tarde[riesgo]:
                    estado = "tardanza"
                else:
                    estado = "presente"
                out.append(f"INSERT INTO asistencia (estudiante_id, materia_id, fecha, estado) "
                           f"VALUES ({eid}, {mi + 1}, '{dia.isoformat()}', '{estado}');")

    # ---- Encuesta de ánimo semanal (lunes) ----
    out.append("\n-- Encuesta de ánimo semanal")
    lunes_fin = dt.date(2026, 11, 9)  # lunes
    semanas = [lunes_fin - dt.timedelta(weeks=i) for i in range(SEMANAS_ANIMO)]
    pesos = {0: [35, 35, 20, 7, 3], 1: [20, 30, 25, 15, 10], 2: [10, 20, 25, 25, 20]}
    for eid, _, riesgo in estudiantes:
        for semana in semanas:
            if rng.random() < 0.1:  # algunos no responden
                continue
            animo = rng.choices(ANIMOS, weights=pesos[riesgo])[0]
            requiere = animo in ("mal", "muy_mal") and rng.random() < 0.8
            comentario = rng.choice(COMENTARIOS)
            out.append(
                "INSERT INTO encuestas_animo (estudiante_id, semana, animo, comentario, requiere_atencion) "
                f"VALUES ({eid}, '{semana.isoformat()}', '{animo}', {sql_str(comentario)}, "
                f"{'TRUE' if requiere else 'FALSE'});")

    # ---- Casos psicológicos abiertos a partir de encuestas de riesgo ----
    out.append("\n-- Casos psicológicos (solo visibles para rectoría)")
    casos = [eid for eid, _, riesgo in estudiantes if riesgo == 2][:6]
    for eid in casos:
        out.append(f"INSERT INTO casos_psicologicos (estudiante_id, origen, estado, notas) VALUES "
                   f"({eid}, 'encuesta de ánimo', 'en_seguimiento', "
                   f"'Caso FICTICIO de demostración.');")

    out.append("COMMIT;")
    return "\n".join(out) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stdout", action="store_true")
    args = ap.parse_args()
    sql = generar(random.Random(SEMILLA))
    if args.stdout:
        print(sql)
    else:
        destino = Path(__file__).with_name("seed.sql")
        destino.write_text(sql, encoding="utf-8")
        print(f"Escrito {destino} ({sql.count(chr(10))} líneas)")


if __name__ == "__main__":
    main()
